import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { VideoLoop } from "./ui/VideoLoop";
import { ActivityHeatmap } from "./Charts";

function VideoPanel({
  title,
  src,
}: {
  title: string;
  src: string;
}) {
  return (
    <div className="overflow-hidden border border-line bg-surface transition-transform duration-[600ms] ease-[var(--ease-expo)] hover:-translate-y-0.5">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <p className="label">{title}</p>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="label">Live</span>
        </span>
      </div>
      <VideoLoop src={src} warm className="w-full" />
    </div>
  );
}

export function Analytics() {
  return (
    <section id="how" className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Copy */}
        <div className="lg:col-span-4">
          <Reveal>
            <p className="label">Analytics</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="display mt-7 text-[clamp(1.9rem,3.1vw,2.75rem)]">
              <span className="block text-ink">All your earnings</span>
              <span className="block text-muted">in one place.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-7 max-w-[38ch] text-[15px] leading-[1.65] text-muted">
              Attention seconds, oracle verdicts and settlements as they land.
              Every figure here traces back to a transaction you can open on a
              public explorer.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <a
              href="#start"
              className="link-underline mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"
            >
              View dashboard
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </a>
          </Reveal>
        </div>

        {/* Live captures */}
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
          <Reveal delay={0.1}>
            <VideoPanel title="Earned today" src="earned-today" />
          </Reveal>
          <Reveal delay={0.18}>
            <VideoPanel title="Creator balance" src="creator-balance" />
          </Reveal>
        </div>
      </div>

      {/* Density surface */}
      <Reveal delay={0.12} className="mt-5">
        <div className="border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
            <p className="label">Attention density — last 7 days</p>
            <div className="flex items-center gap-2">
              <span className="label">Low</span>
              <div className="flex gap-[3px]">
                {[0.08, 0.26, 0.46, 0.68, 0.9].map((o) => (
                  <span
                    key={o}
                    className="h-2 w-4"
                    style={{ background: `rgba(17,17,17,${o})` }}
                  />
                ))}
              </div>
              <span className="label">High</span>
            </div>
          </div>
          <div className="px-5 py-6">
            <ActivityHeatmap />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
