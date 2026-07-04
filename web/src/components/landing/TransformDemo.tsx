"use client";

import { useEffect, useState } from "react";

interface TransformDemoProps {
  className?: string;
  /** The long source URL shown in the "before" row. */
  longUrl?: string;
  /** The short alias/code shown after `zl.ash-labs.tech/`. */
  alias?: string;
}

/**
 * A glass, gradient-bordered card showing a long URL collapsing into a short
 * zl.ash-labs.tech/… code, with a small QR/scan flourish. Decorative — the
 * values are illustrative and not interactive. The Hero rotates the props to
 * make it feel alive; a subtle opacity fade smooths each swap.
 */
export default function TransformDemo({
  className = "",
  longUrl = "https://example.com/articles/2025/futuristic-url-shortening?ref=launch&utm=hero",
  alias = "launch",
}: TransformDemoProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className={`border-gradient glow-ring w-full max-w-md ${className}`}
      style={{ opacity: entered ? 1 : 0, transition: "opacity 500ms ease" }}
    >
      <div className="rounded-[inherit] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
            <span className="animate-pulse-glow h-2 w-2 rounded-full bg-[color:var(--cyan)] shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
            live shortener
          </span>
          <span className="rounded-full border border-border-strong px-2.5 py-1 text-[0.7rem] font-medium text-muted-strong">
            301 · ready
          </span>
        </div>

        {/* Long source URL */}
        <div className="mt-5">
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
            Long URL
          </p>
          <div className="truncate rounded-[var(--radius)] border border-border-strong bg-surface-muted px-3.5 py-2.5 font-mono text-xs text-muted-strong">
            {longUrl}
          </div>
        </div>

        {/* Arrow */}
        <div className="my-3 flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-brand-400">
            <path
              d="M12 4v16m0 0 5.5-5.5M12 20l-5.5-5.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Short result + QR flourish */}
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-brand-400/40 bg-surface p-3.5">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
              Short link
            </p>
            <p className="truncate font-mono text-sm font-semibold">
              <span className="text-muted-strong">zl.ash-labs.tech/</span>
              <span className="brand-text">{alias}</span>
            </p>
          </div>
          <QrFlourish />
        </div>
      </div>
    </div>
  );
}

/** Small decorative QR-style tile. */
function QrFlourish() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1,
    1, 0, 1, 0, 0, 1, 1,
    1, 1, 1, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0,
    1, 1, 0, 1, 0, 1, 1,
    1, 0, 1, 0, 1, 0, 0,
    1, 1, 1, 0, 1, 1, 1,
  ];
  return (
    <div
      className="grid h-14 w-14 shrink-0 grid-cols-7 gap-px rounded-[var(--radius-sm)] border border-border-strong bg-surface-muted p-1.5"
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span
          key={i}
          className={`rounded-[1px] ${on ? "bg-foreground" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
