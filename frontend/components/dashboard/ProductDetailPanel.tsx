import { ArrowUpRight } from "lucide-react";
import { hostnameFromUrl, timeAgo } from "@/lib/format";
import type { ProductWithSeller } from "@/lib/types";
import { ProductThumb } from "./ProductThumb";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

export function ProductDetailPanel({
  product,
  onCreateLink,
}: {
  product: ProductWithSeller;
  onCreateLink: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <ProductThumb title={product.title} imageUrl={product.image_url} className="h-56 w-full" />

      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-[18px] leading-snug tracking-[-0.02em] text-ink">
          {product.title}
        </h2>
        <p className="tnum mt-2 text-[24px] tracking-[-0.03em] text-ink">
          {product.price_display ?? "No price set"}
        </p>

        <a
          href={product.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline mt-3 inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted"
        >
          {hostnameFromUrl(product.source_url)}
          <ArrowUpRight size={12} strokeWidth={1.75} />
        </a>

        <div className="mt-6 flex flex-col gap-2.5">
          <PrimaryButton
            as="button"
            onClick={onCreateLink}
            className="w-full justify-center"
          >
            Create link
          </PrimaryButton>
          <SecondaryButton
            href={product.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full justify-center"
          >
            View source
          </SecondaryButton>
        </div>

        {/* Raw record — every field is real, straight from the products table */}
        <div className="mt-8 border border-line-soft">
          <div className="border-b border-line-soft px-3.5 py-2.5">
            <p className="label">Product record</p>
          </div>
          <dl className="divide-y divide-line-soft font-mono text-[11px]">
            <Row label="id" value={product.id} />
            <Row label="seller_id" value={product.seller_id} />
            <Row label="affiliate_tag" value={product.affiliate_tag} />
            <Row label="seller.hedera_account_id" value={product.seller.hedera_account_id} />
            <Row
              label="seller.escrow_balance"
              value={
                product.seller.escrow_balance_cached !== null
                  ? `${product.seller.escrow_balance_cached} ℏ`
                  : "not funded"
              }
            />
            <Row label="created_at" value={timeAgo(product.created_at)} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <span className="shrink-0 text-subtle">{label}</span>
      <span className="truncate text-right text-ink-2">{value}</span>
    </div>
  );
}
