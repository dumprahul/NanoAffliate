import { supabase } from '../lib/supabase.js';
import type { Session, SessionStatus } from '../types/index.js';

export async function createSession(input: {
  linkId: string;
  readerFingerprintHash: string;
  entryRef?: string;
}): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      link_id: input.linkId,
      reader_fingerprint_hash: input.readerFingerprintHash,
      entry_ref: input.entryRef ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase.from('sessions').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

/** Full context needed to score + pay a tick — joins link, product, seller, creator. */
export interface SessionContext {
  session: Session;
  link: {
    id: string;
    hcs_topic_id: string;
    rate_unverified_per_tick: number;
    rate_verified_per_tick: number;
    rate_purchase_bonus: number;
  };
  creator: { id: string; hedera_account_id: string; trust_penalty_multiplier: number };
  seller: { id: string; escrow_hedera_account_id: string | null };
  product: { id: string; escrow_budget_hbar: number | null; escrow_spent_hbar: number };
}

export async function getSessionContext(sessionId: string): Promise<SessionContext | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `*, links!inner ( id, hcs_topic_id, rate_unverified_per_tick, rate_verified_per_tick, rate_purchase_bonus,
        creators!inner ( id, hedera_account_id, trust_penalty_multiplier ),
        products!inner ( id, seller_id, escrow_budget_hbar, escrow_spent_hbar, sellers!inner ( id, escrow_hedera_account_id ) ) )`,
    )
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  const link = row.links;
  const creator = link.creators;
  const product = link.products;
  const seller = product.sellers;

  const { links: _links, ...session } = row;
  void _links;

  return {
    session: session as Session,
    link: {
      id: link.id,
      hcs_topic_id: link.hcs_topic_id,
      rate_unverified_per_tick: link.rate_unverified_per_tick,
      rate_verified_per_tick: link.rate_verified_per_tick,
      rate_purchase_bonus: link.rate_purchase_bonus,
    },
    creator: {
      id: creator.id,
      hedera_account_id: creator.hedera_account_id,
      trust_penalty_multiplier: creator.trust_penalty_multiplier,
    },
    seller: { id: seller.id, escrow_hedera_account_id: seller.escrow_hedera_account_id },
    product: {
      id: product.id,
      escrow_budget_hbar: product.escrow_budget_hbar,
      escrow_spent_hbar: product.escrow_spent_hbar,
    },
  };
}

export async function findActiveSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from('sessions').select().eq('status', 'active');
  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function updateSessionAfterTick(
  id: string,
  fields: Partial<
    Pick<Session, 'cumulative_trust_score' | 'borderline_tick_count' | 'last_tick_at' | 'is_verified' | 'verified_until'>
  >,
): Promise<void> {
  const { error } = await supabase.from('sessions').update(fields).eq('id', id);
  if (error) throw error;
}

/**
 * Selfie Check passed — unlocks rate_verified_per_tick for the remainder of
 * this session. Also resets borderline_tick_count: scoreSession.ts's
 * `borderlineTickCount > 6` check runs before any score threshold and never
 * resets itself except on a `pay_full` outcome — which is unreachable once
 * that branch is hit, since it always short-circuits first. Without this
 * reset, a session that triggered `require_selfie_check` would stay stuck
 * returning that same decision forever, even after verifying.
 */
export async function setSessionVerified(id: string, verifiedUntil: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ is_verified: true, verified_until: verifiedUntil, borderline_tick_count: 0 })
    .eq('id', id);
  if (error) throw error;
}

export async function setSessionStatus(
  id: string,
  status: SessionStatus,
  extra?: { ended_at?: string; end_reason?: string },
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status, ...extra })
    .eq('id', id);
  if (error) throw error;
}
