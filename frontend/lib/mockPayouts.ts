import type { PayoutEvent } from './types';

/**
 * Stand-in for a joined "payout history" query across ticks, conversions
 * and pending_payouts until the dashboard is wired to the real API.
 * Amounts and cadence mirror what we actually saw in live testnet runs
 * (0.001 ℏ full rate, 0.0005 ℏ reduced, 0.05 ℏ conversion bonus).
 */

// A fixed anchor, not Date.now() — this module evaluates once during SSR and
// again during client hydration; Date.now() would return two different
// values a render apart, shifting every relative timestamp and causing a
// hydration mismatch the instant any of them crosses a formatting boundary.
const now = new Date('2026-09-13T12:00:00.000Z').getTime();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

const ESCROW_A = '0.0.6481756';
const ESCROW_B = '0.0.6492088';
const CREATOR_A = '0.0.6481207';
const CREATOR_B = '0.0.6492013';
const TOPIC_A = '0.0.10481821';
const TOPIC_B = '0.0.10483519';

function txId(account: string, hoursOffset: number) {
  const t = (now - hoursOffset * 3_600_000) / 1000;
  return `${account}@${t.toFixed(6)}`;
}

export const mockPayouts: PayoutEvent[] = [
  {
    id: 'evt-1',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 1),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.86',
    created_at: hoursAgo(1),
  },
  {
    id: 'evt-2',
    kind: 'conversion_bonus',
    status: 'pending',
    amount_hbar: 0.05,
    tx_id: null,
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'webhook_verified · scheduled, releases in 5m',
    created_at: hoursAgo(2),
  },
  {
    id: 'evt-3',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.0005,
    tx_id: txId(CREATOR_B, 5),
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'pay_reduced · score 0.41',
    created_at: hoursAgo(5),
  },
  {
    id: 'evt-4',
    kind: 'pending_payout',
    status: 'pending',
    amount_hbar: 0.001,
    tx_id: null,
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'escrow_insufficient · retry 2/10',
    created_at: hoursAgo(8),
  },
  {
    id: 'evt-5',
    kind: 'conversion_bonus',
    status: 'completed',
    amount_hbar: 0.05,
    tx_id: txId(CREATOR_A, 26),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'self_reported · order confirmed',
    created_at: daysAgo(1.1),
  },
  {
    id: 'evt-6',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 30),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.88',
    created_at: daysAgo(1.25),
  },
  {
    id: 'evt-7',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 31),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.84',
    created_at: daysAgo(1.29),
  },
  {
    id: 'evt-8',
    kind: 'conversion_bonus',
    status: 'cancelled',
    amount_hbar: 0.05,
    tx_id: null,
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'webhook_verified · scheduled bonus cancelled before release',
    created_at: daysAgo(3),
  },
  {
    id: 'evt-9',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.0005,
    tx_id: txId(CREATOR_B, 96),
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'pay_reduced · score 0.44',
    created_at: daysAgo(4),
  },
  {
    id: 'evt-10',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 170),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.91',
    created_at: daysAgo(7.1),
  },
  {
    id: 'evt-11',
    kind: 'conversion_bonus',
    status: 'completed',
    amount_hbar: 0.05,
    tx_id: txId(CREATOR_A, 200),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'self_reported · order confirmed',
    created_at: daysAgo(8.3),
  },
  {
    id: 'evt-12',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_B, 340),
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'pay_full · score 0.79',
    created_at: daysAgo(14.2),
  },
  {
    id: 'evt-13',
    kind: 'pending_payout',
    status: 'cancelled',
    amount_hbar: 0.0005,
    tx_id: null,
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'escrow_insufficient · retries exhausted (10/10)',
    created_at: daysAgo(20),
  },
  {
    id: 'evt-14',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 900),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.87',
    created_at: daysAgo(37.5),
  },
  {
    id: 'evt-15',
    kind: 'conversion_bonus',
    status: 'completed',
    amount_hbar: 0.05,
    tx_id: txId(CREATOR_B, 1400),
    from_account: ESCROW_B,
    to_account: CREATOR_B,
    link_topic_id: TOPIC_B,
    detail: 'webhook_verified · scheduled bonus released',
    created_at: daysAgo(58),
  },
  {
    id: 'evt-16',
    kind: 'tick_payout',
    status: 'completed',
    amount_hbar: 0.001,
    tx_id: txId(CREATOR_A, 2000),
    from_account: ESCROW_A,
    to_account: CREATOR_A,
    link_topic_id: TOPIC_A,
    detail: 'pay_full · score 0.82',
    created_at: daysAgo(83),
  },
];
