"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import TransformDemo from "@/components/landing/TransformDemo";
import LinkboltMark from "@/components/LinkboltMark";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

/** Illustrative long-URL → short-link pairs the hero visual cycles through. */
const DEMO_PAIRS: readonly { longUrl: string; alias: string }[] = [
  {
    longUrl:
      "https://example.com/articles/2025/futuristic-url-shortening?ref=launch&utm=hero",
    alias: "launch",
  },
  {
    longUrl:
      "https://shop.example.com/collections/summer/products/neon-runner?variant=42&utm_source=ig",
    alias: "neon",
  },
  {
    longUrl:
      "https://docs.example.com/guides/getting-started/quickstart?section=install&v=2",
    alias: "docs",
  },
  {
    longUrl:
      "https://open.example.fm/playlist/late-night-coding-mix-2025?si=abc123&t=0",
    alias: "mix",
  },
];

/**
 * Hero: balanced gradient headline, subcopy, primary + secondary CTAs, and the
 * live transform visual. The visual auto-rotates through a few example pairs so
 * the hero feels dynamic. Backed by a grid + glow + orb accent layer.
 */
export default function Hero() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [pairIndex, setPairIndex] = useState(0);

  const isAuthed = !loading && Boolean(user);
  const primaryHref = isAuthed ? "/dashboard" : "/login";

  useEffect(() => {
    // Decorative auto-rotation; skip entirely when the user opts out of motion.
    if (reduced) return;
    const id = window.setInterval(() => {
      setPairIndex((current) => (current + 1) % DEMO_PAIRS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  const pair = DEMO_PAIRS[pairIndex];

  return (
    <section className="glow relative overflow-hidden">
      {/* Background layers */}
      <div
        className="grid-bg grid-fade pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="orb brand-gradient left-[-6rem] top-[-4rem] h-72 w-72"
        aria-hidden="true"
      />
      <div
        className="orb right-[-5rem] top-24 h-64 w-64 bg-[color:var(--cyan)]"
        aria-hidden="true"
      />
      {/* Oversized faint Linkbolt watermark */}
      <LinkboltMark
        size={620}
        strokeWidth={0.55}
        className="animate-float pointer-events-none absolute right-[-9rem] top-1/2 hidden -translate-y-1/2 text-brand-400 opacity-[0.07] lg:block"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-8">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs font-medium text-muted-strong backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]" />
            Now with custom aliases &amp; QR codes
          </span>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Shorten links at{" "}
            <span className="brand-text">light speed.</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-strong sm:text-lg">
            Ziplink turns sprawling URLs into clean, memorable short links in a
            tap. Custom aliases, instant redirects, QR codes, and click
            analytics — wrapped in a fast, futuristic interface.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => router.push(primaryHref)}
            >
              Get started — it&apos;s free
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See features
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted">
            Sign in with Google · no credit card · unlimited free links
          </p>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-end">
          <div
            className="animate-float w-full max-w-md min-w-0"
            aria-hidden="true"
          >
            <TransformDemo
              key={pairIndex}
              longUrl={pair.longUrl}
              alias={pair.alias}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
