"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import type { LinkItem } from "@/lib/api";

interface LinkCardProps {
  link: LinkItem;
  onDelete: (shortCode: string) => Promise<void> | void;
  onShowQr: (link: LinkItem) => void;
  onEdit: (link: LinkItem) => void;
  /** Fired after a value is copied to the clipboard. */
  onCopied?: () => void;
  /** Fired if copying to the clipboard fails. */
  onCopyError?: () => void;
  /** Whether this card is currently selected for a bulk action. */
  selected?: boolean;
  /**
   * Toggle selection for this link. When provided, the selection checkbox is
   * shown; when omitted, the card renders without any selection affordance.
   */
  onToggleSelect?: (shortCode: string) => void;
}

// Which value was most recently copied, for per-button feedback.
type CopiedField = "short" | "original";

// Shared styles for the compact, ≥40px action buttons.
const ACTION_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const ACTION_NEUTRAL =
  "border-border-strong bg-surface text-muted-strong hover:border-brand-400 hover:bg-surface-muted hover:text-foreground focus-visible:outline-brand-500";
const ACTION_DANGER =
  "border-transparent text-danger hover:border-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] focus-visible:outline-[color:var(--danger)]";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Full, absolute date-time for the details panel (or a friendly fallback). */
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

export default function LinkCard({
  link,
  onDelete,
  onShowQr,
  onEdit,
  onCopied,
  onCopyError,
  selected = false,
  onToggleSelect,
}: LinkCardProps) {
  const [copiedField, setCopiedField] = useState<CopiedField | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const confirmTimer = useRef<number | undefined>(undefined);
  const detailsId = useId();

  const selectable = typeof onToggleSelect === "function";

  useEffect(() => {
    return () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(confirmTimer.current);
    };
  }, []);

  const copyValue = async (value: string, field: CopiedField) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedField(null), 2000);
      onCopied?.();
    } catch {
      // Clipboard access can be denied; surface it quietly via the caller.
      onCopyError?.();
    }
  };

  const handleDeleteClick = async () => {
    if (!confirming) {
      setConfirming(true);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    window.clearTimeout(confirmTimer.current);
    setDeleting(true);
    try {
      await onDelete(link.shortCode);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={`group glass-card glass-hover animate-fade-up p-4 sm:p-5 ${
        selected ? "!border-brand-400/70 glow-ring" : ""
      }`}
    >
      <div className="flex gap-3">
        {selectable ? (
          <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center">
            <span className="sr-only">
              {selected ? "Deselect" : "Select"} {link.shortUrl}
            </span>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(link.shortCode)}
              className="h-[18px] w-[18px] cursor-pointer rounded-[6px] border-border-strong accent-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            />
          </label>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-sm font-mono text-sm font-semibold brand-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {displayShort(link.shortUrl)}
              </a>
              <button
                type="button"
                onClick={() => copyValue(link.shortUrl, "short")}
                aria-label={`Copy ${link.shortUrl}`}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                  copiedField === "short"
                    ? "bg-[color:var(--success-soft)] text-success"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {copiedField === "short" ? (
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
              className="mt-1 block truncate rounded-sm text-sm text-muted hover:text-muted-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              title={link.originalUrl}
            >
              {link.originalUrl}
            </a>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CursorIcon />
                <span className="font-medium text-muted-strong tabular-nums">
                  {link.clicks}
                </span>
                {link.clicks === 1 ? "click" : "clicks"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon />
                {formatDate(link.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-controls={detailsId}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <ChevronIcon open={expanded} />
                {expanded ? "Hide details" : "Details"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
            <Link
              href={`/dashboard/links/${link.shortCode}`}
              aria-label={`View analytics for ${link.shortUrl}`}
              className={`${ACTION_BASE} ${ACTION_NEUTRAL} w-10`}
            >
              <AnalyticsIcon />
            </Link>
            <button
              type="button"
              onClick={() => onShowQr(link)}
              aria-label={`Show QR code for ${link.shortUrl}`}
              className={`${ACTION_BASE} ${ACTION_NEUTRAL} w-10`}
            >
              <QrIcon />
            </button>
            <button
              type="button"
              onClick={() => onEdit(link)}
              aria-label={`Edit destination for ${link.shortUrl}`}
              className={`${ACTION_BASE} ${ACTION_NEUTRAL} w-10`}
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={deleting}
              aria-label={
                confirming
                  ? `Confirm delete ${link.shortUrl}`
                  : `Delete ${link.shortUrl}`
              }
              className={`${ACTION_BASE} ${ACTION_DANGER} ${confirming ? "px-3" : "w-10"}`}
            >
              {deleting ? (
                <Spinner className="h-4 w-4" />
              ) : confirming ? (
                "Confirm?"
              ) : (
                <TrashIcon />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div
          id={detailsId}
          className="animate-fade-up mt-4 border-t border-border pt-4"
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow label="Short link">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
                  {link.shortUrl}
                </span>
                <DetailCopyButton
                  copied={copiedField === "short"}
                  onClick={() => copyValue(link.shortUrl, "short")}
                  label={`Copy short link ${link.shortUrl}`}
                />
              </div>
            </DetailRow>

            <DetailRow label="Short code">
              <span className="font-mono text-sm text-foreground">
                {link.shortCode}
              </span>
            </DetailRow>

            <DetailRow label="Original URL" full>
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 break-all text-sm text-foreground">
                  {link.originalUrl}
                </span>
                <DetailCopyButton
                  copied={copiedField === "original"}
                  onClick={() => copyValue(link.originalUrl, "original")}
                  label="Copy original URL"
                />
              </div>
            </DetailRow>

            <DetailRow label="Created">
              <span className="text-sm text-foreground">
                {formatExactDate(link.createdAt)}
              </span>
            </DetailRow>

            <DetailRow label="Last accessed">
              <span className="text-sm text-foreground">
                {formatExactDate(link.lastAccessedAt)}
              </span>
            </DetailRow>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function DetailCopyButton({
  copied,
  onClick,
  label,
}: {
  copied: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
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
  );
}

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 3 6 18 2.5-7L20 11.5 5 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
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

function AnalyticsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5M4 19h16M8 16l3.5-4 3 2.5L20 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

function EditIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.83-2.83L5 17.5V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14 8 2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0-.6 11a2 2 0 0 1-2 1.9H9.6a2 2 0 0 1-2-1.9L7 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
