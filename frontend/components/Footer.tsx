import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GithubMark, XMark } from "./ui/SocialIcons";

const COLUMNS = [
  {
    heading: "Product",
    links: ["Features", "Pricing", "Changelog", "Status"],
  },
  {
    heading: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    heading: "Legal",
    links: ["Privacy Policy", "Terms & Conditions", "Cookie Policy"],
  },
];

const SOCIALS = [
  { node: <XMark />, label: "X" },
  { node: <GithubMark />, label: "GitHub" },
  { node: <MessageCircle size={14} strokeWidth={1.6} />, label: "Community" },
];

export function Footer() {
  return (
    <footer>
      <div className="grid grid-cols-1 gap-px bg-line-soft sm:grid-cols-2 lg:grid-cols-12">
        {/* Brand */}
        <div className="bg-bg px-5 py-12 sm:px-8 lg:col-span-3 lg:px-12">
          <p className="text-[15px] font-medium tracking-[-0.035em] text-ink">
            NanoAffiliate
          </p>
          <p className="mt-3 max-w-[30ch] text-[13px] leading-[1.6] text-muted">
            Attention metered by the second, settled on-chain, auditable by
            anyone.
          </p>
          <div className="mt-7 flex items-center gap-2">
            {SOCIALS.map(({ node, label }) => (
              <Link
                key={label}
                href="#"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center border border-line-soft text-ink-2 transition-colors duration-300 hover:border-line hover:bg-surface-2 hover:text-ink"
              >
                {node}
              </Link>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map((column) => (
          <div
            key={column.heading}
            className="bg-bg px-5 py-12 sm:px-8 lg:col-span-3 lg:px-10"
          >
            <p className="label">{column.heading}</p>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link}>
                  <Link
                    href="#"
                    className="link-underline text-[13px] text-ink-2 transition-colors duration-300 hover:text-ink"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col gap-2 border-t border-line px-5 py-5 text-[11.5px] text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© 2026 NanoAffiliate. All rights reserved.</p>
        <p>Settled on Hedera</p>
      </div>
    </footer>
  );
}
