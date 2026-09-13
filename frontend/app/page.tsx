import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { LinkToTopicSection } from "@/components/LinkToTopicSection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { OracleSection } from "@/components/OracleSection";
import { LedgerSection } from "@/components/LedgerSection";
import { Analytics } from "@/components/Analytics";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { HatchedDivider } from "@/components/ui/HatchedDivider";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1400px] border-line lg:border-x">
      <Navigation />
      <main>
        <Hero />
        <HatchedDivider />
        <LinkToTopicSection />
        <HatchedDivider />
        <FeatureGrid />
        <HatchedDivider />
        <OracleSection />
        <HatchedDivider />
        <LedgerSection />
        <HatchedDivider />
        <Analytics />
        <HatchedDivider />
        <CTA />
        <HatchedDivider />
      </main>
      <Footer />
    </div>
  );
}
