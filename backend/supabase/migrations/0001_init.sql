-- NanoAffiliate schema — architecture/README.md §4
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- Scope note: RLS is intentionally left disabled here. This backend talks to
-- Supabase with a single server-side key and is the only writer; per-row
-- security policies aren't part of the architecture doc and would need a
-- real auth model to be meaningful. Revisit before exposing any table
-- directly to end-user clients.

create extension if not exists pgcrypto;

create table sellers (
  id uuid primary key default gen_random_uuid(),
  hedera_account_id text not null,
  escrow_hedera_account_id text,
  escrow_balance_cached numeric,
  webhook_secret text,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  source_url text not null,
  title text not null,
  image_url text,
  price_display text,
  affiliate_tag text not null,
  created_at timestamptz not null default now()
);
create index products_seller_id_idx on products(seller_id);

create table creators (
  id uuid primary key default gen_random_uuid(),
  hedera_account_id text not null,
  uaid text,
  cold_start_started_at timestamptz not null default now(),
  cumulative_attention_events integer not null default 0,
  trust_penalty_multiplier double precision not null default 1.0
);

create table bundles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  slug text not null unique,
  hcs_topic_id text not null unique,
  rate_unverified_per_tick numeric not null,
  rate_verified_per_tick numeric not null,
  rate_purchase_bonus numeric not null default 0,
  bundle_id uuid references bundles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index links_creator_id_idx on links(creator_id);
create index links_hcs_topic_id_idx on links(hcs_topic_id);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references links(id) on delete cascade,
  reader_fingerprint_hash text not null,
  reader_uaid text,
  is_verified boolean not null default false,
  verified_until timestamptz,
  cumulative_trust_score double precision not null default 0,
  borderline_tick_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  entry_ref text,
  started_at timestamptz not null default now(),
  last_tick_at timestamptz,
  ended_at timestamptz,
  end_reason text
);
create index sessions_link_id_idx on sessions(link_id);
create index sessions_status_idx on sessions(status);

create table ticks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  tick_number integer not null,
  oracle_trust_score double precision not null,
  oracle_call_tx_id text,
  payout_tx_id text,
  hcs_message_seq_number bigint,
  rate_tier text not null check (rate_tier in ('unverified', 'verified')),
  decision text not null check (decision in ('pay_full', 'pay_reduced', 'require_selfie_check', 'reject')),
  amount_paid numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, tick_number)
);
create index ticks_session_id_idx on ticks(session_id);

create table conversions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  order_id_self_reported text,
  seller_webhook_payload jsonb,
  confirmation_type text not null check (confirmation_type in ('self_reported', 'webhook_verified')),
  bonus_payout_tx_id text,
  bonus_schedule_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);
create index conversions_session_id_idx on conversions(session_id);

create table paid_attention_seconds_today (
  link_id uuid not null references links(id) on delete cascade,
  identity_key text not null,
  window_date date not null,
  seconds_paid integer not null default 0,
  primary key (link_id, identity_key, window_date)
);

create table pending_payouts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  tick_id uuid references ticks(id) on delete set null,
  reason text not null,
  amount numeric not null,
  queued_at timestamptz not null default now(),
  retry_count integer not null default 0,
  resolved_at timestamptz
);
create index pending_payouts_session_id_idx on pending_payouts(session_id);
