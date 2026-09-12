/** Domain types mirroring the Supabase schema — architecture/README.md §4. */

export type SessionStatus = 'active' | 'paused' | 'ended';
export type RateTier = 'unverified' | 'verified';
export type Decision = 'pay_full' | 'pay_reduced' | 'require_selfie_check' | 'reject';
export type ConfirmationType = 'self_reported' | 'webhook_verified';
export type ConversionStatus = 'pending' | 'paid' | 'cancelled';

export interface Seller {
  id: string;
  hedera_account_id: string;
  escrow_hedera_account_id: string | null;
  escrow_balance_cached: number | null;
  webhook_secret: string | null;
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

export interface Creator {
  id: string;
  hedera_account_id: string;
  uaid: string | null;
  cold_start_started_at: string;
  cumulative_attention_events: number;
  trust_penalty_multiplier: number;
}

export interface Link {
  id: string;
  creator_id: string;
  product_id: string;
  slug: string;
  hcs_topic_id: string;
  rate_unverified_per_tick: number;
  rate_verified_per_tick: number;
  rate_purchase_bonus: number;
  bundle_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  link_id: string;
  reader_fingerprint_hash: string;
  reader_uaid: string | null;
  is_verified: boolean;
  verified_until: string | null;
  cumulative_trust_score: number;
  borderline_tick_count: number;
  status: SessionStatus;
  entry_ref: string | null;
  started_at: string;
  last_tick_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
}

export interface Tick {
  id: string;
  session_id: string;
  tick_number: number;
  oracle_trust_score: number;
  oracle_call_tx_id: string | null;
  payout_tx_id: string | null;
  hcs_message_seq_number: number | null;
  rate_tier: RateTier;
  decision: Decision;
  amount_paid: number;
  created_at: string;
}

export interface Conversion {
  id: string;
  session_id: string;
  order_id_self_reported: string | null;
  seller_webhook_payload: unknown;
  confirmation_type: ConfirmationType;
  bonus_payout_tx_id: string | null;
  bonus_schedule_id: string | null;
  status: ConversionStatus;
  created_at: string;
}

export interface PendingPayout {
  id: string;
  session_id: string;
  tick_id: string | null;
  reason: string;
  amount: number;
  queued_at: string;
  retry_count: number;
  resolved_at: string | null;
}

/** Envelope shared by every HCS message — architecture/README.md §7. */
export interface HcsEnvelope {
  type: string;
  session_id?: string;
  [key: string]: unknown;
}
