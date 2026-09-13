import { ArrowRight } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { VideoLoop } from "./ui/VideoLoop";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Live protocol-flow capture bleeds to the right edge, behind the type.
          object-contain shows every node/label with no cropping; blend
          dissolves the capture's near-white background via mix-blend-multiply
          so only the dark line art reads, sitting directly on the page
          rather than inside a pasted rectangle. A gentle left fade keeps the
          nearest node from crowding the text column. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] md:block">
        <VideoLoop
          src="hero-flow"
          blend
          maskFadeLeft="12%"
          className="h-full w-full object-contain object-right"
        />
      </div>

      <div className="relative grid grid-cols-12">
        <div className="col-span-12 px-5 py-20 sm:px-8 md:col-span-7 md:py-28 lg:px-12 lg:py-32">
          <Reveal onMount>
            <p className="label">Built for creators</p>
          </Reveal>

          <Reveal onMount delay={0.08}>
            <h1 className="display mt-7 text-[clamp(2rem,5.2vw,4.6rem)]">
              <span className="block text-ink">Paid by the second,</span>
              <span className="block text-muted">not by the month.</span>
            </h1>
          </Reveal>

          <Reveal onMount delay={0.16}>
            <p className="mt-8 max-w-[46ch] text-[15px] leading-[1.65] text-muted">
              NanoAffiliate meters every five seconds of genuine human attention
              your links earn — priced by a paid trust oracle, settled instantly
              on Hedera, and verifiable by anyone holding the link.
            </p>
          </Reveal>

          <Reveal onMount delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <PrimaryButton href="#start">
                Get Started
                <ArrowRight
                  size={15}
                  strokeWidth={1.75}
                  className="transition-transform duration-[550ms] ease-[var(--ease-expo)] group-hover:translate-x-0.5"
                />
              </PrimaryButton>
              <SecondaryButton href="#docs">Read the docs</SecondaryButton>
            </div>
          </Reveal>
        </div>

        {/* Mobile capture */}
        <div className="col-span-12 h-[240px] overflow-hidden border-t border-line-soft md:hidden">
          <VideoLoop src="hero-flow" blend className="h-full w-full object-contain" />
        </div>
      </div>
    </section>
  );
}
