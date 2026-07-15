import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "@/lib/firebaseAdmin";
import { isValidDestination, readLinkControls } from "@/lib/linkControls";
import { parseUserAgent } from "@/lib/ua";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINKS_COLLECTION = "links";
const CLICKS_COLLECTION = "clicks";
const VALID_SHORT_CODE = /^[A-Za-z0-9_-]{1,64}$/;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

function statusPage(status: number, title: string, message: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Ziplink</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06060b;color:#f2f3fb;font:16px/1.5 system-ui,sans-serif}main{width:min(32rem,calc(100% - 2rem));padding:2rem;border:1px solid #2e2e50;border-radius:1rem;background:#0f0f1a;text-align:center;box-shadow:0 24px 60px #0008}b{display:inline-block;margin-bottom:1rem;font-size:1.25rem;background:linear-gradient(120deg,#8188fb,#22d3ee);color:transparent;background-clip:text}h1{margin:.25rem 0;font-size:1.5rem}p{margin:.5rem 0 0;color:#bcbcd6}</style></head><body><main><b>Ziplink</b><h1>${title}</h1><p>${message}</p></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { ...NO_STORE_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { shortCode } = await ctx.params;
  if (typeof shortCode !== "string" || !VALID_SHORT_CODE.test(shortCode)) {
    return statusPage(404, "Link not found", "This short link is unavailable.");
  }

  try {
    const db = getFirestore();
    const docRef = db.collection(LINKS_COLLECTION).doc(shortCode);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return statusPage(404, "Link not found", "This short link is unavailable.");

    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (!data) return statusPage(503, "Link unavailable", "Please try again later.");

    const lifecycle = readLinkControls(data);
    if (lifecycle.status === "error" || !isValidDestination(data.originalUrl)) {
      return statusPage(503, "Link unavailable", "Please try again later.");
    }
    if (lifecycle.status === "paused") {
      return statusPage(404, "Link paused", "This link is not currently available.");
    }
    if (lifecycle.status === "scheduled") {
      return statusPage(404, "Link not active yet", `This link will be available at ${lifecycle.startsAt}.`);
    }
    if (lifecycle.status === "expired") {
      return statusPage(410, "Link expired", "This link is no longer available.");
    }

    const ua = parseUserAgent(req.headers.get("user-agent"));
    const ref = req.headers.get("referer");
    const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null;
    await Promise.allSettled([
      docRef.update({ clicks: FieldValue.increment(1), lastAccessedAt: FieldValue.serverTimestamp() }),
      db.collection(CLICKS_COLLECTION).add({
        shortCode,
        ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : null,
        ts: FieldValue.serverTimestamp(),
        ref: ref ?? null,
        country,
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
      }),
    ]);

    return NextResponse.redirect(data.originalUrl, { status: 302, headers: NO_STORE_HEADERS });
  } catch {
    return statusPage(503, "Link unavailable", "Please try again later.");
  }
}
