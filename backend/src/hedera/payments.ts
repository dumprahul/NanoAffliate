import {
  AccountCreateTransaction,
  AccountId,
  Hbar,
  ScheduleCreateTransaction,
  ScheduleDeleteTransaction,
  Timestamp,
  TransferTransaction,
} from '@hiero-ledger/sdk';
import { getAgentClient, getAgentPrivateKey, getAgentPublicKey } from './client.js';
import { hederaSubmissionQueue } from '../lib/mutex.js';
import { MIRROR_NODE_BASE } from './mirrorNode.js';

/**
 * Creates a new escrow account for a seller — architecture §16.
 * Every escrow account is distinct (its own account ID, balance, and Mirror
 * Node history) but all are keyed to the Agent's own public key, not a
 * unique key per seller. This is a stated hackathon-scope custody decision,
 * not an oversight — see §16 for the full rationale.
 */
export async function createEscrowAccount(): Promise<string> {
  return hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const tx = await new AccountCreateTransaction()
      .setKey(getAgentPublicKey())
      .setInitialBalance(new Hbar(0))
      .execute(client);
    const receipt = await tx.getReceipt(client);
    if (!receipt.accountId) {
      throw new Error('AccountCreateTransaction succeeded without an accountId');
    }
    return receipt.accountId.toString();
  });
}

/**
 * Instant creator payout from a seller's escrow — architecture §16.
 * Single shared Agent key signs every payout, for every seller, every tick.
 */
export async function payCreatorFromEscrow(
  escrowAccountId: string,
  creatorAccountId: string,
  amountHbar: number,
): Promise<string> {
  return hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const tx = await new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(escrowAccountId), new Hbar(-amountHbar))
      .addHbarTransfer(AccountId.fromString(creatorAccountId), new Hbar(amountHbar))
      .freezeWith(client)
      .sign(getAgentPrivateKey());
    const response = await tx.execute(client);
    await response.getReceipt(client);
    return response.transactionId.toString();
  });
}

/**
 * Wraps the conversion bonus transfer in a Scheduled Transaction with a short
 * delay — architecture §6.6 Path B / §17.
 *
 * `waitForExpiry` MUST be true here. Every escrow account is keyed to the
 * Agent's own public key (§16), and the Agent is also the one paying for
 * this ScheduleCreateTransaction — so the moment it signs the create
 * transaction, Hedera auto-applies that same signature to the inner
 * transfer too (the required signer for a debit from the escrow account is
 * that same key). Without `waitForExpiry(true)` the schedule would be fully
 * signed and execute *immediately*, defeating the entire point of the delay.
 * With it set, Hedera holds execution until `expirationTime` regardless of
 * when signatures complete — a `cancelScheduledTransaction` call before then
 * still aborts it via ScheduleDeleteTransaction.
 */
export async function createScheduledBonusTransfer(
  escrowAccountId: string,
  creatorAccountId: string,
  amountHbar: number,
  delayMs: number,
): Promise<{ scheduleId: string; scheduledTransactionId: string }> {
  return hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const innerTransfer = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(escrowAccountId), new Hbar(-amountHbar))
      .addHbarTransfer(AccountId.fromString(creatorAccountId), new Hbar(amountHbar));

    const expirationTime = Timestamp.fromDate(new Date(Date.now() + delayMs));

    const tx = await new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTransfer)
      .setAdminKey(getAgentPublicKey())
      .setExpirationTime(expirationTime)
      .setWaitForExpiry(true)
      .setScheduleMemo('nanoaffiliate:conversion-bonus')
      .execute(client);
    const receipt = await tx.getReceipt(client);
    if (!receipt.scheduleId || !receipt.scheduledTransactionId) {
      throw new Error('ScheduleCreateTransaction succeeded without scheduleId/scheduledTransactionId');
    }
    return {
      scheduleId: receipt.scheduleId.toString(),
      scheduledTransactionId: receipt.scheduledTransactionId.toString(),
    };
  });
}

/**
 * Checks whether a scheduled bonus transfer has executed yet, via Mirror
 * Node. Called by the delayed BullMQ job at T+delay — with `waitForExpiry`
 * the network executes the schedule on its own once `expirationTime`
 * passes, so there's nothing left to sign; this just confirms it happened
 * (or that it was deleted/cancelled first) before updating our own records.
 */
export async function getScheduleStatus(
  scheduleId: string,
): Promise<{ executed: boolean; deleted: boolean; transactionId?: string }> {
  const res = await fetch(`${MIRROR_NODE_BASE}/api/v1/schedules/${scheduleId}`);
  if (!res.ok) {
    throw new Error(`Mirror Node schedule lookup failed for ${scheduleId}: ${res.status}`);
  }
  const data = (await res.json()) as {
    executed_timestamp?: string | null;
    deleted?: boolean;
    payer_account_id?: string;
  };
  return {
    executed: Boolean(data.executed_timestamp),
    deleted: Boolean(data.deleted),
    transactionId: data.executed_timestamp ? `${data.payer_account_id}@${data.executed_timestamp}` : undefined,
  };
}

/** Cancels a pending scheduled bonus before it executes — a fraud check flagged the conversion. */
export async function cancelScheduledTransaction(scheduleId: string): Promise<void> {
  await hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const tx = await new ScheduleDeleteTransaction().setScheduleId(scheduleId).execute(client);
    await tx.getReceipt(client);
  });
}
