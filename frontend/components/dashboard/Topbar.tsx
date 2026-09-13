"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { useCreatorIdentity } from "@/lib/identity";

export function Topbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const showSearch = search !== undefined && onSearchChange !== undefined;
  const { creator } = useCreatorIdentity();

  return (
    <header className="flex h-[58px] shrink-0 items-center border-b border-line bg-bg">
      <Link
        href="/"
        className="flex h-full shrink-0 items-center border-r border-line px-6 text-[15px] font-medium tracking-[-0.035em] text-ink lg:w-[220px]"
      >
        NanoAffiliate
      </Link>

      <div className="flex flex-1 items-center gap-2 px-5">
        {showSearch && (
          <>
            <Search size={15} strokeWidth={1.75} className="shrink-0 text-subtle" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              type="text"
              placeholder={searchPlaceholder}
              className="w-full max-w-xs bg-transparent text-[13px] text-ink placeholder:text-subtle focus:outline-none"
            />
          </>
        )}
      </div>

      <div className="flex h-full shrink-0 items-center">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-full items-center border-l border-line px-5 text-ink-2 transition-colors hover:text-ink"
        >
          <Bell size={16} strokeWidth={1.6} />
        </button>
        <div className="flex h-full items-center gap-2 border-l border-line px-5">
          {creator ? (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span className="font-mono text-[12px] text-ink-2">{creator.hedera_account_id}</span>
            </>
          ) : (
            <Link href="/settings" className="link-underline text-[12px] font-medium text-ink-2">
              Set up identity
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
