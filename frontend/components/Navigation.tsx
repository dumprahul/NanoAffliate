"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Developers", href: "#ledger" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

export function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/92 backdrop-blur-[6px]">
      <div className="flex h-[62px] items-stretch">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex shrink-0 items-center border-r border-line px-5 sm:px-7 text-[15px] font-medium tracking-[-0.035em] text-ink"
        >
          NanoAffiliate
        </Link>

        {/* Desktop links */}
        <nav className="hidden flex-1 items-center gap-8 px-7 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="link-underline text-[13px] font-medium tracking-[-0.01em] text-ink-2 transition-colors duration-300 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Right cluster */}
        <Link
          href="#signin"
          className="hidden shrink-0 items-center border-l border-line px-7 text-[13px] font-medium tracking-[-0.01em] text-ink-2 transition-colors duration-300 hover:text-ink sm:flex"
        >
          Sign in
        </Link>
        <Link
          href="#start"
          className="hidden shrink-0 items-center border-l border-line bg-ink px-7 text-[13px] font-medium tracking-[-0.01em] text-bg transition-colors duration-[450ms] ease-[var(--ease-expo)] hover:bg-ink-2 sm:flex"
        >
          Get Started
        </Link>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex shrink-0 items-center border-l border-line px-5 text-ink lg:hidden"
        >
          {open ? <X size={17} strokeWidth={1.6} /> : <Menu size={17} strokeWidth={1.6} />}
        </button>
      </div>

      {/* Mobile panel — keeps the bordered grid language */}
      {open && (
        <div className="border-t border-line lg:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line-soft px-5 py-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <div className="grid grid-cols-2">
            <Link
              href="#signin"
              onClick={() => setOpen(false)}
              className="border-r border-line px-5 py-3.5 text-center text-[13px] font-medium text-ink-2"
            >
              Sign in
            </Link>
            <Link
              href="#start"
              onClick={() => setOpen(false)}
              className="bg-ink px-5 py-3.5 text-center text-[13px] font-medium text-bg"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
