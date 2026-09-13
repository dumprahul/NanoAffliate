import { Reveal } from "./ui/Reveal";
import { VideoLoop } from "./ui/VideoLoop";

export function LinkToTopicSection() {
  return (
    <section className="grid grid-cols-1 gap-px bg-line-soft lg:grid-cols-12">
      {/* Capture */}
      <div className="flex items-center bg-bg p-5 sm:p-8 lg:col-span-5 lg:p-10">
        <Reveal className="w-full">
          <div className="overflow-hidden border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10.5px] tracking-[0.02em] text-ink">
                POST /links
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="label">Hedera testnet</span>
              </span>
            </div>
            <VideoLoop src="topic-created" warm className="w-full" />
          </div>
        </Reveal>
      </div>

      {/* Copy */}
      <div className="flex flex-col justify-center bg-bg px-5 py-10 sm:px-8 lg:col-span-7 lg:px-12 lg:py-10">
        <Reveal>
          <p className="label">Link creation</p>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="display mt-6 text-[clamp(1.7rem,2.7vw,2.4rem)]">
            <span className="block text-ink">A link isn&apos;t a redirect.</span>
            <span className="block text-muted">It&apos;s a topic ID.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.65] text-muted">
            The moment a creator picks a product, the backend mints a dedicated
            HCS topic and writes the first message to it — a manifest naming
            the creator, the product and both attention rates. That topic ID
            becomes the link itself: <span className="font-mono text-ink-2">nanoaffiliate.io/t/0.0.6560884</span>.
            No separate database lookup, no translation step — the URL you
            share and the on-chain record are the same identifier.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
