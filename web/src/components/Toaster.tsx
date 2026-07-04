"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useToast, useToastList, type Toast, type ToastVariant } from "@/context/ToastContext";

const ICON_WRAP: Record<ToastVariant, string> = {
  success: "bg-[color:var(--success-soft)] text-success",
  error: "bg-[color:var(--danger-soft)] text-danger",
  info: "bg-surface-muted text-brand-500",
};

/**
 * Renders stacked, auto-dismissing toasts. Bottom-center on mobile and
 * bottom-right on larger screens. The region is always present so screen
 * readers announce updates politely.
 */
export default function Toaster() {
  const { dismiss } = useToast();
  const toasts = useToastList();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end sm:p-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const shown = entered && !toast.leaving;

  const style: CSSProperties = reduceMotion
    ? { opacity: toast.leaving ? 0 : 1 }
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 200ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      };

  return (
    <div
      role="status"
      style={style}
      className="border-gradient glass glow-ring pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-lg)]"
    >
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ICON_WRAP[toast.variant]}`}
        aria-hidden="true"
      >
        <VariantIcon variant={toast.variant} />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 7.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
