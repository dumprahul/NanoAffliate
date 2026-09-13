import { env } from '../config/env.js';
import { callX402JsonEndpoint } from '../x402/agentClient.js';
import { getSessionContext, updateSessionAfterTick } from '../db/sessions.js';
import { createTick, getNextTickNumber } from '../db/ticks.js';
import { queuePendingPayout } from '../db/pendingPayouts.js';
import { addPaidSeconds, isUnderDailyCap } from '../db/paidAttention.js';
import { addProductSpend, isUnderProductBudget } from '../db/products.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { getHbarBalanceTinybar } from '../hedera/mirrorNode.js';
import { payCreatorFromEscrow } from '../hedera/payments.js';
import type { SignalInput } from '../scoring/scoreSession.js';
import type { Decision, RateTier } from '../types/index.js';

const TICK_INTERVAL_SECONDS = 5;
const REDUCED_RATE_FACTOR = 0.5;

interface OracleResponseBody {
  outcome: Decision;
  score: number;
  provider_uaid?: string;
}

/**
 * The Agent's per-tick worker loop — architecture §6.4 step 1-3.
 * Pays the Oracle via x402, branches on its decision, pays the creator from
 * escrow when funds allow, and writes the full audit trail (HCS + Supabase).
 */
export async function processTick(sessionId: string, signals: SignalInput): Promise<OracleResponseBody> {
  const context = await getSessionContext(sessionId);
  if (!context) {
    throw new Error(`No session found for id ${sessionId}`);
  }
  const { session, link, creator, seller, product } = context;

  const oracleUrl = `${env.baseUrl}/verify-attention`;
  const callResult = await callX402JsonEndpoint(oracleUrl, { session_id: sessionId, signals });
  if (callResult.status >= 400) {
    throw new Error(`Oracle call failed with status ${callResult.status}: ${JSON.stringify(callResult.body)}`);
  }
  const oracleResponse = callResult.body as OracleResponseBody;
  const tickNumber = await getNextTickNumber(sessionId);
  const rateTier: RateTier = session.is_verified ? 'verified' : 'unverified';
  const identityKey = session.reader_uaid ?? session.reader_fingerprint_hash;

  let amountPaid = 0;
  let payoutTxId: string | undefined;
  let hcsSeq: number | undefined;
  // Distinct from oracleResponse.outcome: the daily cap can override an
  // Oracle "pay" verdict into an effective reject. Recording the raw Oracle
  // outcome here would leave `ticks.decision = 'pay_full'` next to
  // `amount_paid = 0` with nothing in Supabase explaining why — the HCS
  // `tick_rejected` message has the reason, but the DB row should agree with it.
  let effectiveDecision: Decision = oracleResponse.outcome;

  const underCap = await isUnderDailyCap(link.id, identityKey);

  if ((oracleResponse.outcome === 'pay_full' || oracleResponse.outcome === 'pay_reduced') && underCap) {
    const baseRate = rateTier === 'verified' ? link.rate_verified_per_tick : link.rate_unverified_per_tick;
    const rate = oracleResponse.outcome === 'pay_full' ? baseRate : baseRate * REDUCED_RATE_FACTOR;

    if (!seller.escrow_hedera_account_id) {
      // §7/§20: `payout_queued` is an out-of-scope HCS message type for this build —
      // the pending_payouts row is the audit trail here, retried by the scheduler.
      await queuePendingPayout({ sessionId, reason: 'seller_has_no_escrow_account', amount: rate });
    } else if (!(await isUnderProductBudget(product.id, rate))) {
      // Seller-set per-product cap, independent of the escrow account's live
      // on-chain balance checked below — lets a seller bound spend on one
      // product without draining the whole escrow account.
      await queuePendingPayout({ sessionId, reason: 'product_escrow_budget_exhausted', amount: rate });
    } else {
      const escrowTinybar = await getHbarBalanceTinybar(seller.escrow_hedera_account_id);
      const requiredTinybar = BigInt(Math.round(rate * 1e8));

      if (escrowTinybar >= requiredTinybar) {
        payoutTxId = await payCreatorFromEscrow(seller.escrow_hedera_account_id, creator.hedera_account_id, rate);
        amountPaid = rate;
        await addProductSpend(product.id, rate);
        await addPaidSeconds(link.id, identityKey, TICK_INTERVAL_SECONDS);
        const result = await submitHcsMessage(link.hcs_topic_id, {
          type: 'tick',
          session_id: sessionId,
          tick_number: tickNumber,
          oracle_call_tx_id: callResult.paymentTxId ?? null,
          payout_tx_id: payoutTxId,
          trust_score: oracleResponse.score,
          decision: oracleResponse.outcome,
          rate_tier: rateTier,
          amount_paid: amountPaid,
        });
        hcsSeq = result.sequenceNumber;
      } else {
        await queuePendingPayout({ sessionId, reason: 'escrow_insufficient', amount: rate });
      }
    }
  } else if (oracleResponse.outcome === 'require_selfie_check') {
    const result = await submitHcsMessage(link.hcs_topic_id, {
      type: 'selfie_check_triggered',
      session_id: sessionId,
      borderline_tick_count: session.borderline_tick_count,
      trigger_score: oracleResponse.score,
    });
    hcsSeq = result.sequenceNumber;
  } else {
    const reason = !underCap ? 'daily_cap_reached' : 'trust_score_below_threshold';
    effectiveDecision = 'reject';
    const result = await submitHcsMessage(link.hcs_topic_id, {
      type: 'tick_rejected',
      session_id: sessionId,
      tick_number: tickNumber,
      trust_score: oracleResponse.score,
      reason,
      oracle_call_tx_id: callResult.paymentTxId ?? null,
    });
    hcsSeq = result.sequenceNumber;
  }

  await createTick({
    sessionId,
    tickNumber,
    oracleTrustScore: oracleResponse.score,
    oracleCallTxId: callResult.paymentTxId,
    payoutTxId,
    hcsMessageSeqNumber: hcsSeq,
    rateTier,
    decision: effectiveDecision,
    amountPaid,
  });

  await updateSessionAfterTick(sessionId, { last_tick_at: new Date().toISOString() });

  return oracleResponse;
}
