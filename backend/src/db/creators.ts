import { supabase } from '../lib/supabase.js';
import type { Creator } from '../types/index.js';

export async function createCreator(input: { hederaAccountId: string; worldNullifier?: string }): Promise<Creator> {
  const { data, error } = await supabase
    .from('creators')
    .insert({ hedera_account_id: input.hederaAccountId, world_nullifier: input.worldNullifier ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Creator;
}

export async function getCreatorById(id: string): Promise<Creator | null> {
  const { data, error } = await supabase.from('creators').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Creator | null;
}

/** Real creator login (frontend/app/login) — looks a creator up by World's stable per-app nullifier. */
export async function getCreatorByWorldNullifier(nullifier: string): Promise<Creator | null> {
  const { data, error } = await supabase.from('creators').select().eq('world_nullifier', nullifier).maybeSingle();
  if (error) throw error;
  return data as Creator | null;
}

export async function listCreators(): Promise<Creator[]> {
  const { data, error } = await supabase.from('creators').select().order('cold_start_started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Creator[];
}
