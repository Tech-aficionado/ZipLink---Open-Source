"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void): (() => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;
const getServerSnapshot = (): boolean => false;

/**
 * Tracks the user's `prefers-reduced-motion: reduce` setting.
 *
 * Returns `false` during SSR and first paint (motion allowed), then syncs to
 * the real preference on the client and stays in sync with runtime changes.
 * Consumers can use this to skip decorative animation for users who opt out.
 */
export default function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
