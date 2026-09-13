"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { FilterRail } from "@/components/dashboard/FilterRail";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { ProductDetailPanel } from "@/components/dashboard/ProductDetailPanel";
import { CreateLinkDrawer } from "@/components/dashboard/CreateLinkDrawer";
import { AddProductDrawer } from "@/components/dashboard/AddProductDrawer";
import { sortProducts, type SortKey } from "@/components/dashboard/sort";
import { ApiError, listProducts } from "@/lib/api";
import { useCreatorIdentity } from "@/lib/identity";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { RequireCreatorLogin } from "@/components/ui/RequireCreatorLogin";
import { PrimaryButton } from "@/components/ui/Button";
import type { ProductWithSeller, Seller } from "@/lib/types";

export default function ProductsPage() {
  return (
    <ClientOnly>
      <RequireCreatorLogin>
        <ProductsPageContent />
      </RequireCreatorLogin>
    </ClientOnly>
  );
}

function ProductsPageContent() {
  const { creator } = useCreatorIdentity();
  const [products, setProducts] = useState<ProductWithSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Below the xl breakpoint there's no persistent side rail, so selecting a
  // product opens the same detail panel as a modal instead.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await listProducts();
      setProducts(list);
      setError(null);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load products.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sellers = useMemo<Seller[]>(() => {
    if (!products) return [];
    const seen = new Map<string, Seller>();
    for (const p of products) seen.set(p.seller.id, p.seller);
    return [...seen.values()];
  }, [products]);

  const countBySeller = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products ?? []) counts[p.seller_id] = (counts[p.seller_id] ?? 0) + 1;
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (sellerId) list = list.filter((p) => p.seller_id === sellerId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return sortProducts(list, sort);
  }, [products, search, sort, sellerId]);

  const selected = (products ?? []).find((p) => p.id === selectedId) ?? null;

  function selectProduct(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  function handleCreateLinkClick() {
    if (!creator) return;
    setDrawerOpen(true);
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Topbar search={search} onSearchChange={setSearch} searchPlaceholder="Search products…" />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <FilterRail
          sellers={sellers}
          countBySeller={countBySeller}
          totalCount={(products ?? []).length}
          selectedSellerId={sellerId}
          onSelectSeller={setSellerId}
          sort={sort}
          onSortChange={setSort}
        />

        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <p className="label">Products</p>
              <h1 className="display mt-2 text-[26px]">
                {sellerId
                  ? sellers.find((s) => s.id === sellerId)?.hedera_account_id
                  : "All products"}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="tnum text-[12.5px] text-subtle">
                {filtered.length} product{filtered.length === 1 ? "" : "s"}
              </span>
              <PrimaryButton as="button" onClick={() => setAddProductOpen(true)}>
                + Add product
              </PrimaryButton>
            </div>
          </div>

          {error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed border-line-soft">
              <p className="text-[13px] text-red-600">{error}</p>
              <button type="button" onClick={refresh} className="link-underline text-[12.5px] text-ink-2">
                Retry
              </button>
            </div>
          ) : products === null ? (
            <div className="flex h-64 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">Loading products…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">
                {(products ?? []).length === 0 ? "No products yet." : "No products match this search."}
              </p>
              {(products ?? []).length === 0 && (
                <button
                  type="button"
                  onClick={() => setAddProductOpen(true)}
                  className="link-underline text-[12.5px] text-ink-2"
                >
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={product.id === selectedId}
                  onSelect={() => selectProduct(product.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Persistent detail rail — desktop only */}
        {selected && (
          <div className="hidden w-[380px] shrink-0 border-l border-line xl:block">
            <ProductDetailPanel product={selected} onCreateLink={handleCreateLinkClick} />
            {!creator && <NoIdentityNotice />}
          </div>
        )}
      </div>

      {/* Same detail panel, as a modal, below the xl breakpoint */}
      {selected && mobileDetailOpen && (
        <div className="fixed inset-0 z-40 flex justify-end xl:hidden">
          <button
            aria-label="Close"
            onClick={() => setMobileDetailOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-bg">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <p className="label">Product</p>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                aria-label="Close"
                className="text-ink-2 transition-colors hover:text-ink"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <ProductDetailPanel product={selected} onCreateLink={handleCreateLinkClick} />
            {!creator && <NoIdentityNotice />}
          </div>
        </div>
      )}

      {drawerOpen && selected && creator && (
        <CreateLinkDrawer product={selected} creatorId={creator.id} onClose={() => setDrawerOpen(false)} />
      )}

      {addProductOpen && (
        <AddProductDrawer onClose={() => setAddProductOpen(false)} onCreated={() => refresh()} />
      )}
    </div>
  );
}

function NoIdentityNotice() {
  return (
    <div className="border-t border-line-soft bg-surface px-6 py-3">
      <p className="text-[11.5px] leading-[1.6] text-subtle">
        Log in before minting links —{" "}
        <Link href="/login" className="link-underline text-ink-2">
          log in
        </Link>
        .
      </p>
    </div>
  );
}
