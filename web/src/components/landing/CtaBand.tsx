"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

/**
 * Final call-to-action band on a brand gradient panel. The CTA adapts to auth
 * state, sending signed-in users straight to the dashboard.
 */
export default function CtaBand() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAuthed = !loading && Boolean(user);
  const ctaHref = isAuthed ? "/dashboard" : "/login";
  const ctaLabel = isAuthed ? "Open your dashboard" : "Get started — it's free";

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="brand-gradient glow-ring relative overflow-hidden rounded-[var(--radius-xl)] px-6 py-14 text-center sm:px-12 sm:py-16">
          {/* Subtle grid texture over the gradient */}
          <div
            className="grid-bg pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to shorten your first link?
            </h2>
            <p className="mt-4 text-pretty text-base text-white/85 sm:text-lg">
              Join Ziplink and turn long, messy URLs into fast, trackable short
              links today.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => router.push(ctaHref)}
              >
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
