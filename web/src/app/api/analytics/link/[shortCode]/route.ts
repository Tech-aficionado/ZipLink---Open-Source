import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import { aggregate, type ClickRecord } from "@/lib/analytics";
import { readLinkControls } from "@/lib/linkControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINKS = "links";
const CLICKS = "clicks";
const MAX_EVENTS = 5000;

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

function shortBase(): string {
  const base = process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return base.replace(/\/+$/, "");
}

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const { shortCode } = await ctx.params;
    const db = getFirestore();
    const linkSnap = await db.collection(LINKS).doc(shortCode).get();
    const link = linkSnap.data() as Record<string, unknown> | undefined;

    if (!linkSnap.exists || !link || link.ownerUid !== uid) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const clicksSnap = await db.collection(CLICKS).where("shortCode", "==", shortCode).limit(MAX_EVENTS).get();
    const records: ClickRecord[] = clicksSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        ts: toMillis(data.ts),
        ref: (data.ref as string) ?? null,
        country: (data.country as string) ?? null,
        device: (data.device as string) ?? "unknown",
        browser: (data.browser as string) ?? "Unknown",
        os: (data.os as string) ?? "Unknown",
      };
    });

    return NextResponse.json(
      {
        link: {
          shortCode,
          shortUrl: `${shortBase()}/${shortCode}`,
          originalUrl: typeof link.originalUrl === "string" ? link.originalUrl : "",
          clicks: typeof link.clicks === "number" ? link.clicks : 0,
          createdAt: iso(link.createdAt),
          lastAccessedAt: iso(link.lastAccessedAt),
          ...readLinkControls(link),
        },
        analytics: aggregate(records),
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
