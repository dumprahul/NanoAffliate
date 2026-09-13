import { Reveal } from "./ui/Reveal";
import { IsoStack, IsoNodes, IsoConverge, IsoOrbit } from "./Isometric";

const FEATURES = [
  {
    index: "01",
    label: "Meter",
    title: "Attention, not clicks",
    body: "Every five seconds of genuine engagement is measured and priced. A two-second bounce earns nothing. An eight-minute read earns all of it.",
    Graphic: IsoStack,
  },
  {
    index: "02",
    label: "Verify",
    title: "Bots hit a wall",
    body: "Tab focus, scroll cadence, device integrity and session diversity are scored by a paid trust oracle before a single tinybar moves.",
    Graphic: IsoNodes,
  },
  {
    index: "03",
    label: "Settle",
    title: "Instant settlement",
    body: "Each verified interval fires a real Hedera transfer from the seller's escrow. No batching, no ninety-day wait, no silent clawbacks.",
    Graphic: IsoConverge,
  },
  {
    index: "04",
    label: "Audit",
    title: "Verify it yourself",
    body: "Every link is its own Hedera topic. Paste it into any explorer and read every click, tick and rejection, in order, forever.",
    Graphic: IsoOrbit,
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="grid grid-cols-1 gap-px bg-line-soft md:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((feature, i) => {
        const { Graphic } = feature;
        return (
          <Reveal
            key={feature.index}
            delay={i * 0.08}
            className="group bg-bg px-6 py-9 transition-colors duration-[600ms] ease-[var(--ease-expo)] hover:bg-surface lg:px-7 lg:py-11"
          >
            <p className="label">
              {feature.index} — {feature.label}
            </p>

            <div className="my-9 transition-transform duration-[700ms] ease-[var(--ease-expo)] group-hover:-translate-y-0.5">
              <Graphic />
            </div>

            <h3 className="text-[19px] tracking-[-0.035em] text-ink">
              {feature.title}
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.62] text-muted">
              {feature.body}
            </p>
          </Reveal>
        );
      })}
    </section>
  );
}
