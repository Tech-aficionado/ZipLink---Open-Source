"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import type { LinkItem } from "@/lib/api";

interface LinkCardProps {
  link: LinkItem;
  onDelete: (shortCode: string) => Promise<void> | void;
  onShowQr: (link: LinkItem) => void;
}

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

export default function LinkCard({ link, onDelete, onShowQr }: LinkCardProps) {
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
    } catch {
      // Clipboard access can be denied; keep the UI calm.
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-sm font-semibold brand-text hover:underline"
            >
              {displayShort(link.shortUrl)}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy ${link.shortUrl}`}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
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
            className="mt-1 block truncate text-sm text-muted hover:text-muted-strong"
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

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onShowQr(link)}
            aria-label={`Show QR code for ${link.shortUrl}`}
          >
            <QrIcon /> QR
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDeleteClick}
            aria-label={
              confirming ? `Confirm delete ${link.shortUrl}` : `Delete ${link.shortUrl}`
            }
          >
            {confirming ? "Confirm?" : <TrashIcon />}
          </Button>
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
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 14h2v2m4-2v6m-6 0h2m2 0h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
