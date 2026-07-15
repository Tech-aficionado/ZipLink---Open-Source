"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import CampaignFields, { EMPTY_UTM } from "@/components/CampaignFields";
import LifecycleStatusBadge, { normalizeLinkStatus } from "@/components/LifecycleStatusBadge";
import { CampaignValidationError, normalizeUtm, parseTagsText, type UtmValues } from "@/lib/campaign";
import { browserTimeZone, formatLifecycleDate, isoToLocalDateTime, localDateTimeToIso } from "@/lib/linkDates";
import { ApiError, updateLink, type LinkItem } from "@/lib/api";

interface EditLinkModalProps {
  link: LinkItem;
  onClose: () => void;
  /** Called with the server's updated link after a successful save. */
  onSaved: (updated: LinkItem) => void;
}

/** Strip the protocol for a cleaner short-link display. */
function displayShort(shortUrl: string): string {
  return shortUrl.replace(/^https?:\/\//, "");
}

/**
 * Accessible modal for editing a link's destination URL. Closes on overlay
 * click and Escape, focuses the input on open, validates http/https client
 * side, and surfaces the server message on {@link ApiError}.
 */
export default function EditLinkModal({ link, onClose, onSaved }: EditLinkModalProps) {
  const [url, setUrl] = useState(link.originalUrl);
  const [enabled, setEnabled] = useState(link.enabled !== false);
  const [startsAt, setStartsAt] = useState(() => isoToLocalDateTime(link.startsAt));
  const [expiresAt, setExpiresAt] = useState(() => isoToLocalDateTime(link.expiresAt));
  const [tagsText, setTagsText] = useState(() => link.tags.join(", "));
  const [utm, setUtm] = useState<UtmValues>(() => ({ ...(link.utm ?? EMPTY_UTM) }));
  const [timeZone, setTimeZone] = useState("local time");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setTimeZone(browserTimeZone()));
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    // Focus (and select) the field so edits can start immediately.
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = url.trim();
    setError(null);

    if (!trimmed) {
      setError("Please enter a destination URL.");
      return;
    }
    let normalized: URL;
    try {
      normalized = new URL(trimmed);
    } catch {
      setError("Enter a valid URL, including http:// or https://.");
      return;
    }
    if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
      setError("Only http and https URLs are supported.");
      return;
    }
    if (trimmed.length > 2048 || normalized.username || normalized.password || /[\u0000-\u001F\u007F]/.test(trimmed)) {
      setError("Enter a safe URL without credentials or control characters (maximum 2048 characters).");
      return;
    }

    const startsAtIso = localDateTimeToIso(startsAt);
    const expiresAtIso = localDateTimeToIso(expiresAt);
    if ((startsAt && !startsAtIso) || (expiresAt && !expiresAtIso)) {
      setError("Enter valid start and expiry dates.");
      return;
    }
    if (
      startsAtIso &&
      expiresAtIso &&
      new Date(startsAtIso).getTime() >= new Date(expiresAtIso).getTime()
    ) {
      setError("Start time must be before expiry time.");
      return;
    }

    let tags: string[];
    let normalizedUtm;
    try {
      tags = parseTagsText(tagsText);
      normalizedUtm = normalizeUtm(utm);
    } catch (campaignError) {
      setError(
        campaignError instanceof CampaignValidationError
          ? campaignError.message
          : "Check the campaign fields and try again.",
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updateLink(link.shortCode, {
        originalUrl: trimmed,
        enabled,
        startsAt: startsAtIso,
        expiresAt: expiresAtIso,
        tags,
        ...(normalizedUtm || link.utm ? { utm: normalizedUtm } : {}),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update that link.");
      }
      setSaving(false);
    }
  };

  const unchanged =
    url.trim() === link.originalUrl.trim() &&
    enabled === (link.enabled !== false) &&
    startsAt === isoToLocalDateTime(link.startsAt) &&
    expiresAt === isoToLocalDateTime(link.expiresAt) &&
    tagsText === link.tags.join(", ") &&
    JSON.stringify(utm) === JSON.stringify(link.utm ?? EMPTY_UTM);
  const status = normalizeLinkStatus(link.status);
  const hasNonDefaultControls = status === "error" || link.enabled === false || Boolean(link.startsAt) || Boolean(link.expiresAt);
  const controlsSummary =
    status === "error"
      ? "Invalid lifecycle controls need review."
      : [
          link.enabled === false ? "Paused" : null,
          link.startsAt ? `Starts ${formatLifecycleDate(link.startsAt, "not set")}` : null,
          link.expiresAt ? `Expires ${formatLifecycleDate(link.expiresAt, "not set")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="border-gradient glass glow-ring animate-fade-up relative w-full max-w-md rounded-[var(--radius-lg)] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-wrap items-center gap-2 pr-8">
          <h2 id="edit-modal-title" className="text-base font-semibold text-foreground">
            Edit link
          </h2>
          <LifecycleStatusBadge status={link.status} />
        </div>
        <p className="mt-0.5 truncate pr-8 font-mono text-xs text-muted" title={link.shortUrl}>
          {displayShort(link.shortUrl)}
        </p>
        {hasNonDefaultControls ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2 text-xs text-muted-strong">
            <span className="font-semibold">Current controls:</span> {controlsSummary}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5" noValidate>
          <label htmlFor="edit-url" className="text-xs font-medium text-muted-strong">
            Destination URL
          </label>
          <input
            ref={inputRef}
            id="edit-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/new-destination"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "edit-url-error" : undefined}
            className="zip-field mt-1.5"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <details className="mt-4 rounded-[var(--radius)] border border-border bg-surface/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
              Advanced controls
            </summary>
            <div className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-foreground">Enable link</span>
                  <span className="block text-xs text-muted">Turn this off to pause redirects.</span>
                </span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                />
              </label>
              <label className="block text-xs font-medium text-muted-strong">
                Starts at (optional)
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="zip-field mt-1.5"
                />
              </label>
              <label className="block text-xs font-medium text-muted-strong">
                Expires at (optional)
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="zip-field mt-1.5"
                />
              </label>
              <p className="text-xs text-muted">Times use your browser timezone: {timeZone}.</p>
              <CampaignFields
                idPrefix="edit-campaign"
                originalUrl={url}
                tagsText={tagsText}
                onTagsChange={setTagsText}
                utm={utm}
                onUtmChange={setUtm}
              />
            </div>
          </details>

          {error ? (
            <p
              id="edit-url-error"
              role="alert"
              className="mt-3 rounded-[var(--radius)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              disabled={unchanged}
              className="sm:w-auto"
            >
              {saving ? "Saving" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
