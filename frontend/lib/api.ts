import type {
  Creator,
  Link,
  LinkWithProduct,
  PayoutEvent,
  Product,
  ProductWithSeller,
  Seller,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, `Could not reach the backend at ${API_BASE_URL}. Is it running?`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? body.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Sellers ----

export function listSellers() {
  return request<{ sellers: Seller[] }>("/sellers").then((r) => r.sellers);
}

export function createSeller(input: { hedera_account_id: string }) {
  return request<{
    seller: Seller & { webhook_secret: string };
    fund_this_account: string;
    webhook_secret: string;
    note: string;
  }>("/sellers", { method: "POST", body: JSON.stringify(input) });
}

export function getEscrowBalance(sellerId: string) {
  return request<{ escrow_hedera_account_id: string; balance_hbar: number }>(
    `/sellers/${sellerId}/escrow-balance`,
  );
}

export function createProduct(
  sellerId: string,
  input: {
    source_url: string;
    title: string;
    image_url?: string;
    price_display?: string;
    affiliate_tag: string;
    escrow_budget_hbar?: number;
  },
) {
  return request<{ product: Product }>(`/sellers/${sellerId}/products`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.product);
}

// ---- Products (dashboard listing) ----

export function listProducts() {
  return request<{ products: ProductWithSeller[] }>("/products").then((r) => r.products);
}

export function getProduct(productId: string) {
  return request<{ product: Product; escrow_remaining_hbar: number | null }>(
    `/products/${productId}`,
  );
}

// ---- Creators ----

export function listCreators() {
  return request<{ creators: Creator[] }>("/creators").then((r) => r.creators);
}

export function createCreator(input: { hedera_account_id: string }) {
  return request<{ creator: Creator }>("/creators", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((r) => r.creator);
}

// ---- Links ----

export function listLinksByCreator(creatorId: string) {
  return request<{ links: LinkWithProduct[] }>(
    `/links?creator_id=${encodeURIComponent(creatorId)}`,
  ).then((r) => r.links);
}

export function createLink(input: {
  creator_id: string;
  product_id: string;
  rate_unverified_per_tick: number;
  rate_verified_per_tick: number;
  rate_purchase_bonus: number;
}) {
  return request<{ link: Link; shareable_url: string; explorer_url: string }>("/links", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Payouts ----

export function listPayouts() {
  return request<{ payouts: PayoutEvent[] }>("/payouts").then((r) => r.payouts);
}

// ---- Conversions (manual/demo trigger from the Links page) ----

export function reportSelfConversion(input: { session_id: string; order_id: string }) {
  return request<{ conversion: unknown; bonus_payout_tx_id: string | null; label: string }>(
    "/conversions/self-report",
    { method: "POST", body: JSON.stringify(input) },
  );
}
