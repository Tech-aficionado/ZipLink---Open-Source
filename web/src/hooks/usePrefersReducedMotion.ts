"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion: reduce` setting.
 *
 * Returns `false` during SSR and first paint (motion allowed), then syncs to
 * the real preference on the client and stays in sync with runtime changes.
 * Consumers can use this to skip decorative animation for users who opt out.
 */
export default function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
