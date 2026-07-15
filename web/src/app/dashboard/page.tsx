"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/Button";
import LinkCard from "@/components/LinkCard";
import { LinkCardSkeleton } from "@/components/Skeleton";
import QrModal from "@/components/QrModal";
import EditLinkModal from "@/components/EditLinkModal";
import StatCard from "@/components/StatCard";
import SearchInput from "@/components/SearchInput";
import BulkActionBar from "@/components/BulkActionBar";
import CampaignFields, { EMPTY_UTM } from "@/components/CampaignFields";
import CsvImportPanel from "@/components/CsvImportPanel";
import { downloadCsv, linksToCsv } from "@/lib/csv";
import { CampaignValidationError, normalizeUtm, parseTagsText, type UtmValues } from "@/lib/campaign";
import { browserTimeZone, localDateTimeToIso } from "@/lib/linkDates";
import { normalizeLinkStatus } from "@/components/LifecycleStatusBadge";
import {
  ALIAS_PATTERN,
  ApiError,
  baseHostPrefix,
  createLink,
  deleteLink,
  listLinks,
  type LinkItem,
  type LinkStatus,
} from "@/lib/api";

const CSV_FILENAME = "ziplink-links.csv";
const ALIAS_HELP = "optional — 3–32 letters, numbers, - or _";
const BACKEND_UNCONFIGURED_MESSAGE =
  "Server not fully configured yet — add the Firebase service account key to start creating links.";

type SortKey = "newest" | "oldest" | "clicks";
type LifecycleFilter = "all" | LinkStatus;

function pluralizeLinks(count: number): string {
  return count === 1 ? "link" : "links";
}

export default function LinksPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [utm, setUtm] = useState<UtmValues>({ ...EMPTY_UTM });
  const [timeZone, setTimeZone] = useState("local time");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [editLink, setEditLink] = useState<LinkItem | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => new Set());

  const aliasPrefix = baseHostPrefix();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setTimeZone(browserTimeZone()));
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(copyTimer.current);
    };
  }, []);

  // Auto-focus the URL field on desktop only, so mobile keyboards don't pop up.
  useEffect(() => {
    if (!user) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      urlInputRef.current?.focus({ preventScroll: true });
    }
  }, [user]);

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
    if (!user) return;
    const frame = window.requestAnimationFrame(() => void loadLinks());
    return () => window.cancelAnimationFrame(frame);
  }, [user, loadLinks]);

  // Keep the selection in sync with the links that actually exist.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedCodes((prev) => {
        if (prev.size === 0) return prev;
        const valid = new Set(links.map((item) => item.shortCode));
        let changed = false;
        const next = new Set<string>();
        prev.forEach((code) => {
          if (valid.has(code)) next.add(code);
          else changed = true;
        });
        return changed ? next : prev;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [links]);

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
    if (trimmed.length > 2048 || normalized.username || normalized.password || /[\u0000-\u001F\u007F]/.test(trimmed)) {
      setFormError("Enter a safe URL without credentials or control characters (maximum 2048 characters).");
      return;
    }

    const trimmedAlias = alias.trim();
    if (trimmedAlias && !ALIAS_PATTERN.test(trimmedAlias)) {
      setFormError("Alias must be 3–32 characters: letters, numbers, - or _.");
      return;
    }

    const startsAtIso = localDateTimeToIso(startsAt);
    const expiresAtIso = localDateTimeToIso(expiresAt);
    if ((startsAt && !startsAtIso) || (expiresAt && !expiresAtIso)) {
      setFormError("Enter valid start and expiry dates.");
      return;
    }
    if (
      startsAtIso &&
      expiresAtIso &&
      new Date(startsAtIso).getTime() >= new Date(expiresAtIso).getTime()
    ) {
      setFormError("Start time must be before expiry time.");
      return;
    }

    let tags: string[];
    let normalizedUtm;
    try {
      tags = parseTagsText(tagsText);
      normalizedUtm = normalizeUtm(utm);
    } catch (error) {
      setFormError(
        error instanceof CampaignValidationError ? error.message : "Check the campaign fields and try again.",
      );
      return;
    }

    setCreating(true);
    try {
      const created = await createLink({
        originalUrl: trimmed,
        customCode: trimmedAlias || undefined,
        enabled,
        startsAt: startsAtIso,
        expiresAt: expiresAtIso,
        tags,
        ...(normalizedUtm ? { utm: normalizedUtm } : {}),
      });
      setLinks((prev) => [created, ...prev]);
      setLastCreated(created);
      setUrl("");
      setAlias("");
      setEnabled(true);
      setStartsAt("");
      setExpiresAt("");
      setTagsText("");
      setUtm({ ...EMPTY_UTM });
      setBackendUnavailable(false);
      toast.success("Short link created");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503) setFormError(BACKEND_UNCONFIGURED_MESSAGE);
        else if (err.status === 409) setFormError("That alias is already taken.");
        else setFormError(err.message);
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
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  };

  const handleDelete = useCallback(
    async (shortCode: string) => {
      try {
        await deleteLink(shortCode);
        setLinks((prev) => prev.filter((item) => item.shortCode !== shortCode));
        setLastCreated((prev) => (prev && prev.shortCode === shortCode ? null : prev));
        setQrLink((prev) => (prev && prev.shortCode === shortCode ? null : prev));
        setEditLink((prev) => (prev && prev.shortCode === shortCode ? null : prev));
        toast.success("Link deleted");
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) toast.error(BACKEND_UNCONFIGURED_MESSAGE);
        else if (err instanceof Error) toast.error(err.message);
        else toast.error("Failed to delete that link.");
      }
    },
    [toast],
  );

  const handleUpdated = useCallback(
    (updated: LinkItem) => {
      setLinks((prev) =>
        prev.map((item) => (item.shortCode === updated.shortCode ? { ...item, ...updated } : item)),
      );
      setLastCreated((prev) =>
        prev && prev.shortCode === updated.shortCode ? { ...prev, ...updated } : prev,
      );
      toast.success("Link updated");
    },
    [toast],
  );

  // Derived data.
  const totalClicks = links.reduce((sum, item) => sum + item.clicks, 0);
  const topLink = links.reduce<LinkItem | null>(
    (best, item) => (!best || item.clicks > best.clicks ? item : best),
    null,
  );

  const query = search.trim().toLowerCase();
  const searchedLinks = query
    ? links.filter(
        (item) =>
          item.shortCode.toLowerCase().includes(query) ||
          item.originalUrl.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.includes(query)),
      )
    : links;
  const filteredLinks =
    lifecycleFilter === "all"
      ? searchedLinks
      : searchedLinks.filter((item) => normalizeLinkStatus(item.status) === lifecycleFilter);
  const sortedLinks = sortLinks(filteredLinks, sort);

  const showList = !listLoading && !backendUnavailable && !listError && links.length > 0;

  const selectedVisible = sortedLinks.filter((item) => selectedCodes.has(item.shortCode));
  const selectedCount = selectedVisible.length;
  const allVisibleSelected = sortedLinks.length > 0 && selectedCount === sortedLinks.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;

  const toggleSelect = (shortCode: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(shortCode)) next.delete(shortCode);
      else next.add(shortCode);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) sortedLinks.forEach((item) => next.delete(item.shortCode));
      else sortedLinks.forEach((item) => next.add(item.shortCode));
      return next;
    });
  };

  const clearSelection = () => setSelectedCodes(new Set());

  const handleExportAll = () => {
    if (links.length === 0) return;
    downloadCsv(CSV_FILENAME, linksToCsv(links));
    toast.success(`Exported ${links.length} ${pluralizeLinks(links.length)}`);
  };

  const handleExportSelected = () => {
    if (selectedVisible.length === 0) return;
    downloadCsv(CSV_FILENAME, linksToCsv(selectedVisible));
    toast.success(`Exported ${selectedVisible.length} ${pluralizeLinks(selectedVisible.length)}`);
  };

  const handleDeleteSelected = async () => {
    const codes = selectedVisible.map((item) => item.shortCode);
    if (codes.length === 0) return;

    const results = await Promise.allSettled(
      codes.map((code) => Promise.resolve(deleteLink(code))),
    );

    const deleted: string[] = [];
    let failed = 0;
    let backendDown = false;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") deleted.push(codes[index]);
      else {
        failed += 1;
        if (result.reason instanceof ApiError && result.reason.status === 503) backendDown = true;
      }
    });

    if (deleted.length > 0) {
      const removed = new Set(deleted);
      setLinks((prev) => prev.filter((item) => !removed.has(item.shortCode)));
      setLastCreated((prev) => (prev && removed.has(prev.shortCode) ? null : prev));
      setQrLink((prev) => (prev && removed.has(prev.shortCode) ? null : prev));
      setEditLink((prev) => (prev && removed.has(prev.shortCode) ? null : prev));
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        deleted.forEach((code) => next.delete(code));
        return next;
      });
    }

    if (failed === 0) toast.success(`Deleted ${deleted.length} ${pluralizeLinks(deleted.length)}`);
    else if (deleted.length === 0)
      toast.error(backendDown ? BACKEND_UNCONFIGURED_MESSAGE : `Couldn't delete ${failed} ${pluralizeLinks(failed)}`);
    else toast.error(`Deleted ${deleted.length}, ${failed} failed`);
  };

  return (
    <>
      {/* Create — page centerpiece */}
      <section className="animate-fade-up glass-card glass-ring overflow-hidden p-6 sm:p-8">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
        <h1 className="text-2xl font-semibold tracking-tight brand-text">Shorten a link</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a long URL and get a clean, trackable Ziplink — ready to share in seconds.
        </p>

        <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={urlInputRef}
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/a-very-long-link-to-shorten"
              aria-label="URL to shorten"
              aria-invalid={formError ? true : undefined}
              className="zip-field flex-1"
            />
            <Button type="submit" size="lg" loading={creating} className="w-full sm:w-40">
              {creating ? "Shortening" : "Shorten link"}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="grid min-w-0 grid-cols-[minmax(0,auto)_minmax(0,1fr)] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-surface transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:shadow-[var(--ring)]">
              <span
                className="flex min-w-0 max-w-[45vw] items-center overflow-hidden text-ellipsis whitespace-nowrap bg-surface-muted px-3 font-mono text-xs text-muted sm:max-w-72"
                aria-hidden="true"
                title={aliasPrefix}
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
                className="min-w-0 border-0 bg-transparent px-3 py-[0.8rem] font-mono text-base leading-[1.4] text-foreground outline-none placeholder:text-muted"
              />
            </div>
            <p id="alias-help" className="text-xs text-muted">{ALIAS_HELP}</p>
          </div>

          <details className="rounded-[var(--radius)] border border-border bg-surface/60 px-4 py-3">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-muted-strong">
                  Starts at (optional)
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="zip-field mt-1.5"
                  />
                </label>
                <label className="text-xs font-medium text-muted-strong">
                  Expires at (optional)
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="zip-field mt-1.5"
                  />
                </label>
              </div>
              <p className="text-xs text-muted">Times use your browser timezone: {timeZone}.</p>
              <CampaignFields
                idPrefix="create-campaign"
                originalUrl={url}
                tagsText={tagsText}
                onTagsChange={setTagsText}
                utm={utm}
                onUtmChange={setUtm}
              />
            </div>
          </details>
        </form>

        {formError ? (
          <p role="alert" className="mt-3 rounded-[var(--radius)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        {lastCreated && !formError ? (
          <div className="animate-fade-up mt-4 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-brand-200/70 bg-[color:color-mix(in_srgb,var(--brand-500)_12%,transparent)] px-4 py-3.5 backdrop-blur-sm dark:border-brand-800/70 sm:flex-row sm:items-center sm:justify-between">
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

      {user ? (
        <div className="mt-4">
          <CsvImportPanel onCompleted={() => void loadLinks()} />
        </div>
      ) : null}

      <div className="my-9 h-px w-full bg-border" />

      {showList ? (
        <section className="animate-fade-up mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total links" value={links.length} icon={<LinkGlyph />} />
          <StatCard label="Total clicks" value={totalClicks} icon={<CursorGlyph />} />
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

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your links</h2>
            {showList ? (
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted-strong tabular-nums">
                {links.length} {pluralizeLinks(links.length)}
              </span>
            ) : null}
          </div>
          {showList ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              <div className="sm:w-56">
                <SearchInput value={search} onChange={setSearch} placeholder="Search by code, URL, or tag…" />
              </div>
              <LifecycleFilterSelect value={lifecycleFilter} onChange={setLifecycleFilter} />
              <SortSelect value={sort} onChange={setSort} />
            </div>
          ) : null}
        </div>

        {showList && sortedLinks.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SelectAllControl
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={toggleSelectAllVisible}
              count={sortedLinks.length}
            />
            <Button variant="secondary" size="sm" onClick={handleExportAll}>
              <DownloadGlyph />
              Export all
            </Button>
          </div>
        ) : null}

        {listLoading ? (
          <div className="space-y-3">
            <LinkCardSkeleton />
            <LinkCardSkeleton />
            <LinkCardSkeleton />
          </div>
        ) : backendUnavailable ? (
          <EmptyPanel title="Almost there" body={BACKEND_UNCONFIGURED_MESSAGE} tone="warning" />
        ) : listError ? (
          <div className="animate-fade-up glass-card p-10 text-center">
            <p className="text-sm text-danger">{listError}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={loadLinks}>Try again</Button>
            </div>
          </div>
        ) : links.length === 0 ? (
          <EmptyPanel title="No links yet" body="Paste a URL above to create your first Ziplink." />
        ) : sortedLinks.length === 0 ? (
          <EmptyPanel
            title="No links match"
            body={
              query
                ? `Nothing matches “${search.trim()}” with the selected lifecycle filter.`
                : `No ${lifecycleFilter} links found. Try a different lifecycle filter.`
            }
          />
        ) : (
          <div className="space-y-3">
            {sortedLinks.map((link) => (
              <LinkCard
                key={link.shortCode}
                link={link}
                selected={selectedCodes.has(link.shortCode)}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
                onShowQr={setQrLink}
                onEdit={setEditLink}
                onCopied={() => toast.success("Link copied to clipboard")}
                onCopyError={() => toast.error("Couldn't copy the link to your clipboard.")}
              />
            ))}
          </div>
        )}
      </section>

      {showList && selectedCount > 0 ? (
        <BulkActionBar
          key={selectedCount}
          count={selectedCount}
          onDeleteSelected={handleDeleteSelected}
          onExportSelected={handleExportSelected}
          onClear={clearSelection}
        />
      ) : null}

      {qrLink ? <QrModal link={qrLink} onClose={() => setQrLink(null)} /> : null}
      {editLink ? (
        <EditLinkModal link={editLink} onClose={() => setEditLink(null)} onSaved={handleUpdated} />
      ) : null}
    </>
  );
}

function sortLinks(items: LinkItem[], sort: SortKey): LinkItem[] {
  const copy = [...items];
  if (sort === "oldest") copy.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  else if (sort === "clicks")
    copy.sort((a, b) => b.clicks - a.clicks || toTime(b.createdAt) - toTime(a.createdAt));
  else copy.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
  return copy;
}

function toTime(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function LifecycleFilterSelect({
  value,
  onChange,
}: {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="filter-links" className="sr-only">Filter links by lifecycle status</label>
      <select
        id="filter-links"
        value={value}
        onChange={(event) => onChange(event.target.value as LifecycleFilter)}
        className="zip-field w-full cursor-pointer appearance-none pr-9 sm:w-40"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="scheduled">Scheduled</option>
        <option value="paused">Paused</option>
        <option value="expired">Expired</option>
        <option value="error">Error</option>
      </select>
      <SelectChevron />
    </div>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return (
    <div className="relative">
      <label htmlFor="sort-links" className="sr-only">Sort links</label>
      <select
        id="sort-links"
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        className="zip-field w-full cursor-pointer appearance-none pr-9 sm:w-44"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="clicks">Most clicks</option>
      </select>
      <SelectChevron />
    </div>
  );
}

function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function SelectAllControl({
  checked,
  indeterminate,
  onChange,
  count,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  count: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-muted-strong">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-[18px] w-[18px] cursor-pointer rounded-[6px] border-border-strong accent-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      />
      <span className="font-medium">
        {checked ? "Deselect all" : "Select all"}
        <span className="ml-1 text-muted tabular-nums">({count})</span>
      </span>
    </label>
  );
}

function DownloadGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
    <div className="animate-fade-up glass-card p-5 sm:p-6">
      <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border-strong/70 px-6 py-10 text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            tone === "warning" ? "bg-[color:var(--danger-soft)] text-danger" : "brand-gradient text-white"
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
    </div>
  );
}
