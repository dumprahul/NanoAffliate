import { supabase } from '../lib/supabase.js';

/** Frequency capping — architecture §9: bounds unlimited self-farming/replay per identity per link per day. */
const DAILY_CAP_SECONDS = 60 * 60 * 4; // 4 hours of paid attention per identity per link per day

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getSecondsPaidToday(linkId: string, identityKey: string): Promise<number> {
  const { data, error } = await supabase
    .from('paid_attention_seconds_today')
    .select('seconds_paid')
    .eq('link_id', linkId)
    .eq('identity_key', identityKey)
    .eq('window_date', todayUtc())
    .maybeSingle();
  if (error) throw error;
  return data?.seconds_paid ?? 0;
}

export async function isUnderDailyCap(linkId: string, identityKey: string): Promise<boolean> {
  const seconds = await getSecondsPaidToday(linkId, identityKey);
  return seconds < DAILY_CAP_SECONDS;
}

export async function addPaidSeconds(linkId: string, identityKey: string, seconds: number): Promise<void> {
  const windowDate = todayUtc();
  const current = await getSecondsPaidToday(linkId, identityKey);
  const { error } = await supabase.from('paid_attention_seconds_today').upsert(
    {
      link_id: linkId,
      identity_key: identityKey,
      window_date: windowDate,
      seconds_paid: current + seconds,
    },
    { onConflict: 'link_id,identity_key,window_date' },
  );
  if (error) throw error;
}

export { DAILY_CAP_SECONDS };
