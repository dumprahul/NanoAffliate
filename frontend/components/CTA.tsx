import { ArrowRight } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "./ui/Button";
import { Reveal } from "./ui/Reveal";

export function CTA() {
  return (
    <section id="start" className="grid grid-cols-1 gap-px bg-line-soft lg:grid-cols-12">
      <div className="bg-bg px-5 py-16 sm:px-8 lg:col-span-7 lg:px-12 lg:py-20">
        <Reveal>
          <p className="label">Get started</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="display mt-7 text-[clamp(1.9rem,3.3vw,3rem)]">
            <span className="block text-ink">Start earning</span>
            <span className="block text-muted">per second.</span>
          </h2>
        </Reveal>
      </div>

      <div className="flex flex-col justify-center bg-bg px-5 py-12 sm:px-8 lg:col-span-5 lg:px-12 lg:py-20">
        <Reveal delay={0.12}>
          <p className="max-w-[34ch] text-[15px] leading-[1.65] text-muted">
            Create a link in under a minute. Fund an escrow, share the topic ID,
            and watch attention settle in real time.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryButton href="#start">
              Get Started
              <ArrowRight
                size={15}
                strokeWidth={1.75}
                className="transition-transform duration-[550ms] ease-[var(--ease-expo)] group-hover:translate-x-0.5"
              />
            </PrimaryButton>
            <SecondaryButton href="#docs">Book a demo</SecondaryButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
