/**
 * Mirrors backend/src/types/index.ts exactly — these are the real columns
 * the API returns, nothing invented. See backend/supabase/migrations/0001_init.sql.
 */

export interface Seller {
  id: string;
  hedera_account_id: string;
  escrow_hedera_account_id: string | null;
  escrow_balance_cached: number | null;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  source_url: string;
  title: string;
  image_url: string | null;
  price_display: string | null;
  affiliate_tag: string;
  created_at: string;
}

/** What the dashboard actually needs: a product joined with its seller. */
export interface ProductWithSeller extends Product {
  seller: Seller;
}

export interface Creator {
  id: string;
  hedera_account_id: string;
  uaid: string | null;
  trust_penalty_multiplier: number;
}

export type RateTier = 'unverified' | 'verified';
export type Decision = 'pay_full' | 'pay_reduced' | 'require_selfie_check' | 'reject';

export interface Tick {
  id: string;
  session_id: string;
  tick_number: number;
  oracle_trust_score: number;
  oracle_call_tx_id: string | null;
  payout_tx_id: string | null;
  rate_tier: RateTier;
  decision: Decision;
  amount_paid: number;
  created_at: string;
}

export type ConfirmationType = 'self_reported' | 'webhook_verified';
export type ConversionStatus = 'pending' | 'paid' | 'cancelled';

export interface Conversion {
  id: string;
  session_id: string;
  confirmation_type: ConfirmationType;
  bonus_payout_tx_id: string | null;
  bonus_schedule_id: string | null;
  status: ConversionStatus;
  amount: number;
  created_at: string;
}

export interface PendingPayout {
  id: string;
  session_id: string;
  reason: string;
  amount: number;
  queued_at: string;
  retry_count: number;
  resolved_at: string | null;
}

/**
 * A single row on the Payouts page — unifies the three real sources of
 * money movement in the schema (ticks.payout_tx_id, conversions.bonus_*,
 * pending_payouts) into one shape, since that's genuinely what the backend
 * would return from a joined "payout history" query. No fields invented:
 * every one traces to a real column on one of Tick / Conversion / PendingPayout.
 */
export type PayoutKind = 'tick_payout' | 'conversion_bonus' | 'pending_payout';
export type PayoutStatus = 'completed' | 'pending' | 'cancelled';

export interface PayoutEvent {
  id: string;
  kind: PayoutKind;
  status: PayoutStatus;
  amount_hbar: number;
  tx_id: string | null;
  from_account: string; // seller.escrow_hedera_account_id
  to_account: string; // creator.hedera_account_id
  link_topic_id: string; // links.hcs_topic_id — which link this money came from
  detail: string; // rate_tier/decision, confirmation_type, or a pending/cancel reason
  created_at: string;
}
