"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import BrandSplash from "@/components/BrandSplash";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import LinkCard from "@/components/LinkCard";
import { LinkCardSkeleton } from "@/components/Skeleton";
import QrModal from "@/components/QrModal";
import StatCard from "@/components/StatCard";
import SearchInput from "@/components/SearchInput";
import {
  ALIAS_PATTERN,
  ApiError,
  baseHostPrefix,
  createLink,
  deleteLink,
  listLinks,
  type LinkItem,
} from "@/lib/api";

const ALIAS_HELP = "optional — 3–32 letters, numbers, - or _";

const BACKEND_UNCONFIGURED_MESSAGE =
  "Server not fully configured yet — add the Firebase service account key to start creating links.";

export default function DashboardPage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);

  const aliasPrefix = baseHostPrefix();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    return () => window.clearTimeout(copyTimer.current);
  }, []);

  const loadLinks = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setBackendUnavailable(false);
    try {
      const items = await listLinks();
      setLinks(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setBackendUnavailable(true);
      } else if (err instanceof Error) {
        setListError(err.message);
      } else {
        setListError("Failed to load your links.");
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadLinks();
  }, [user, loadLinks]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = url.trim();
    setFormError(null);

    if (!trimmed) {
      setFormError("Please enter a URL to shorten.");
      return;
    }
    let normalized: URL;
    try {
      normalized = new URL(trimmed);
    } catch {
      setFormError("Enter a valid URL, including http:// or https://.");
      return;
    }
    if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
      setFormError("Only http and https URLs are supported.");
      return;
    }

    const trimmedAlias = alias.trim();
    if (trimmedAlias && !ALIAS_PATTERN.test(trimmedAlias)) {
      setFormError("Alias must be 3–32 characters: letters, numbers, - or _.");
      return;
    }

    setCreating(true);
    try {
      const created = await createLink(trimmed, trimmedAlias || undefined);
      const newLink: LinkItem = {
        shortCode: created.shortCode,
        originalUrl: created.originalUrl,
        shortUrl: created.shortUrl,
        clicks: created.clicks,
        createdAt: created.createdAt,
        lastAccessedAt: null,
      };
      setLinks((prev) => [newLink, ...prev]);
      setLastCreated(newLink);
      setUrl("");
      setAlias("");
      setBackendUnavailable(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503) {
          setFormError(BACKEND_UNCONFIGURED_MESSAGE);
        } else if (err.status === 409) {
          setFormError("That alias is already taken.");
        } else {
          // 400 (invalid/reserved alias) and other API errors surface the
          // server-provided message.
          setFormError(err.message);
        }
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to shorten that URL.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCreated = async () => {
    if (!lastCreated) return;
    try {
      await navigator.clipboard.writeText(lastCreated.shortUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore clipboard failures */
    }
  };

  const handleDelete = useCallback(async (shortCode: string) => {
    try {
      await deleteLink(shortCode);
      setLinks((prev) => prev.filter((item) => item.shortCode !== shortCode));
      setLastCreated((prev) =>
        prev && prev.shortCode === shortCode ? null : prev,
      );
      setQrLink((prev) => (prev && prev.shortCode === shortCode ? null : prev));
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setListError(BACKEND_UNCONFIGURED_MESSAGE);
      } else if (err instanceof Error) {
        setListError(err.message);
      } else {
        setListError("Failed to delete that link.");
      }
    }
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  // Summary stats derived from the loaded links.
  const totalClicks = links.reduce((sum, item) => sum + item.clicks, 0);
  const topLink = links.reduce<LinkItem | null>(
    (best, item) => (!best || item.clicks > best.clicks ? item : best),
    null,
  );

  // Client-side search over shortCode + originalUrl (case-insensitive).
  const query = search.trim().toLowerCase();
  const filteredLinks = query
    ? links.filter(
        (item) =>
          item.shortCode.toLowerCase().includes(query) ||
          item.originalUrl.toLowerCase().includes(query),
      )
    : links;

  const showList =
    !listLoading && !backendUnavailable && !listError && links.length > 0;

  if (loading || !user) {
    return <BrandSplash label="Loading your workspace…" />;
  }

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-1 sm:pr-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-white">
                {initial}
              </span>
              <span className="hidden max-w-[12rem] truncate text-sm text-muted-strong sm:inline">
                {user.email}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        {/* Create */}
        <section className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Shorten a link
          </h1>
          <p className="mt-1 text-sm text-muted">
            Paste a long URL and get a clean, trackable Ziplink.
          </p>

          <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/a-very-long-link-to-shorten"
                aria-label="URL to shorten"
                aria-invalid={formError ? true : undefined}
                className="zip-field flex-1"
              />
              <Button type="submit" size="lg" loading={creating} className="sm:w-40">
                {creating ? "Shortening" : "Shorten link"}
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-stretch">
                <span
                  className="inline-flex shrink-0 items-center rounded-l-[var(--radius)] border border-r-0 border-border-strong bg-surface-muted px-3 font-mono text-xs text-muted"
                  aria-hidden="true"
                >
                  {aliasPrefix}
                </span>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="custom-alias"
                  aria-label="Custom alias (optional)"
                  aria-describedby="alias-help"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={32}
                  className="zip-field flex-1 rounded-l-none font-mono"
                />
              </div>
              <p id="alias-help" className="text-xs text-muted">
                {ALIAS_HELP}
              </p>
            </div>
          </form>

          {formError ? (
            <p role="alert" className="mt-3 rounded-[var(--radius)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          {lastCreated && !formError ? (
            <div className="animate-fade-up mt-4 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-brand-200 bg-brand-50 px-4 py-3.5 dark:border-brand-800 dark:bg-[color:var(--surface-muted)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  Your short link is ready
                </p>
                <a
                  href={lastCreated.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate font-mono text-sm font-semibold text-foreground hover:underline"
                >
                  {lastCreated.shortUrl}
                </a>
              </div>
              <Button variant="primary" size="sm" onClick={handleCopyCreated} className="shrink-0">
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          ) : null}
        </section>

        {/* Divider */}
        <div className="my-9 h-px w-full bg-border" />

        {/* Summary stats — only once links have loaded and exist. */}
        {showList ? (
          <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Total links"
              value={links.length}
              icon={<LinkGlyph />}
            />
            <StatCard
              label="Total clicks"
              value={totalClicks}
              icon={<CursorGlyph />}
            />
            {topLink ? (
              <StatCard
                label="Top link"
                value={displayShortCode(topLink.shortUrl)}
                hint={`${topLink.clicks} ${topLink.clicks === 1 ? "click" : "clicks"}`}
                icon={<TrophyGlyph />}
              />
            ) : null}
          </section>
        ) : null}

        {/* Links */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Your links
              </h2>
              {showList ? (
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted-strong tabular-nums">
                  {links.length} {links.length === 1 ? "link" : "links"}
                </span>
              ) : null}
            </div>
            {showList ? (
              <div className="sm:w-64">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by code or URL…"
                />
              </div>
            ) : null}
          </div>

          {listLoading ? (
            <div className="space-y-3">
              <LinkCardSkeleton />
              <LinkCardSkeleton />
              <LinkCardSkeleton />
            </div>
          ) : backendUnavailable ? (
            <EmptyPanel title="Almost there" body={BACKEND_UNCONFIGURED_MESSAGE} tone="warning" />
          ) : listError ? (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-10 text-center shadow-[var(--shadow-sm)]">
              <p className="text-sm text-danger">{listError}</p>
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={loadLinks}>
                  Try again
                </Button>
              </div>
            </div>
          ) : links.length === 0 ? (
            <EmptyPanel title="No links yet" body="Paste a URL above to create your first Ziplink." />
          ) : filteredLinks.length === 0 ? (
            <EmptyPanel
              title="No links match"
              body={`Nothing matches “${search.trim()}”. Try a different search.`}
            />
          ) : (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <LinkCard
                  key={link.shortCode}
                  link={link}
                  onDelete={handleDelete}
                  onShowQr={setQrLink}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {qrLink ? <QrModal link={qrLink} onClose={() => setQrLink(null)} /> : null}
    </div>
  );
}

/** Display just the short code portion of a shortUrl (host/CODE -> CODE). */
function displayShortCode(shortUrl: string): string {
  const withoutProtocol = shortUrl.replace(/^https?:\/\//, "");
  const parts = withoutProtocol.split("/");
  return parts[parts.length - 1] || withoutProtocol;
}

function LinkGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 5.6 5.6l-2 2M13.5 17.5l-1 1a4 4 0 0 1-5.6-5.6l2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

function TrophyGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 5H4.5v1.5A2.5 2.5 0 0 0 7 9m10-4h2.5v1.5A2.5 2.5 0 0 1 17 9M9.5 13.5h5M12 12v1.5M9 20h6m-3-2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyPanel({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="animate-fade-up rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface p-12 text-center shadow-[var(--shadow-sm)]">
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
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
            <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 5.6 5.6l-2 2M13.5 17.5l-1 1a4 4 0 0 1-5.6-5.6l2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
