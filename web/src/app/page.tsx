"use client";

import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import StatStrip from "@/components/landing/StatStrip";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import CtaBand from "@/components/landing/CtaBand";
import Footer from "@/components/landing/Footer";

/**
 * Public marketing landing page for Ziplink. Renders for everyone and never
 * auto-redirects authed users — the nav/CTAs adapt to auth state instead.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <StatStrip />
        <FeatureGrid />
        <HowItWorks />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
