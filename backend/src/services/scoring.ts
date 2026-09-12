import { scoreSession, type SignalInput } from '../scoring/scoreSession.js';
import { getSessionContext, updateSessionAfterTick } from '../db/sessions.js';
import { getDiversityScore } from '../lib/diversity.js';
import { env } from '../config/env.js';

export interface OracleScoringResult {
  outcome: 'pay_full' | 'pay_reduced' | 'require_selfie_check' | 'reject';
  score: number;
  provider_uaid?: string;
}

/**
 * The Oracle's scoring pipeline — architecture §8 route skeleton.
 * Runs *after* x402 payment settles. Scores the interval, updates the
 * session's trust bookkeeping in Supabase, and returns the decision.
 * Does not touch payouts or HCS — that's the Agent's job (§6.4).
 */
export async function runOracleScoring(sessionId: string, signals: SignalInput): Promise<OracleScoringResult> {
  const context = await getSessionContext(sessionId);
  if (!context) {
    throw new Error(`No session found for id ${sessionId}`);
  }
  const { session, link } = context;

  const diversityScore = await getDiversityScore(link.id);
  const decision = scoreSession(
    signals,
    {
      trustPenaltyMultiplier: context.creator.trust_penalty_multiplier,
      borderlineTickCount: session.borderline_tick_count,
    },
    diversityScore,
  );

  const cumulativeTrustScore = session.cumulative_trust_score * 0.7 + decision.score * 0.3;
  const borderlineTickCount =
    decision.outcome === 'pay_reduced'
      ? session.borderline_tick_count + 1
      : decision.outcome === 'pay_full'
        ? 0
        : session.borderline_tick_count;

  await updateSessionAfterTick(sessionId, {
    cumulative_trust_score: cumulativeTrustScore,
    borderline_tick_count: borderlineTickCount,
  });

  return { outcome: decision.outcome, score: decision.score, provider_uaid: env.oracle.uaid };
}
