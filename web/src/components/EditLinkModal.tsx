"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Button from "@/components/Button";
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    // Focus (and select) the field so edits can start immediately.
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => document.removeEventListener("keydown", handleKey);
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

    setSaving(true);
    try {
      const updated = await updateLink(link.shortCode, trimmed);
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

  const unchanged = url.trim() === link.originalUrl.trim();

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

        <h2 id="edit-modal-title" className="text-base font-semibold text-foreground">
          Edit destination
        </h2>
        <p className="mt-0.5 truncate pr-8 font-mono text-xs text-muted" title={link.shortUrl}>
          {displayShort(link.shortUrl)}
        </p>

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
