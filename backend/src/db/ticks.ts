import { supabase } from '../lib/supabase.js';
import type { Decision, RateTier, Tick } from '../types/index.js';

export async function getNextTickNumber(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ticks')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  if (error) throw error;
  return (count ?? 0) + 1;
}

export async function createTick(input: {
  sessionId: string;
  tickNumber: number;
  oracleTrustScore: number;
  oracleCallTxId?: string;
  payoutTxId?: string;
  hcsMessageSeqNumber?: number;
  rateTier: RateTier;
  decision: Decision;
  amountPaid: number;
}): Promise<Tick> {
  const { data, error } = await supabase
    .from('ticks')
    .insert({
      session_id: input.sessionId,
      tick_number: input.tickNumber,
      oracle_trust_score: input.oracleTrustScore,
      oracle_call_tx_id: input.oracleCallTxId ?? null,
      payout_tx_id: input.payoutTxId ?? null,
      hcs_message_seq_number: input.hcsMessageSeqNumber ?? null,
      rate_tier: input.rateTier,
      decision: input.decision,
      amount_paid: input.amountPaid,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Tick;
}
