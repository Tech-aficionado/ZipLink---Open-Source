"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import BrandSplash from "@/components/BrandSplash";
import Logo from "@/components/Logo";
import GoogleIcon from "@/components/GoogleIcon";
import ThemeToggle from "@/components/ThemeToggle";

function messageForError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "The Google sign-in window was closed before finishing.";
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Allow popups and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again in a moment.";
      case "auth/unauthorized-domain":
        return "This domain isn't authorized for sign-in yet.";
      default:
        return error.message.replace("Firebase: ", "");
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(messageForError(err));
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return <BrandSplash label="Getting things ready…" />;
  }

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-background">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 grid-bg grid-fade" aria-hidden="true" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </header>

      {/* Hero */}
      <main className="glow relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted-strong backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Fast, private URL shortening
        </span>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Shorten links <span className="brand-text">in a zip.</span>
        </h1>

        <p className="animate-fade-up mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Turn long, messy URLs into clean, shareable links and track every
          click. Sign in with Google — no passwords, no clutter.
        </p>

        {/* URL transform demo */}
        <div className="animate-fade-up mt-10 w-full max-w-xl">
          <div className="rounded-2xl border border-border bg-surface/80 p-2 shadow-[var(--shadow-lg)] backdrop-blur">
            <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-left">
              <span className="min-w-0 truncate font-mono text-sm text-muted">
                https://example.com/articles/2026/very-long-slug?ref=share
              </span>
            </div>
            <div className="flex items-center justify-center py-2 text-muted">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-left dark:border-brand-800 dark:bg-[color:var(--surface-muted)]">
              <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-300">
                zl.ash-labs.tech/9xK2mQ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted-strong">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> live
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-up mt-8 w-full max-w-sm">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleGoogle}
            loading={submitting}
          >
            {!submitting ? <GoogleIcon className="h-5 w-5" /> : null}
            Continue with Google
          </Button>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-muted">
            We only use your Google account to sign you in. Your links stay private to you.
          </p>
        </div>
      </main>
    </div>
  );
}
