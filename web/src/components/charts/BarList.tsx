import type { Bucket } from "@/lib/api";

interface BarListProps {
  data: Bucket[];
  className?: string;
  emptyLabel?: string;
}

/**
 * A ranked horizontal bar list (e.g. top referrers / countries). Pure markup.
 */
export default function BarList({ data, className = "", emptyLabel = "No data yet" }: BarListProps) {
  if (data.length === 0) {
    return (
      <div className={`flex h-24 items-center justify-center text-sm text-muted ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className={`space-y-2.5 ${className}`}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-strong">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full brand-gradient"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
