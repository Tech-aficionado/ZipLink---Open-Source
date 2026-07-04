/**
 * Tiny, dependency-free user-agent parser. Good enough for analytics buckets
 * (device type / browser / OS) without pulling in a heavy library.
 */

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export interface ParsedUa {
  device: DeviceType;
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUa {
  if (!ua) return { device: "unknown", browser: "Unknown", os: "Unknown" };
  const s = ua.toLowerCase();

  // Device type
  let device: DeviceType = "desktop";
  if (/bot|crawler|spider|crawling|facebookexternalhit|slurp/.test(s)) {
    device = "bot";
  } else if (/ipad|tablet|(android(?!.*mobile))/.test(s)) {
    device = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) {
    device = "mobile";
  }

  // Browser (order matters)
  let browser = "Unknown";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/samsungbrowser/.test(s)) browser = "Samsung Internet";
  else if (/chrome|crios/.test(s)) browser = "Chrome";
  else if (/firefox|fxios/.test(s)) browser = "Firefox";
  else if (/safari/.test(s)) browser = "Safari";

  // OS
  let os = "Unknown";
  if (/windows/.test(s)) os = "Windows";
  else if (/iphone|ipad|ipod|ios/.test(s)) os = "iOS";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/android/.test(s)) os = "Android";
  else if (/linux/.test(s)) os = "Linux";

  return { device, browser, os };
}

/** Extract a clean hostname from a referrer URL, or "Direct" when absent. */
export function referrerHost(ref: string | null | undefined): string {
  if (!ref) return "Direct";
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}
