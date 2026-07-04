"use client";

import { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Button from "@/components/Button";

/**
 * Route-segment error boundary. Catches render/runtime errors thrown anywhere
 * in the app segment (below the root layout) and shows a branded recovery
 * screen with a reset action instead of a blank crash.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Route error:", error);
  }, [error]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="app-aurora" aria-hidden="true" />
      <div className="glass-card glass-ring relative z-10 w-full max-w-md overflow-hidden p-8">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
        <div className="flex justify-center">
          <Logo withWordmark={false} size={44} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          An unexpected error interrupted this page. You can try again, or head back home.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[0.7rem] text-muted">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:border-brand-400 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
