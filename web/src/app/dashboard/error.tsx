"use client";

import { useEffect } from "react";
import Button from "@/components/Button";

/**
 * Dashboard-scoped error boundary. Renders inside the dashboard shell (nav
 * preserved) when a dashboard page throws, so the user can recover in place.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] Page error:", error);
  }, [error]);

  return (
    <div className="glass-card glass-ring animate-fade-up relative overflow-hidden p-8 text-center">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
      <h1 className="text-lg font-semibold text-foreground">This section hit a snag</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Something went wrong loading this page. Your links are safe — try again.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[0.7rem] text-muted">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
