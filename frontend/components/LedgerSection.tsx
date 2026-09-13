import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./ui/Reveal";

type Entry = {
  seq: string;
  type: string;
  detail: string;
  amount?: string;
  rejected?: boolean;
};

const ENTRIES: Entry[] = [
  { seq: "01", type: "link_created", detail: "manifest committed" },
  { seq: "02", type: "click", detail: "session opened" },
  { seq: "03", type: "tick", detail: "pay_full · score 0.86", amount: "+0.0010" },
  { seq: "04", type: "tick", detail: "pay_full · score 0.84", amount: "+0.0010" },
  { seq: "05", type: "tick", detail: "pay_reduced · score 0.41", amount: "+0.0005" },
  {
    seq: "06",
    type: "tick_rejected",
    detail: "below threshold · score 0.19",
    rejected: true,
  },
  { seq: "07", type: "tick", detail: "pay_full · score 0.88", amount: "+0.0010" },
  { seq: "08", type: "session_end", detail: "7 ticks · 00:35 attention" },
];

export function LedgerSection() {
  return (
    <section id="ledger" className="grid grid-cols-1 gap-px bg-line-soft lg:grid-cols-12">
      {/* Copy */}
      <div className="bg-bg px-5 py-16 sm:px-8 lg:col-span-5 lg:px-12 lg:py-20">
        <Reveal>
          <p className="label">Public ledger</p>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="display mt-7 text-[clamp(1.9rem,3.1vw,2.75rem)]">
            <span className="block text-ink">Every link is</span>
            <span className="block text-muted">its own ledger.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-7 max-w-[42ch] text-[15px] leading-[1.65] text-muted">
            The identifier you share as a link is the identifier anyone can paste
            into a Hedera explorer. Every click, every scored interval, every
            rejection and every payout is written there in order — including the
            ones that didn&apos;t pay.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.65] text-muted">
            Nobody has to take our word for why a payout happened. The record
            isn&apos;t ours to edit.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <a
            href="#docs"
            className="link-underline mt-9 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"
          >
            Open a live topic
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </a>
        </Reveal>
      </div>

      {/* Log surface */}
      <div className="bg-bg p-5 sm:p-8 lg:col-span-7 lg:p-12">
        <Reveal delay={0.12}>
          <div className="border border-line bg-surface">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-mono text-[11px] tracking-[0.02em] text-ink">
                TOPIC 0.0.10481821
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="label">Hedera testnet</span>
              </span>
            </div>

            {/* Entries */}
            <div className="divide-y divide-line-soft">
              {ENTRIES.map((entry) => (
                <div
                  key={entry.seq}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-[11px] font-mono text-[11.5px] transition-colors duration-300 hover:bg-surface-2 sm:gap-5"
                >
                  <span className="tnum text-subtle">{entry.seq}</span>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className={
                        entry.rejected
                          ? "shrink-0 text-muted"
                          : "shrink-0 text-ink"
                      }
                    >
                      {entry.type}
                    </span>
                    <span className="truncate text-subtle">{entry.detail}</span>
                  </span>
                  <span
                    className={`tnum shrink-0 ${
                      entry.amount ? "text-ink" : "text-subtle"
                    }`}
                  >
                    {entry.amount ? `${entry.amount} ℏ` : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Panel footer */}
            <div className="border-t border-line px-4 py-3">
              <p className="text-[11px] leading-[1.5] text-subtle">
                Readable by anyone. No API key, no account, no permission.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
