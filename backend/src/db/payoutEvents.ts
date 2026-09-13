import { supabase } from '../lib/supabase.js';

export type PayoutKind = 'tick_payout' | 'conversion_bonus' | 'pending_payout';
export type PayoutStatus = 'completed' | 'pending' | 'cancelled';

/**
 * One row on the Payouts dashboard — unifies the three real sources of money
 * movement in the schema (ticks.payout_tx_id, conversions.bonus_*,
 * pending_payouts) into a single joined shape. Mirrors frontend/lib/types.ts
 * PayoutEvent exactly; nothing here is invented beyond what those three
 * tables already store.
 */
export interface PayoutEvent {
  id: string;
  kind: PayoutKind;
  status: PayoutStatus;
  amount_hbar: number;
  tx_id: string | null;
  from_account: string;
  to_account: string;
  link_topic_id: string;
  detail: string;
  created_at: string;
}

const MAX_PAYOUT_RETRIES = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapLink(row: any) {
  const link = row.sessions.links;
  return {
    topicId: link.hcs_topic_id as string,
    creatorAccount: link.creators.hedera_account_id as string,
    escrowAccount: link.products.sellers.escrow_hedera_account_id as string | null,
  };
}

async function listTickPayoutEvents(): Promise<PayoutEvent[]> {
  const { data, error } = await supabase
    .from('ticks')
    .select(
      `id, payout_tx_id, amount_paid, rate_tier, decision, oracle_trust_score, created_at,
       sessions!inner ( links!inner ( hcs_topic_id,
         creators!inner ( hedera_account_id ),
         products!inner ( sellers!inner ( escrow_hedera_account_id ) ) ) )`,
    )
    .not('payout_tx_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const { topicId, creatorAccount, escrowAccount } = unwrapLink(row);
    return {
      id: `tick:${row.id}`,
      kind: 'tick_payout' as const,
      status: 'completed' as const,
      amount_hbar: Number(row.amount_paid),
      tx_id: row.payout_tx_id,
      from_account: escrowAccount ?? 'unknown',
      to_account: creatorAccount,
      link_topic_id: topicId,
      detail: `${row.decision} · score ${Number(row.oracle_trust_score).toFixed(2)}`,
      created_at: row.created_at,
    };
  });
}

async function listConversionBonusEvents(): Promise<PayoutEvent[]> {
  const { data, error } = await supabase
    .from('conversions')
    .select(
      `id, confirmation_type, bonus_payout_tx_id, bonus_schedule_id, status, created_at,
       sessions!inner ( links!inner ( hcs_topic_id, rate_purchase_bonus,
         creators!inner ( hedera_account_id ),
         products!inner ( sellers!inner ( escrow_hedera_account_id ) ) ) )`,
    )
    .order('created_at', { ascending: false });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const link = row.sessions.links;
    const { topicId, creatorAccount, escrowAccount } = unwrapLink(row);
    const status: PayoutStatus = row.status === 'paid' ? 'completed' : row.status === 'cancelled' ? 'cancelled' : 'pending';
    const detail =
      row.status === 'paid'
        ? `${row.confirmation_type} · order confirmed`
        : row.status === 'cancelled'
          ? `${row.confirmation_type} · scheduled bonus cancelled before release`
          : row.bonus_schedule_id
            ? `${row.confirmation_type} · scheduled, awaiting release`
            : `${row.confirmation_type} · awaiting confirmation`;
    return {
      id: `conversion:${row.id}`,
      kind: 'conversion_bonus' as const,
      status,
      amount_hbar: Number(link.rate_purchase_bonus),
      tx_id: row.bonus_payout_tx_id,
      from_account: escrowAccount ?? 'unknown',
      to_account: creatorAccount,
      link_topic_id: topicId,
      detail,
      created_at: row.created_at,
    };
  });
}

async function listPendingPayoutEvents(): Promise<PayoutEvent[]> {
  const { data, error } = await supabase
    .from('pending_payouts')
    .select(
      `id, reason, amount, retry_count, resolved_at, queued_at,
       sessions!inner ( links!inner ( hcs_topic_id,
         creators!inner ( hedera_account_id ),
         products!inner ( sellers!inner ( escrow_hedera_account_id ) ) ) )`,
    )
    .order('queued_at', { ascending: false });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const { topicId, creatorAccount, escrowAccount } = unwrapLink(row);
    // resolved_at is only ever set by a successful retry (see queue/scheduler.ts
    // retryPendingPayouts) — there's no separate "cancelled" column, so a row
    // that's exhausted its retries without resolving reads as cancelled here.
    const status: PayoutStatus = row.resolved_at
      ? 'completed'
      : row.retry_count >= MAX_PAYOUT_RETRIES
        ? 'cancelled'
        : 'pending';
    const detail =
      status === 'cancelled'
        ? `${row.reason} · retries exhausted (${row.retry_count}/${MAX_PAYOUT_RETRIES})`
        : `${row.reason} · retry ${row.retry_count}/${MAX_PAYOUT_RETRIES}`;
    return {
      id: `pending:${row.id}`,
      kind: 'pending_payout' as const,
      status,
      amount_hbar: Number(row.amount),
      tx_id: null,
      from_account: escrowAccount ?? 'unknown',
      to_account: creatorAccount,
      link_topic_id: topicId,
      detail,
      created_at: row.queued_at,
    };
  });
}

/** Joined payout history across ticks, conversions and pending_payouts — architecture §16/§19 audit trail. */
export async function listPayoutEvents(): Promise<PayoutEvent[]> {
  const [ticks, conversions, pending] = await Promise.all([
    listTickPayoutEvents(),
    listConversionBonusEvents(),
    listPendingPayoutEvents(),
  ]);
  return [...ticks, ...conversions, ...pending].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
