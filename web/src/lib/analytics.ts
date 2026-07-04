import { referrerHost } from "@/lib/ua";

/** A single click event, normalized to primitives for aggregation. */
export interface ClickRecord {
  ts: number; // epoch milliseconds
  ref: string | null;
  country: string | null;
  device: string;
  browser: string;
  os: string;
}

export interface Bucket {
  label: string;
  value: number;
}

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface Analytics {
  total: number;
  last7: number;
  last30: number;
  series: SeriesPoint[]; // daily counts over the window (zero-filled)
  devices: Bucket[];
  browsers: Bucket[];
  referrers: Bucket[];
  countries: Bucket[];
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function topBuckets(counts: Map<string, number>, limit = 8): Bucket[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Aggregates raw click records into the analytics shape used by the UI.
 * `windowDays` controls the length of the daily time series (default 30).
 */
export function aggregate(records: ClickRecord[], windowDays = 30): Analytics {
  const now = Date.now();
  const day = 86_400_000;
  const cutoff7 = now - 7 * day;
  const cutoff30 = now - 30 * day;

  let last7 = 0;
  let last30 = 0;
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const referrers = new Map<string, number>();
  const countries = new Map<string, number>();
  const byDay = new Map<string, number>();

  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const r of records) {
    if (r.ts >= cutoff7) last7 += 1;
    if (r.ts >= cutoff30) last30 += 1;
    bump(devices, r.device || "unknown");
    bump(browsers, r.browser || "Unknown");
    bump(referrers, referrerHost(r.ref));
    bump(countries, r.country || "Unknown");
    byDay.set(ymd(new Date(r.ts)), (byDay.get(ymd(new Date(r.ts))) ?? 0) + 1);
  }

  // Zero-filled daily series across the window.
  const series: SeriesPoint[] = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const date = ymd(new Date(now - i * day));
    series.push({ date, count: byDay.get(date) ?? 0 });
  }

  return {
    total: records.length,
    last7,
    last30,
    series,
    devices: topBuckets(devices, 6),
    browsers: topBuckets(browsers, 6),
    referrers: topBuckets(referrers, 8),
    countries: topBuckets(countries, 8),
  };
}
