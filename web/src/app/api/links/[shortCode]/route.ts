import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import {
  CampaignValidationError,
  mergeUtmIntoUrl,
  normalizeTags,
  normalizeUtm,
} from "@/lib/campaign";
import {
  LINK_SCHEMA_VERSION,
  MAX_URL_LENGTH,
  hasValidRange,
  isValidDestination,
  parseOptionalIso,
} from "@/lib/linkControls";
import { serializeLink, type LinkDocument } from "@/lib/linkRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINKS_COLLECTION = "links";
const PATCH_FIELDS = new Set([
  "originalUrl", "enabled", "startsAt", "expiresAt", "tags", "utm",
]);
const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

const storedDate = (value: unknown): Date | null | undefined => {
  if (value === undefined) return null;
  return value instanceof Timestamp ? value.toDate() : undefined;
};

const ownedLink = async (req: Request, shortCode: string) => {
  const { uid } = await getAuthFromRequest(req);
  const docRef = getFirestore().collection(LINKS_COLLECTION).doc(shortCode);
  const snapshot = await docRef.get();
  const data = snapshot.data() as LinkDocument | undefined;
  if (!snapshot.exists || !data || data.ownerUid !== uid) return null;
  return { docRef, snapshot, data };
};

export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { shortCode } = await ctx.params;
    const owned = await ownedLink(req, shortCode);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeLink(owned.snapshot.id, owned.data), { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { shortCode } = await ctx.params;
    const owned = await ownedLink(req, shortCode);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await owned.docRef.delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { shortCode } = await ctx.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "A JSON object is required" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const fields = Object.keys(input);
    if (fields.length === 0 || fields.some((field) => !PATCH_FIELDS.has(field))) {
      return NextResponse.json(
        { error: "Only originalUrl, enabled, startsAt, expiresAt, tags, and utm can be updated" },
        { status: 400 },
      );
    }

    const owned = await ownedLink(req, shortCode);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updates: LinkDocument = { schemaVersion: LINK_SCHEMA_VERSION };

    let originalUrl = typeof owned.data.originalUrl === "string" ? owned.data.originalUrl : "";
    if (hasOwn(input, "originalUrl")) {
      originalUrl = typeof input.originalUrl === "string" ? input.originalUrl.trim() : "";
      const originalUrlTooLong = originalUrl.length > MAX_URL_LENGTH;
      if (!isValidDestination(originalUrl)) {
        const message = originalUrlTooLong
          ? `originalUrl must be at most ${MAX_URL_LENGTH} characters`
          : "A valid http(s) originalUrl without credentials is required";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      updates.originalUrl = originalUrl;
    }

    try {
      if (hasOwn(input, "tags")) updates.tags = normalizeTags(input.tags);
      if (hasOwn(input, "utm")) {
        const utm = normalizeUtm(input.utm);
        updates.originalUrl = mergeUtmIntoUrl(originalUrl, utm);
        updates.utm = utm ?? FieldValue.delete();
      }
    } catch (error) {
      if (error instanceof CampaignValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }


    if (hasOwn(input, "enabled")) {
      if (typeof input.enabled !== "boolean") {
        return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
      }
      updates.enabled = input.enabled;
    }

    let startsAt = storedDate(owned.data.startsAt);
    let expiresAt = storedDate(owned.data.expiresAt);
    if (hasOwn(input, "startsAt")) {
      startsAt = parseOptionalIso(input.startsAt);
      if (startsAt === undefined) {
        return NextResponse.json({ error: "startsAt must be a valid ISO date string or null" }, { status: 400 });
      }
      updates.startsAt = startsAt ? Timestamp.fromDate(startsAt) : FieldValue.delete();
    }
    if (hasOwn(input, "expiresAt")) {
      expiresAt = parseOptionalIso(input.expiresAt);
      if (expiresAt === undefined) {
        return NextResponse.json({ error: "expiresAt must be a valid ISO date string or null" }, { status: 400 });
      }
      updates.expiresAt = expiresAt ? Timestamp.fromDate(expiresAt) : FieldValue.delete();
    }
    if (startsAt === undefined || expiresAt === undefined) {
      return NextResponse.json(
        { error: "Stored lifecycle controls are invalid; provide valid start and expiry values" },
        { status: 409 },
      );
    }
    if (!hasValidRange(startsAt, expiresAt)) {
      return NextResponse.json({ error: "startsAt must be earlier than expiresAt" }, { status: 400 });
    }

    await owned.docRef.update(updates);
    const updated = await owned.docRef.get();
    return NextResponse.json(
      serializeLink(updated.id, updated.data() as LinkDocument),
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
