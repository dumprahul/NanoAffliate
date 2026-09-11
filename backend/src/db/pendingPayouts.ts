import { supabase } from '../lib/supabase.js';
import type { PendingPayout } from '../types/index.js';

export async function queuePendingPayout(input: {
  sessionId: string;
  tickId?: string;
  reason: string;
  amount: number;
}): Promise<PendingPayout> {
  const { data, error } = await supabase
    .from('pending_payouts')
    .insert({
      session_id: input.sessionId,
      tick_id: input.tickId ?? null,
      reason: input.reason,
      amount: input.amount,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PendingPayout;
}

export async function getUnresolvedPendingPayouts(): Promise<PendingPayout[]> {
  const { data, error } = await supabase.from('pending_payouts').select().is('resolved_at', null);
  if (error) throw error;
  return (data ?? []) as PendingPayout[];
}

export async function resolvePendingPayout(id: string): Promise<void> {
  const { error } = await supabase
    .from('pending_payouts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function incrementRetryCount(id: string, retryCount: number): Promise<void> {
  const { error } = await supabase.from('pending_payouts').update({ retry_count: retryCount }).eq('id', id);
  if (error) throw error;
}
