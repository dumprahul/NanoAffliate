"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Link2,
  Package,
  Settings,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";

const NAV = [
  { label: "Home", href: "#", Icon: Home },
  { label: "Products", href: "/products", Icon: Package },
  { label: "Links", href: "#", Icon: Link2 },
  { label: "Conversions", href: "#", Icon: ArrowLeftRight },
  { label: "Payouts", href: "/payouts", Icon: Wallet },
  { label: "Analytics", href: "#", Icon: BarChart3 },
  { label: "Settings", href: "#", Icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
      <div className="border-b border-line px-6 py-3">
        <p className="label">Creator</p>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map(({ label, href, Icon }) => {
          const active = href !== "#" && pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 border-l-2 px-6 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                active
                  ? "border-l-ink bg-surface text-ink"
                  : "border-l-transparent text-muted hover:bg-surface hover:text-ink-2"
              }`}
            >
              <Icon size={15} strokeWidth={1.6} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line-soft p-5">
        <p className="text-[11.5px] leading-[1.6] text-subtle">
          Need help? Check the docs or reach support.
        </p>
        <Link
          href="#docs"
          className="link-underline mt-2 inline-block text-[11.5px] font-medium text-ink-2"
        >
          Read the docs →
        </Link>
      </div>
    </aside>
  );
}
