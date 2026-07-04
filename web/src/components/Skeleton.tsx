interface SkeletonProps {
  className?: string;
}

/** A shimmering placeholder block used while content loads. */
export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-[var(--radius-sm)] ${className}`}
      aria-hidden="true"
    />
  );
}

/** A card-shaped skeleton matching the LinkCard layout. */
export function LinkCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-xs" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
