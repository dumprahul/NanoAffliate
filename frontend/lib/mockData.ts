import type { ProductWithSeller, Seller } from './types';

/**
 * Stand-in for `GET /sellers/:id/products` (joined with sellers) until the
 * dashboard is wired to the real API. Every field here is one the backend
 * actually stores — see lib/types.ts — nothing fabricated (no ratings,
 * colors, materials or stock counts; the schema doesn't have those).
 */

// Fixed anchor, not Date.now() — avoids an SSR/hydration mismatch, since
// this module evaluates once on the server and again on the client at a
// slightly different wall-clock moment. See lib/mockPayouts.ts for the
// full explanation.
const now = new Date('2026-09-13T12:00:00.000Z').getTime();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

const sellers: Seller[] = [
  {
    id: 'seller-1',
    hedera_account_id: '0.0.6481207',
    escrow_hedera_account_id: '0.0.6481756',
    escrow_balance_cached: 12.4,
    created_at: daysAgo(40),
  },
  {
    id: 'seller-2',
    hedera_account_id: '0.0.6492013',
    escrow_hedera_account_id: '0.0.6492088',
    escrow_balance_cached: 3.15,
    created_at: daysAgo(22),
  },
  {
    id: 'seller-3',
    hedera_account_id: '0.0.6510442',
    escrow_hedera_account_id: null,
    escrow_balance_cached: null,
    created_at: daysAgo(4),
  },
];

const bySeller = (id: string) => sellers.find((s) => s.id === id)!;

export const mockProducts: ProductWithSeller[] = [
  {
    id: 'prod-1',
    seller_id: 'seller-1',
    title: 'Chairsu KL-49 Round Side Table',
    source_url: 'https://www.amazon.com/dp/B0CHAIRSU49',
    image_url: null,
    price_display: '$110.99',
    affiliate_tag: 'chairsu-kl49-21',
    created_at: daysAgo(2),
    seller: bySeller('seller-1'),
  },
  {
    id: 'prod-2',
    seller_id: 'seller-1',
    title: 'Krobelus-M3 Console Desk, Glass Top',
    source_url: 'https://www.amazon.com/dp/B0KROBELUSM3',
    image_url: null,
    price_display: '$401.23',
    affiliate_tag: 'krobelus-m3-21',
    created_at: daysAgo(5),
    seller: bySeller('seller-1'),
  },
  {
    id: 'prod-3',
    seller_id: 'seller-2',
    title: 'Hosali-99 Folding Wall Table',
    source_url: 'https://www.etsy.com/listing/hosali99',
    image_url: null,
    price_display: '$688.12',
    affiliate_tag: 'hosali99-etsy',
    created_at: daysAgo(1),
    seller: bySeller('seller-2'),
  },
  {
    id: 'prod-4',
    seller_id: 'seller-2',
    title: 'Meta-L23 Dining Table, Black Oak',
    source_url: 'https://www.wayfair.com/p/meta-l23',
    image_url: null,
    price_display: '$321.98',
    affiliate_tag: 'meta-l23-wf',
    created_at: daysAgo(11),
    seller: bySeller('seller-2'),
  },
  {
    id: 'prod-5',
    seller_id: 'seller-3',
    title: 'METAC-K9 Filing Cabinet',
    source_url: 'https://www.amazon.com/dp/B0METACK9',
    image_url: null,
    price_display: '$751.32',
    affiliate_tag: 'metac-k9-21',
    created_at: daysAgo(0),
    seller: bySeller('seller-3'),
  },
  {
    id: 'prod-6',
    seller_id: 'seller-1',
    title: 'Dorse Klorta Rolling Cart',
    source_url: 'https://www.target.com/p/dorse-klorta',
    image_url: null,
    price_display: '$590.19',
    affiliate_tag: 'dorse-klorta-tgt',
    created_at: daysAgo(18),
    seller: bySeller('seller-1'),
  },
  {
    id: 'prod-7',
    seller_id: 'seller-2',
    title: 'Klota Deck 991 Dining Set (2-seat)',
    source_url: 'https://www.amazon.com/dp/B0KLOTA991',
    image_url: null,
    price_display: '$600.12',
    affiliate_tag: 'klota991-21',
    created_at: daysAgo(9),
    seller: bySeller('seller-2'),
  },
  {
    id: 'prod-8',
    seller_id: 'seller-3',
    title: 'Set Deck - 091 Patio Table + Chairs',
    source_url: 'https://www.amazon.com/dp/B0SETDECK91',
    image_url: null,
    price_display: '$819.12',
    affiliate_tag: 'setdeck091-21',
    created_at: daysAgo(3),
    seller: bySeller('seller-3'),
  },
  {
    id: 'prod-9',
    seller_id: 'seller-1',
    title: 'Lume Table, Pedestal Base',
    source_url: 'https://www.cb2.com/lume-table',
    image_url: null,
    price_display: '$299.00',
    affiliate_tag: 'lume-table-cb2',
    created_at: daysAgo(27),
    seller: bySeller('seller-1'),
  },
];

export const mockSellers = sellers;
