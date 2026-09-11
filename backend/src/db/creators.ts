import { supabase } from '../lib/supabase.js';
import type { Creator } from '../types/index.js';

export async function createCreator(input: { hederaAccountId: string }): Promise<Creator> {
  const { data, error } = await supabase
    .from('creators')
    .insert({ hedera_account_id: input.hederaAccountId })
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
