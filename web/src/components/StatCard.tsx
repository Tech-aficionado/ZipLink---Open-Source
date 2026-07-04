"use client";

import { type ReactNode } from "react";

interface StatCardProps {
  /** Short uppercase label, e.g. "Total links". */
  label: string;
  /** Primary value to feature. */
  value: ReactNode;
  /** Optional secondary line (e.g. a short code or hint). */
  hint?: ReactNode;
  /** Leading glyph. */
  icon?: ReactNode;
}

/**
 * A glass summary tile with a subtle brand glow. Used for the dashboard
 * summary stats (total links, total clicks, top link).
 */
export default function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="glass-card glass-hover animate-fade-up p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] brand-gradient text-white shadow-[0_6px_16px_-6px_rgba(99,91,255,0.8)]">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      </div>
      <div className="mt-3 truncate text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 truncate text-xs text-muted" title={typeof hint === "string" ? hint : undefined}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
