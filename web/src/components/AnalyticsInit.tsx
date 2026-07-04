"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebaseClient";

/**
 * Client-only component that boots Firebase Analytics after hydration. Renders
 * nothing. Safe during SSR/build because `initAnalytics` no-ops on the server
 * and when analytics isn't supported/configured.
 */
export default function AnalyticsInit() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  return null;
}
