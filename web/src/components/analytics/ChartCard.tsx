"use client";

import { type ReactNode } from "react";

interface ChartCardProps {
  /** Card heading, e.g. "Devices". */
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: ReactNode;
  /** Optional trailing element (badge, control) shown on the header row. */
  action?: ReactNode;
  /** Card body. */
  children: ReactNode;
  /** Extra classes to tune spanning inside a grid. */
  className?: string;
}

/**
 * A titled glass card used to wrap each analytics section (charts, lists).
 * Keeps the page tidy and consistent with the Ziplink design system.
 */
export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={`glass-card animate-fade-up p-4 sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-strong">
            {title}
          </h3>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
