"use client";

import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import StatStrip from "@/components/landing/StatStrip";
import Highlights from "@/components/landing/Highlights";
import FeatureGrid from "@/components/landing/FeatureGrid";
import UseCases from "@/components/landing/UseCases";
import HowItWorks from "@/components/landing/HowItWorks";
import Faq from "@/components/landing/Faq";
import CtaBand from "@/components/landing/CtaBand";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/landing/Reveal";

/**
 * Public marketing landing page for Ziplink. Renders for everyone and never
 * auto-redirects authed users — the nav/CTAs adapt to auth state instead.
 *
 * The hero paints immediately; every section below it fades/slides in on
 * scroll via <Reveal>, which respects `prefers-reduced-motion`.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <Reveal>
          <StatStrip />
        </Reveal>
        <Reveal delay={40}>
          <Highlights />
        </Reveal>
        <Reveal delay={40}>
          <FeatureGrid />
        </Reveal>
        <Reveal delay={40}>
          <UseCases />
        </Reveal>
        <Reveal delay={40}>
          <HowItWorks />
        </Reveal>
        <Reveal delay={40}>
          <Faq />
        </Reveal>
        <Reveal delay={40}>
          <CtaBand />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
