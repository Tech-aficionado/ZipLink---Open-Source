import type { LinkItem } from "@/lib/api";

/**
 * The CSV columns exported for each link, in order. Kept as a const tuple so
 * the header row and the per-row serialization can't drift apart.
 */
const CSV_COLUMNS = [
  "shortUrl",
  "originalUrl",
  "clicks",
  "createdAt",
  "lastAccessedAt",
] as const;

/**
 * Escape a single CSV field per RFC 4180: wrap in double quotes when the value
 * contains a comma, quote, or newline, doubling any embedded quotes. Nullish
 * values become an empty field.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Turn a list of links into a CSV string with a header row. Pure and
 * side-effect free so it can be tested and reused anywhere.
 *
 * Columns: shortUrl, originalUrl, clicks, createdAt, lastAccessedAt.
 * Uses CRLF line endings for maximum spreadsheet compatibility.
 */
export function linksToCsv(links: LinkItem[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = links.map((link) =>
    [
      escapeField(link.shortUrl),
      escapeField(link.originalUrl),
      escapeField(link.clicks),
      escapeField(link.createdAt),
      escapeField(link.lastAccessedAt),
    ].join(","),
  );
  return [header, ...rows].join("\r\n");
}

/**
 * Trigger a browser download of the given text content as a file, using a
 * Blob + temporary object URL. No-ops outside the browser (e.g. during SSR).
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a tick to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
