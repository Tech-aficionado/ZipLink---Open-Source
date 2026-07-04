"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/Button";
import { ApiError, deleteLink, listLinks } from "@/lib/api";
import { downloadCsv, linksToCsv } from "@/lib/csv";

const CSV_FILENAME = "ziplink-links.csv";
const BACKEND_UNCONFIGURED_MESSAGE =
  "Server not fully configured yet — add the Firebase service account key to manage your data.";

function pluralizeLinks(count: number): string {
  return count === 1 ? "link" : "links";
}

export default function SettingsPage() {
  const { user, signOutUser } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [linkCount, setLinkCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const confirmTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(confirmTimer.current);
  }, []);

  const loadCount = useCallback(async () => {
    setCountLoading(true);
    setBackendUnavailable(false);
    try {
      const items = await listLinks();
      setLinkCount(items.length);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setBackendUnavailable(true);
      }
      // For any other failure, leave the count unknown; actions fetch fresh.
      setLinkCount(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const items = await listLinks();
      setLinkCount(items.length);
      if (items.length === 0) {
        toast.info("You don’t have any links to export yet.");
        return;
      }
      downloadCsv(CSV_FILENAME, linksToCsv(items));
      toast.success(`Exported ${items.length} ${pluralizeLinks(items.length)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) toast.error(BACKEND_UNCONFIGURED_MESSAGE);
      else if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to export your links.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmingDelete(false), 5000);
      return;
    }
    window.clearTimeout(confirmTimer.current);
    setConfirmingDelete(false);
    setDeletingAll(true);
    try {
      const items = await listLinks();
      if (items.length === 0) {
        setLinkCount(0);
        toast.info("You don’t have any links to delete.");
        return;
      }

      const results = await Promise.allSettled(
        items.map((item) => Promise.resolve(deleteLink(item.shortCode))),
      );

      let deleted = 0;
      let failed = 0;
      let backendDown = false;
      results.forEach((result) => {
        if (result.status === "fulfilled") deleted += 1;
        else {
          failed += 1;
          if (result.reason instanceof ApiError && result.reason.status === 503) backendDown = true;
        }
      });

      setLinkCount(failed);

      if (failed === 0) {
        toast.success(`Deleted ${deleted} ${pluralizeLinks(deleted)}`);
      } else if (deleted === 0) {
        toast.error(
          backendDown ? BACKEND_UNCONFIGURED_MESSAGE : `Couldn’t delete ${failed} ${pluralizeLinks(failed)}`,
        );
      } else {
        toast.error(`Deleted ${deleted}, ${failed} failed`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) toast.error(BACKEND_UNCONFIGURED_MESSAGE);
      else if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to delete your links.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
      router.replace("/login");
    } catch {
      setSigningOut(false);
      toast.error("Couldn’t sign out. Please try again.");
    }
  };

  const displayName = user?.displayName?.trim() || null;
  const email = user?.email ?? null;
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  const noLinks = linkCount === 0;
  const exportDisabled = exporting || backendUnavailable || countLoading || noLinks;
  const deleteDisabled = deletingAll || backendUnavailable || countLoading || noLinks;

  return (
    <>
      <section className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your account and your data.</p>
      </section>

      <div className="mt-8 space-y-6">
        {/* Account */}
        <Card title="Account" description="The Google account you’re signed in with.">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full brand-gradient text-lg font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              {displayName ? (
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              ) : null}
              <p className="truncate text-sm text-muted" title={email ?? undefined}>
                {email ?? "Not signed in"}
              </p>
            </div>
          </div>
        </Card>

        {/* Your data */}
        <Card
          title="Your data"
          description="Download a copy of every link you’ve created as a CSV file."
        >
          {backendUnavailable ? (
            <p className="mb-3 rounded-[var(--radius)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-danger">
              {BACKEND_UNCONFIGURED_MESSAGE}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {countLoading
                ? "Checking your links…"
                : linkCount === null
                  ? "Export all of your links to a spreadsheet."
                  : noLinks
                    ? "You don’t have any links to export yet."
                    : `You have ${linkCount} ${pluralizeLinks(linkCount)} ready to export.`}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={handleExport}
              loading={exporting}
              disabled={exportDisabled}
              className="shrink-0"
            >
              <DownloadGlyph />
              Export all links (CSV)
            </Button>
          </div>
        </Card>

        {/* Danger zone */}
        <section
          className="animate-fade-up glass-card p-5 sm:p-6"
          style={{ borderColor: "var(--danger)" }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--danger-soft)] text-danger">
              <WarningGlyph />
            </span>
            <h2 className="text-base font-semibold text-danger">Danger zone</h2>
          </div>

          <div className="mt-5 space-y-5">
            <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Delete all links</p>
                <p className="mt-0.5 text-sm text-muted">
                  Permanently removes every link you’ve created. This can’t be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteAll}
                loading={deletingAll}
                disabled={deleteDisabled}
                className="shrink-0"
              >
                {confirmingDelete ? "Click to confirm" : "Delete all links"}
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Sign out</p>
                <p className="mt-0.5 text-sm text-muted">End your session on this device.</p>
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={handleSignOut}
                loading={signingOut}
                className="shrink-0"
              >
                Sign out
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up glass-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DownloadGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.5v5M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
