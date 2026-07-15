import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import {
  CampaignValidationError,
  mergeUtmIntoUrl,
  normalizeTags,
  normalizeUtm,
} from "@/lib/campaign";
import {
  MAX_URL_LENGTH,
  hasValidRange,
  isValidDestination,
  parseOptionalIso,
} from "@/lib/linkControls";
import {
  buildLinkDocument,
  createLinkRecord,
  isAlreadyExistsError,
  serializeLink,
  validateCustomCode,
  type NewLinkRecord,
} from "@/lib/linkRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINKS_COLLECTION = "links";
const SHORT_CODE_LENGTH = 7;
const MAX_COLLISION_RETRIES = 5;
const CREATE_FIELDS = new Set([
  "originalUrl", "customCode", "enabled", "startsAt", "expiresAt", "tags", "utm",
]);

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { uid, email } = await getAuthFromRequest(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid http(s) originalUrl is required" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    if (Object.keys(input).some((field) => !CREATE_FIELDS.has(field))) {
      return NextResponse.json({ error: "Request contains unsupported fields" }, { status: 400 });
    }

    const rawUrl = typeof input.originalUrl === "string" ? input.originalUrl.trim() : "";
    const rawUrlTooLong = rawUrl.length > MAX_URL_LENGTH;
    if (!isValidDestination(rawUrl)) {
      const message = rawUrlTooLong
        ? `originalUrl must be at most ${MAX_URL_LENGTH} characters`
        : "A valid http(s) originalUrl without credentials is required";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let tags: string[];
    let utm;
    let originalUrl = rawUrl;
    try {
      tags = hasOwn(input, "tags") ? normalizeTags(input.tags) : [];
      utm = hasOwn(input, "utm") ? normalizeUtm(input.utm) : null;
      if (hasOwn(input, "utm")) originalUrl = mergeUtmIntoUrl(rawUrl, utm);
    } catch (error) {
      if (error instanceof CampaignValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }
    const startsAt = parseOptionalIso(input.startsAt);
    const expiresAt = parseOptionalIso(input.expiresAt);
    if (startsAt === undefined || expiresAt === undefined) {
      return NextResponse.json({ error: "startsAt and expiresAt must be valid ISO date strings" }, { status: 400 });
    }
    if (!hasValidRange(startsAt, expiresAt)) {
      return NextResponse.json({ error: "startsAt must be earlier than expiresAt" }, { status: 400 });
    }

    const rawCustomCode = input.customCode;
    if (rawCustomCode !== undefined && rawCustomCode !== null && typeof rawCustomCode !== "string") {
      return NextResponse.json({ error: "Alias must be 3-32 chars: letters, numbers, - or _" }, { status: 400 });
    }
    const customCode = typeof rawCustomCode === "string" ? rawCustomCode.trim() : "";
    if (customCode) {
      const codeError = validateCustomCode(customCode);
      if (codeError) return NextResponse.json({ error: codeError }, { status: 400 });
    }

    const collection = getFirestore().collection(LINKS_COLLECTION);
    const record = (shortCode: string): NewLinkRecord => ({
      shortCode,
      originalUrl,
      ownerUid: uid,
      ownerEmail: email,
      tags,
      utm,
      enabled: input.enabled !== false,
      startsAt,
      expiresAt,
    });

    let shortCode = "";
    if (customCode) {
      try {
        await createLinkRecord(collection.doc(customCode), record(customCode));
        shortCode = customCode;
      } catch (error) {
        if (isAlreadyExistsError(error)) {
          return NextResponse.json({ error: "That alias is already taken" }, { status: 409 });
        }
        throw error;
      }
    } else {
      for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
        const candidate = nanoid(SHORT_CODE_LENGTH);
        try {
          await createLinkRecord(collection.doc(candidate), record(candidate));
          shortCode = candidate;
          break;
        } catch (error) {
          if (!isAlreadyExistsError(error)) throw error;
        }
      }
      if (!shortCode) {
        return NextResponse.json({ error: "Failed to generate a unique short code, please retry" }, { status: 500 });
      }
    }

    const snapshot = await collection.doc(shortCode).get();
    return NextResponse.json(
      serializeLink(shortCode, snapshot.data() ?? buildLinkDocument(record(shortCode))),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const snapshot = await getFirestore().collection(LINKS_COLLECTION).where("ownerUid", "==", uid).get();
    const now = Date.now();
    const links = snapshot.docs.map((doc) => serializeLink(doc.id, doc.data(), now));
    links.sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));
    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
