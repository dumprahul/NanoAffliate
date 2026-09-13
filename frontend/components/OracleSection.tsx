import { Reveal } from "./ui/Reveal";
import { VideoLoop } from "./ui/VideoLoop";

export function OracleSection() {
  return (
    <section className="grid grid-cols-1 gap-px bg-line-soft lg:grid-cols-12">
      {/* Copy */}
      <div className="bg-bg px-5 py-16 sm:px-8 lg:col-span-4 lg:px-12 lg:py-20">
        <Reveal>
          <p className="label">Attention trust oracle</p>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="display mt-7 text-[clamp(1.9rem,3.1vw,2.75rem)]">
            <span className="block text-ink">Six checks,</span>
            <span className="block text-muted">every five seconds.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-7 max-w-[40ch] text-[15px] leading-[1.65] text-muted">
            Before a single tinybar moves, the oracle scores tab focus,
            interaction recency, scroll naturalness, device fingerprint,
            session diversity and cumulative trust — a weighted verdict, paid
            for over x402, logged either way.
          </p>
        </Reveal>

        <Reveal delay={0.18} className="mt-9 grid grid-cols-2 gap-px bg-line-soft border border-line-soft">
          {[
            ["01", "Tab / liveness"],
            ["02", "Interaction recency"],
            ["03", "Scroll naturalness"],
            ["04", "Device fingerprint"],
            ["05", "Session diversity"],
            ["06", "Cumulative trust"],
          ].map(([n, label]) => (
            <div key={n} className="bg-bg px-3.5 py-3">
              <span className="font-mono text-[10px] text-subtle">{n}</span>
              <p className="mt-1 text-[12px] leading-tight text-ink-2">{label}</p>
            </div>
          ))}
        </Reveal>
      </div>

      {/* Live capture */}
      <div className="flex items-center bg-bg p-5 sm:p-8 lg:col-span-8 lg:p-12">
        <Reveal delay={0.14} className="w-full">
          <div className="overflow-hidden border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10.5px] tracking-[0.02em] text-ink">
                verify-attention
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="label">x402 gated</span>
              </span>
            </div>
            <VideoLoop src="oracle-checks" warm className="w-full" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
