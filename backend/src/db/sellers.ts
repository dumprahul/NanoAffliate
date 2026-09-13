import { supabase } from '../lib/supabase.js';
import type { Seller } from '../types/index.js';

export async function createSeller(input: {
  hederaAccountId: string;
  escrowHederaAccountId: string;
  webhookSecret: string;
}): Promise<Seller> {
  const { data, error } = await supabase
    .from('sellers')
    .insert({
      hedera_account_id: input.hederaAccountId,
      escrow_hedera_account_id: input.escrowHederaAccountId,
      webhook_secret: input.webhookSecret,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Seller;
}

export async function getSellerById(id: string): Promise<Seller | null> {
  const { data, error } = await supabase.from('sellers').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Seller | null;
}

export async function updateEscrowBalanceCached(id: string, balance: number): Promise<void> {
  const { error } = await supabase.from('sellers').update({ escrow_balance_cached: balance }).eq('id', id);
  if (error) throw error;
}

/** Public listing — omits webhook_secret, which is only ever returned once, at seller creation. */
export async function listSellers(): Promise<Omit<Seller, 'webhook_secret'>[]> {
  const { data, error } = await supabase
    .from('sellers')
    .select('id, hedera_account_id, escrow_hedera_account_id, escrow_balance_cached, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Omit<Seller, 'webhook_secret'>[];
}
