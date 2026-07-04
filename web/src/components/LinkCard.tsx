"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import type { LinkItem } from "@/lib/api";

interface LinkCardProps {
  link: LinkItem;
  onDelete: (shortCode: string) => Promise<void> | void;
  onShowQr: (link: LinkItem) => void;
  onEdit: (link: LinkItem) => void;
  /** Fired after the short link is copied to the clipboard. */
  onCopied?: () => void;
  /** Fired if copying to the clipboard fails. */
  onCopyError?: () => void;
}

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
}: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const confirmTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(confirmTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
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
    <div className="group glass animate-fade-up rounded-[var(--radius-lg)] border border-border p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-px hover:border-brand-400/60 hover:glow-ring sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
              onClick={handleCopy}
              aria-label={`Copy ${link.shortUrl}`}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
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
              confirming ? `Confirm delete ${link.shortUrl}` : `Delete ${link.shortUrl}`
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
