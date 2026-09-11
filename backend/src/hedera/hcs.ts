import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hiero-ledger/sdk';
import { getAgentClient, getAgentPublicKey } from './client.js';
import { hederaSubmissionQueue } from '../lib/mutex.js';
import type { HcsEnvelope } from '../types/index.js';

/**
 * Creates a new HCS topic — used once per link (architecture §5) and once
 * globally for the identity-registry topic (architecture §11.4).
 * Topic memo is capped at ~100 bytes by the network.
 */
export async function createTopic(memo: string): Promise<string> {
  return hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(memo.slice(0, 100))
      .setAdminKey(getAgentPublicKey())
      .setSubmitKey(getAgentPublicKey())
      .execute(client);
    const receipt = await tx.getReceipt(client);
    if (!receipt.topicId) {
      throw new Error('TopicCreateTransaction succeeded without a topicId');
    }
    return receipt.topicId.toString();
  });
}

/**
 * Submits one HCS message to `topicId`. Every message shares the envelope
 * shape from architecture §7: `{ type, session_id?, ...fields }`.
 * Messages are capped at 1024 bytes — callers are responsible for keeping
 * payloads small and flat, per §7.
 */
export async function submitHcsMessage(
  topicId: string,
  message: HcsEnvelope,
): Promise<{ transactionId: string; sequenceNumber: number }> {
  const payload = JSON.stringify(message);
  if (Buffer.byteLength(payload, 'utf8') > 1024) {
    throw new Error(`HCS message for type "${message.type}" exceeds 1024 bytes`);
  }
  return hederaSubmissionQueue.run(async () => {
    const client = getAgentClient();
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return {
      transactionId: tx.transactionId.toString(),
      sequenceNumber: receipt.topicSequenceNumber?.toNumber() ?? 0,
    };
  });
}
