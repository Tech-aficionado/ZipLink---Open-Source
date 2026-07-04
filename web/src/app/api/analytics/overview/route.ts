import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import { aggregate, type ClickRecord } from "@/lib/analytics";

export const runtime = "nodejs";

const LINKS = "links";
const CLICKS = "clicks";
const MAX_EVENTS = 5000;

function shortBase(): string {
  const base =
    process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return base.replace(/\/+$/, "");
}

function toMillis(v: unknown): number {
  return v instanceof Timestamp ? v.toMillis() : 0;
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const db = getFirestore();

    const [linksSnap, clicksSnap] = await Promise.all([
      db.collection(LINKS).where("ownerUid", "==", uid).get(),
      db.collection(CLICKS).where("ownerUid", "==", uid).limit(MAX_EVENTS).get(),
    ]);

    const base = shortBase();
    let totalClicks = 0;
    const topLinks = linksSnap.docs
      .map((d) => {
        const data = d.data() as { originalUrl: string; clicks?: number };
        const clicks = data.clicks ?? 0;
        totalClicks += clicks;
        return {
          shortCode: d.id,
          shortUrl: `${base}/${d.id}`,
          originalUrl: data.originalUrl,
          clicks,
        };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

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

    return NextResponse.json(
      {
        totalLinks: linksSnap.size,
        totalClicks,
        topLinks,
        analytics: aggregate(records),
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
