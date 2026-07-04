import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Two-domain routing:
 *   - Main app  → NEXT_PUBLIC_SITE_URL        (e.g. ziplink.ash-labs.tech)
 *   - Short links → NEXT_PUBLIC_SHORT_BASE_URL (e.g. zl.ash-labs.tech)
 *
 * Both domains point at the same deployment. On the SHORT domain the only
 * meaningful paths are `/<shortCode>` (handled by the [shortCode] route).
 * Any app page hit on the short domain (`/`, `/login`, `/dashboard`) is
 * forwarded to the main site so the short domain stays purely for redirects.
 *
 * Locally both hosts are the same (localhost) so nothing is rewritten.
 */
function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const shortHost = hostOf(process.env.NEXT_PUBLIC_SHORT_BASE_URL);
  const siteHost = hostOf(siteUrl);

  const onShortDomain =
    !!shortHost && !!siteHost && shortHost !== siteHost && host === shortHost;

  if (onShortDomain && siteUrl) {
    // Forward the app page to the main site, preserving the path.
    const target = new URL(req.nextUrl.pathname + req.nextUrl.search, siteUrl);
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

// Only run on the app pages — short-code paths are left untouched so the
// redirect route can handle them on the short domain.
export const config = {
  matcher: ["/", "/login", "/dashboard"],
};
