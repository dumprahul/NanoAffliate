-- Per-product escrow spending cap — a seller can bound how much of their
-- escrow a single product's links may draw, independent of the seller's
-- total escrow account balance (already enforced live via Mirror Node).
-- null budget = unlimited (existing behavior, unchanged for products that
-- don't set one).

alter table products
  add column escrow_budget_hbar numeric,
  add column escrow_spent_hbar numeric not null default 0;
