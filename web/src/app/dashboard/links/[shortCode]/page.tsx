"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import StatCard from "@/components/StatCard";
import QrModal from "@/components/QrModal";
import LifecycleStatusBadge from "@/components/LifecycleStatusBadge";
import AreaChart from "@/components/charts/AreaChart";
import DonutChart from "@/components/charts/DonutChart";
import BarList from "@/components/charts/BarList";
import { formatLifecycleDate } from "@/lib/linkDates";
import { ApiError, getLinkAnalytics, type LinkAnalytics, type LinkItem } from "@/lib/api";

const BACKEND_UNCONFIGURED_MESSAGE =
  "Server not fully configured yet — add the Firebase service account key to view analytics.";

/** Full, absolute date-time (or a friendly fallback). */
function formatExactDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Strip the protocol for a cleaner short-link display. */
function displayShort(shortUrl: string): string {
  return shortUrl.replace(/^https?:\/\//, "");
}

export default function LinkAnalyticsPage() {
  const params = useParams<{ shortCode: string }>();
  const rawParam = params?.shortCode;
  const shortCode = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const toast = useToast();

  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(copyTimer.current);
  }, []);

  const load = useCallback(async () => {
    if (!shortCode) return;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const result = await getLinkAnalytics(shortCode);
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
        setError(err.status === 503 ? BACKEND_UNCONFIGURED_MESSAGE : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load analytics for this link.");
      }
    } finally {
      setLoading(false);
    }
  }, [shortCode]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const handleCopy = async (link: LinkItem) => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  };

  return (
    <>
      <BackLink />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <Spinner className="h-5 w-5 text-brand-500" />
            Loading analytics…
          </span>
        </div>
      ) : error ? (
        errorStatus === 404 ? (
          <StatePanel
            tone="neutral"
            title="Link not found"
            body="This link doesn’t exist, or it isn’t one of yours."
          >
            <Link
              href="/dashboard"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] brand-gradient px-4 text-sm font-medium text-white transition-all hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Back to links
            </Link>
          </StatePanel>
        ) : errorStatus === 503 ? (
          <StatePanel tone="warning" title="Almost there" body={BACKEND_UNCONFIGURED_MESSAGE} />
        ) : (
          <StatePanel tone="warning" title="Couldn’t load analytics" body={error}>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          </StatePanel>
        )
      ) : data ? (
        <LinkAnalyticsContent
          data={data}
          copied={copied}
          onCopy={() => handleCopy(data.link)}
          onShowQr={() => setQrOpen(true)}
        />
      ) : null}

      {qrOpen && data ? <QrModal link={data.link} onClose={() => setQrOpen(false)} /> : null}
    </>
  );
}

function LinkAnalyticsContent({
  data,
  copied,
  onCopy,
  onShowQr,
}: {
  data: LinkAnalytics;
  copied: boolean;
  onCopy: () => void;
  onShowQr: () => void;
}) {
  const { link, analytics } = data;
  const hasClicks = analytics.total > 0;

  return (
    <>
      {/* Header — glass hero */}
      <section className="animate-fade-up glass-card glass-ring overflow-hidden p-5 sm:p-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate rounded-sm font-mono text-base font-semibold brand-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:text-lg"
              >
                {displayShort(link.shortUrl)}
              </a>
              <LifecycleStatusBadge status={link.status} />
              <button
                type="button"
                onClick={onCopy}
                aria-label={`Copy ${link.shortUrl}`}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                  copied
                    ? "bg-[color:var(--success-soft)] text-success"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {copied ? (
                  <>
                    <CheckIcon /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy
                  </>
                )}
              </button>
            </div>

            <a
              href={link.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block max-w-2xl truncate rounded-sm text-sm text-muted hover:text-muted-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              title={link.originalUrl}
            >
              {link.originalUrl}
            </a>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CursorIcon />
                <span className="font-medium text-muted-strong tabular-nums">{link.clicks}</span>
                {link.clicks === 1 ? "click" : "clicks"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon />
                Created {formatExactDate(link.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon />
                Last click {formatExactDate(link.lastAccessedAt)}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 rounded-[var(--radius)] bg-surface-muted/70 p-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-medium uppercase tracking-wide text-muted">Enabled</dt>
                <dd className="mt-0.5 text-muted-strong">
                  {typeof link.enabled === "boolean" ? (link.enabled ? "Yes" : "No") : link.enabled == null ? "Yes (legacy default)" : "Invalid"}
                </dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-muted">Starts</dt>
                <dd className="mt-0.5 text-muted-strong">{formatLifecycleDate(link.startsAt, "Immediately")}</dd>
              </div>
              <div>
                <dt className="font-medium uppercase tracking-wide text-muted">Expires</dt>
                <dd className="mt-0.5 text-muted-strong">{formatLifecycleDate(link.expiresAt, "Never")}</dd>
              </div>
            </dl>
          </div>

          <div className="shrink-0">
            <Button variant="secondary" size="sm" onClick={onShowQr}>
              <QrIcon />
              Show QR
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="animate-fade-up mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total clicks" value={analytics.total} icon={<CursorGlyph />} />
        <StatCard label="Last 7 days" value={analytics.last7} icon={<CalendarGlyph />} />
        <StatCard label="Last 30 days" value={analytics.last30} icon={<CalendarGlyph />} />
      </section>

      {hasClicks ? (
        <>
          <Panel title="Clicks over time" className="mt-6">
            <AreaChart data={analytics.series} />
          </Panel>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Devices">
              <DonutChart data={analytics.devices} centerLabel={String(analytics.total)} />
            </Panel>
            <Panel title="Browsers">
              <DonutChart data={analytics.browsers} centerLabel={String(analytics.total)} />
            </Panel>
            <Panel title="Top referrers">
              <BarList data={analytics.referrers} emptyLabel="No referrers yet" />
            </Panel>
            <Panel title="Top countries">
              <BarList data={analytics.countries} emptyLabel="No country data yet" />
            </Panel>
          </div>
        </>
      ) : (
        <StatePanel
          tone="neutral"
          title="No clicks yet"
          body="Once people start visiting this link, you’ll see clicks over time, devices, referrers, and more here."
          className="mt-6"
        />
      )}
    </>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`animate-fade-up glass-card glass-hover p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="animate-fade-up mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-strong transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Links
    </Link>
  );
}

function StatePanel({
  title,
  body,
  tone = "neutral",
  className = "",
  children,
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warning";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`animate-fade-up glass-card p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border-strong/70 px-6 py-10 text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            tone === "warning"
              ? "bg-[color:var(--danger-soft)] text-danger"
              : "brand-gradient text-white"
          }`}
        >
          {tone === "warning" ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8.5v5M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 19V5M4 19h16M8 16l3.5-4 3 2.5L20 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}

/* --- Icons ----------------------------------------------------------------- */

function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 3 6 18 2.5-7L20 11.5 5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 14h2v2m4-2v6m-6 0h2m2 0h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
