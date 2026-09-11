import { supabase } from '../lib/supabase.js';
import type { Link } from '../types/index.js';

export async function createLink(input: {
  creatorId: string;
  productId: string;
  slug: string;
  hcsTopicId: string;
  rateUnverifiedPerTick: number;
  rateVerifiedPerTick: number;
  ratePurchaseBonus: number;
}): Promise<Link> {
  const { data, error } = await supabase
    .from('links')
    .insert({
      creator_id: input.creatorId,
      product_id: input.productId,
      slug: input.slug,
      hcs_topic_id: input.hcsTopicId,
      rate_unverified_per_tick: input.rateUnverifiedPerTick,
      rate_verified_per_tick: input.rateVerifiedPerTick,
      rate_purchase_bonus: input.ratePurchaseBonus,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Link;
}

export async function getLinkByTopicId(topicId: string): Promise<Link | null> {
  const { data, error } = await supabase.from('links').select().eq('hcs_topic_id', topicId).maybeSingle();
  if (error) throw error;
  return data as Link | null;
}

export async function getLinkById(id: string): Promise<Link | null> {
  const { data, error } = await supabase.from('links').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Link | null;
}
