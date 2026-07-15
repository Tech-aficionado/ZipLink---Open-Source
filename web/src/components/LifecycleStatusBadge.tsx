import type { LinkStatus } from "@/lib/api";

const STYLES: Record<LinkStatus, string> = {
  active: "bg-[color:var(--success-soft)] text-success",
  scheduled: "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-200",
  paused: "bg-surface-muted text-muted-strong",
  expired: "bg-[color:var(--danger-soft)] text-danger",
  error: "bg-[color:var(--danger-soft)] text-danger",
};

const LABELS: Record<LinkStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  paused: "Paused",
  expired: "Expired",
  error: "Error",
};

export function normalizeLinkStatus(status: unknown): LinkStatus {
  if (status === undefined || status === null) return "active";
  return typeof status === "string" && Object.prototype.hasOwnProperty.call(STYLES, status)
    ? (status as LinkStatus)
    : "error";
}

export default function LifecycleStatusBadge({ status }: { status?: LinkStatus | string | null }) {
  const normalized = normalizeLinkStatus(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[normalized]}`}>
      <span aria-hidden="true" className="mr-1.5">●</span>
      {LABELS[normalized]}
    </span>
  );
}
