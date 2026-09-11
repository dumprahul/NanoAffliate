import { supabase } from '../lib/supabase.js';
import type { Product } from '../types/index.js';

export async function createProduct(input: {
  sellerId: string;
  sourceUrl: string;
  title: string;
  imageUrl?: string;
  priceDisplay?: string;
  affiliateTag: string;
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
