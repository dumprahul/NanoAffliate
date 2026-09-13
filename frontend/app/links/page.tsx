"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { useCreatorIdentity } from "@/lib/identity";
import { ApiError, API_BASE_URL, listLinksByCreator } from "@/lib/api";
import { formatHbar, hashscanTopicUrl, timeAgo } from "@/lib/format";
import type { LinkWithProduct } from "@/lib/types";

export default function LinksPage() {
  return (
    <ClientOnly>
      <LinksPageContent />
    </ClientOnly>
  );
}

function LinksPageContent() {
  const { creator } = useCreatorIdentity();
  const [links, setLinks] = useState<LinkWithProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creator) return;
    listLinksByCreator(creator.id)
      .then(setLinks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load links."));
  }, [creator]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <div className="mb-6">
            <p className="label">Links</p>
            <h1 className="display mt-2 text-[26px]">Your links</h1>
          </div>

          {!creator ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">Set up a creator identity to see your links.</p>
              <NextLink href="/settings" className="link-underline text-[12.5px] text-ink-2">
                Go to Settings
              </NextLink>
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          ) : links === null ? (
            <div className="flex h-64 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">Loading…</p>
            </div>
          ) : links.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">No links yet.</p>
              <NextLink href="/products" className="link-underline text-[12.5px] text-ink-2">
                Create one from a product →
              </NextLink>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-line-soft border border-line-soft">
              {links.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LinkRow({ link }: { link: LinkWithProduct }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${API_BASE_URL}/t/${link.hcs_topic_id}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — non-blocking
    }
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] text-ink">{link.product.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-subtle">
          <span>unverified {formatHbar(link.rate_unverified_per_tick)}/tick</span>
          <span>verified {formatHbar(link.rate_verified_per_tick)}/tick</span>
          {link.rate_purchase_bonus > 0 && <span>bonus {formatHbar(link.rate_purchase_bonus)}</span>}
          <span className="text-subtle/70">{timeAgo(link.created_at)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 border border-line-soft px-3 py-1.5 font-mono text-[11.5px] text-ink-2 transition-colors hover:border-line hover:text-ink"
        >
          {copied ? (
            <>
              <Check size={11} strokeWidth={2.5} className="text-accent" /> Copied
            </>
          ) : (
            <>
              <Copy size={11} strokeWidth={1.75} /> Copy link
            </>
          )}
        </button>
        <a
          href={hashscanTopicUrl(link.hcs_topic_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline inline-flex items-center gap-1 text-[11.5px] text-muted"
        >
          HashScan
          <ArrowUpRight size={11} strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
