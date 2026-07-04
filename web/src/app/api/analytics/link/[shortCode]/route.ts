import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAuthFromRequest,
  getFirestore,
  AdminNotConfiguredError,
  UnauthorizedError,
} from "@/lib/firebaseAdmin";
import { aggregate, type ClickRecord } from "@/lib/analytics";

export const runtime = "nodejs";

const LINKS = "links";
const CLICKS = "clicks";
const MAX_EVENTS = 5000;

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

function shortBase(): string {
  const base =
    process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return base.replace(/\/+$/, "");
}

function iso(v: unknown): string | null {
  return v instanceof Timestamp ? v.toDate().toISOString() : null;
}
function toMillis(v: unknown): number {
  return v instanceof Timestamp ? v.toMillis() : 0;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminNotConfiguredError) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 503 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const { shortCode } = await ctx.params;
    const db = getFirestore();

    const linkSnap = await db.collection(LINKS).doc(shortCode).get();
    const link = linkSnap.data() as
      | { originalUrl: string; ownerUid: string; clicks?: number; createdAt?: unknown; lastAccessedAt?: unknown }
      | undefined;

    if (!linkSnap.exists || !link || link.ownerUid !== uid) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const clicksSnap = await db
      .collection(CLICKS)
      .where("shortCode", "==", shortCode)
      .limit(MAX_EVENTS)
      .get();

    const records: ClickRecord[] = clicksSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        ts: toMillis(data.ts),
        ref: (data.ref as string) ?? null,
        country: (data.country as string) ?? null,
        device: (data.device as string) ?? "unknown",
        browser: (data.browser as string) ?? "Unknown",
        os: (data.os as string) ?? "Unknown",
      };
    });

    const base = shortBase();
    return NextResponse.json(
      {
        link: {
          shortCode,
          shortUrl: `${base}/${shortCode}`,
          originalUrl: link.originalUrl,
          clicks: link.clicks ?? 0,
          createdAt: iso(link.createdAt),
          lastAccessedAt: iso(link.lastAccessedAt),
        },
        analytics: aggregate(records),
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
