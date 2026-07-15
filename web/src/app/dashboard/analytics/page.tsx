"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import StatCard from "@/components/StatCard";
import Spinner from "@/components/Spinner";
import Button from "@/components/Button";
import Skeleton from "@/components/Skeleton";
import ChartCard from "@/components/analytics/ChartCard";
import AreaChart from "@/components/charts/AreaChart";
import DonutChart from "@/components/charts/DonutChart";
import BarList from "@/components/charts/BarList";
import { ApiError, getOverview, type OverviewAnalytics } from "@/lib/api";

const BACKEND_UNCONFIGURED_MESSAGE =
  "Analytics will appear once the server is fully configured.";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; unconfigured: boolean }
  | { status: "ready"; data: OverviewAnalytics };

/** Compact number formatting for large click/link counts. */
function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await getOverview();
      setState({ status: "ready", data });
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setState({
          status: "error",
          message: BACKEND_UNCONFIGURED_MESSAGE,
          unconfigured: true,
        });
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to load your analytics.";
        setState({ status: "error", message, unconfigured: false });
        toast.error(message);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [user, load]);

  return (
    <>
      <header className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          See how your Ziplinks are performing across time, devices, and places.
        </p>
      </header>

      <div className="mt-8">
        {state.status === "loading" ? (
          <AnalyticsSkeleton />
        ) : state.status === "error" ? (
          <AnalyticsError
            message={state.message}
            unconfigured={state.unconfigured}
            onRetry={load}
          />
        ) : (
          <AnalyticsContent data={state.data} />
        )}
      </div>
    </>
  );
}

function AnalyticsContent({ data }: { data: OverviewAnalytics }) {
  const { totalLinks, totalClicks, topLinks, analytics } = data;

  if (totalClicks === 0) {
    return (
      <>
        <StatRow
          totalLinks={totalLinks}
          totalClicks={totalClicks}
          last7={analytics.last7}
          last30={analytics.last30}
        />
        <div className="mt-6">
          <EmptyState />
        </div>
      </>
    );
  }

  const totalClicksLabel = formatCount(totalClicks);

  return (
    <div className="space-y-6">
      <StatRow
        totalLinks={totalLinks}
        totalClicks={totalClicks}
        last7={analytics.last7}
        last30={analytics.last30}
      />

      <ChartCard
        title="Clicks over time"
        subtitle="Daily clicks across all of your links"
      >
        <AreaChart data={analytics.series} height={200} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Devices" subtitle="Where your clicks come from">
          <DonutChart data={analytics.devices} centerLabel={totalClicksLabel} />
        </ChartCard>

        <ChartCard title="Browsers" subtitle="Top browsers by clicks">
          <DonutChart data={analytics.browsers} centerLabel={totalClicksLabel} />
        </ChartCard>

        <ChartCard title="Top referrers" subtitle="Where visitors are arriving from">
          <BarList data={analytics.referrers} emptyLabel="No referrers yet" />
        </ChartCard>

        <ChartCard title="Top countries" subtitle="Clicks by location">
          <BarList data={analytics.countries} emptyLabel="No locations yet" />
        </ChartCard>
      </div>

      <ChartCard
        title="Top links"
        subtitle="Your most-clicked Ziplinks"
      >
        <TopLinksList links={topLinks} />
      </ChartCard>
    </div>
  );
}

function StatRow({
  totalLinks,
  totalClicks,
  last7,
  last30,
}: {
  totalLinks: number;
  totalClicks: number;
  last7: number;
  last30: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Total links" value={totalLinks} icon={<LinkGlyph />} />
      <StatCard label="Total clicks" value={totalClicks} icon={<CursorGlyph />} />
      <StatCard label="Last 7 days" value={last7} icon={<CalendarGlyph />} />
      <StatCard label="Last 30 days" value={last30} icon={<CalendarGlyph />} />
    </div>
  );
}

function TopLinksList({ links }: { links: OverviewAnalytics["topLinks"] }) {
  if (links.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted">
        No links yet
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {links.map((link, index) => (
        <li key={link.shortCode}>
          <Link
            href={`/dashboard/links/${link.shortCode}`}
            className="group flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-muted-strong tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm font-semibold text-foreground group-hover:text-brand-500">
                /{link.shortCode}
              </span>
              <span className="block truncate text-xs text-muted">
                {link.originalUrl}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold text-foreground tabular-nums">
                {formatCount(link.clicks)}
              </span>
              <span className="block text-xs text-muted">
                {link.clicks === 1 ? "click" : "clicks"}
              </span>
            </span>
            <svg
              className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m9 6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="animate-fade-up glass-card p-5 sm:p-6">
      <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border-strong/70 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full brand-gradient text-white">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 19V5m0 14h16M8 15l3.5-4 3 2.5L20 8"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          No clicks yet
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Share a link to start seeing analytics. Your clicks, devices, and top
          countries will show up here.
        </p>
      </div>
    </div>
  );
}

function AnalyticsError({
  message,
  unconfigured,
  onRetry,
}: {
  message: string;
  unconfigured: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="animate-fade-up glass-card p-5 sm:p-6">
      <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border-strong/70 px-6 py-10 text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            unconfigured
              ? "brand-gradient text-white"
              : "bg-[color:var(--danger-soft)] text-danger"
          }`}
        >
          {unconfigured ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 19V5m0 14h16M8 15l3.5-4 3 2.5L20 8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8.5v5M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          {unconfigured ? "Almost there" : "Couldn't load analytics"}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>
        {!unconfigured ? (
          <div className="mt-5 flex justify-center">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 sm:p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="glass-card p-4 sm:p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-[200px] w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-32 w-full" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center py-2 text-muted">
        <Spinner />
        <span className="ml-2 text-sm">Loading analytics…</span>
      </div>
    </div>
  );
}

function LinkGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 5.6 5.6l-2 2M13.5 17.5l-1 1a4 4 0 0 1-5.6-5.6l2-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CursorGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 3 6 18 2.5-7L20 11.5 5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v3m10-3v3M4 8.5h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
