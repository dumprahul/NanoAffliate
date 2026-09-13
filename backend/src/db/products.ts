import { supabase } from '../lib/supabase.js';
import type { Product, Seller } from '../types/index.js';

export async function createProduct(input: {
  sellerId: string;
  sourceUrl: string;
  title: string;
  imageUrl?: string;
  priceDisplay?: string;
  affiliateTag: string;
  escrowBudgetHbar?: number;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      seller_id: input.sellerId,
      source_url: input.sourceUrl,
      title: input.title,
      image_url: input.imageUrl ?? null,
      price_display: input.priceDisplay ?? null,
      affiliate_tag: input.affiliateTag,
      escrow_budget_hbar: input.escrowBudgetHbar ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export type ProductWithSeller = Product & { seller: Omit<Seller, 'webhook_secret'> };

/**
 * Full marketplace listing for the dashboard's Products page — every product,
 * joined with its seller. Explicit seller column list (rather than `*`)
 * deliberately excludes webhook_secret — this is a public listing endpoint,
 * and that secret is only ever meant to be seen once, by its own seller, at
 * creation (it signs /webhooks/purchase-confirmed requests).
 */
export async function listProductsWithSellers(): Promise<ProductWithSeller[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, seller:sellers(id, hedera_account_id, escrow_hedera_account_id, escrow_balance_cached, created_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductWithSeller[];
}

/**
 * Per-product escrow cap — architecture extension, seller-set §16 budget scoped
 * to one product rather than the whole escrow account. `null` budget means
 * unlimited (existing behavior). Not atomic across concurrent writers, same
 * read-then-write pattern as `isUnderDailyCap`/`addPaidSeconds` — acceptable
 * because every real payout already funnels through the single in-process
 * `hederaSubmissionQueue` mutex before money moves.
 */
export async function isUnderProductBudget(productId: string, amountHbar: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .select('escrow_budget_hbar, escrow_spent_hbar')
    .eq('id', productId)
    .single();
  if (error) throw error;
  if (data.escrow_budget_hbar === null) return true;
  return data.escrow_spent_hbar + amountHbar <= data.escrow_budget_hbar;
}

export async function addProductSpend(productId: string, amountHbar: number): Promise<void> {
  const { data, error: readError } = await supabase
    .from('products')
    .select('escrow_spent_hbar')
    .eq('id', productId)
    .single();
  if (readError) throw readError;
  const { error } = await supabase
    .from('products')
    .update({ escrow_spent_hbar: data.escrow_spent_hbar + amountHbar })
    .eq('id', productId);
  if (error) throw error;
}
