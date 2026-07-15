"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";

interface BulkActionBarProps {
  /** Number of links currently selected. */
  count: number;
  /** Delete every selected link. Should resolve once the work is done. */
  onDeleteSelected: () => Promise<void> | void;
  /** Export the selected links to CSV. */
  onExportSelected: () => void;
  /** Clear the current selection. */
  onClear: () => void;
}

/**
 * A sticky action bar shown at the bottom of the viewport whenever one or more
 * links are selected. Offers a confirm-gated bulk delete, CSV export of the
 * selection, and a clear-selection control. Stacks/wraps on small screens.
 */
export default function BulkActionBar({
  count,
  onDeleteSelected,
  onExportSelected,
  onClear,
}: BulkActionBarProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirmTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(confirmTimer.current);
  }, []);

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
      await onDeleteSelected();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="pointer-events-none sticky bottom-0 z-30 -mx-4 mt-4 px-4 pb-24 sm:-mx-6 sm:px-6 lg:pb-4">
      <div className="glass-card pointer-events-auto animate-fade-up mx-auto flex w-full max-w-4xl flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full brand-gradient px-2 text-xs font-semibold text-white tabular-nums">
            {count}
          </span>
          <span className="text-sm font-medium text-foreground">
            {count === 1 ? "link selected" : "links selected"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportSelected}
            className="min-h-10"
          >
            Export CSV
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteClick}
            disabled={deleting}
            className="min-h-10"
          >
            {deleting ? (
              <>
                <Spinner className="h-4 w-4" /> Deleting
              </>
            ) : confirming ? (
              "Confirm delete?"
            ) : (
              "Delete selected"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={deleting}
            className="min-h-10"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
