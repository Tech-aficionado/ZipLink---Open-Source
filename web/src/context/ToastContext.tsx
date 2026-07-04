"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  /** Set briefly before removal to drive the exit animation. */
  leaving?: boolean;
}

/** The stable toast API returned by {@link useToast}. */
export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

/** How long a toast stays before it auto-dismisses. */
const TOAST_DURATION = 3500;
/** Matches the exit transition duration in Toaster. */
const EXIT_DURATION = 220;

// Two contexts so the toast API stays referentially stable: consumers that
// only fire toasts never re-render when the visible list changes.
const ToastApiContext = createContext<ToastApi | undefined>(undefined);
const ToastListContext = createContext<Toast[] | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Phase 1: mark leaving to animate out. Phase 2: remove after the exit.
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, leaving: true } : toast,
      ),
    );
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, EXIT_DURATION);
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { id, message: trimmed, variant }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push(message, "success"),
      error: (message: string) => push(message, "error"),
      info: (message: string) => push(message, "info"),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastApiContext.Provider value={api}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastApiContext.Provider>
  );
}

/** Fire toasts from anywhere inside a {@link ToastProvider}. */
export function useToast(): ToastApi {
  const context = useContext(ToastApiContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/** Read the current toast list — used by the Toaster to render them. */
export function useToastList(): Toast[] {
  const context = useContext(ToastListContext);
  if (context === undefined) {
    throw new Error("useToastList must be used within a ToastProvider");
  }
  return context;
}
