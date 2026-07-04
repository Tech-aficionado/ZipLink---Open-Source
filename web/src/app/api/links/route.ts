import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import {
  getAuthFromRequest,
  getFirestore,
  AdminNotConfiguredError,
  UnauthorizedError,
} from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const LINKS_COLLECTION = 'links';
const SHORT_CODE_LENGTH = 7;
const MAX_COLLISION_RETRIES = 5;
// Upper bound on the accepted originalUrl length. Browsers/proxies commonly
// cap URLs around 2000 chars; 2048 is a safe, generous limit.
const MAX_URL_LENGTH = 2048;

// Custom alias rules: 3-32 chars of letters, numbers, hyphen or underscore.
const CUSTOM_CODE_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
// Codes that would collide with real routes / internals. Compared lowercase.
const RESERVED_CODES = new Set<string>([
  'api',
  'health',
  'login',
  'dashboard',
  '_next',
  'favicon.ico',
]);

/**
 * Detects whether an error thrown by firebase-admin's `docRef.create()`
 * indicates the document already exists. firebase-admin surfaces this as a
 * gRPC ALREADY_EXISTS status (numeric code 6); some layers expose the string
 * code 'already-exists'. We also fall back to a message test for robustness.
 */
function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (code === 6 || code === 'already-exists') {
      return true;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.toLowerCase().includes('already exists')) {
      return true;
    }
  }
  return false;
}

/**
 * Firestore document shape for the `links` collection.
 * The document id is always the shortCode.
 */
interface LinkDocument {
  shortCode: string;
  originalUrl: string;
  ownerUid: string;
  ownerEmail: string;
  createdAt: Timestamp | FieldValue | null;
  clicks: number;
  lastAccessedAt: Timestamp | null;
}

/**
 * Builds the absolute short URL from a code using the configured base URL.
 */
function buildShortUrl(shortCode: string): string {
  // Short links live on the dedicated short domain (e.g. zl.ash-labs.tech),
  // which may differ from the app origin. Fall back to the app base, then ''.
  const base =
    process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/${shortCode}`;
}

/**
 * Validates that a string is a well-formed http(s) URL.
 */
function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

/**
 * Converts a Firestore Timestamp (or null) to an ISO 8601 string, or null.
 */
function timestampToIso(value: Timestamp | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toDate().toISOString();
}

/**
 * Maps a thrown error to the appropriate JSON error response.
 */
function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminNotConfiguredError) {
    return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * POST /api/links
 * Creates a new short link owned by the authenticated user.
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { uid, email } = await getAuthFromRequest(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Reject non-object bodies (arrays, strings, numbers, null) cleanly.
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'A valid http(s) originalUrl is required' },
        { status: 400 },
      );
    }

    const rawOriginalUrl = (body as { originalUrl?: unknown }).originalUrl;

    if (typeof rawOriginalUrl !== 'string') {
      return NextResponse.json(
        { error: 'A valid http(s) originalUrl is required' },
        { status: 400 },
      );
    }

    const originalUrl = rawOriginalUrl.trim();

    if (originalUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        { error: `originalUrl must be at most ${MAX_URL_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (!isValidHttpUrl(originalUrl)) {
      return NextResponse.json(
        { error: 'A valid http(s) originalUrl is required' },
        { status: 400 },
      );
    }

    // Optional custom alias. When present it must be a string; reject other
    // types (number/object/etc.) as a bad request.
    const rawCustomCode = (body as { customCode?: unknown }).customCode;

    if (rawCustomCode !== undefined && rawCustomCode !== null && typeof rawCustomCode !== 'string') {
      return NextResponse.json(
        { error: 'Alias must be 3-32 chars: letters, numbers, - or _' },
        { status: 400 },
      );
    }

    const customCode = typeof rawCustomCode === 'string' ? rawCustomCode.trim() : '';

    const db = getFirestore();
    const collection = db.collection(LINKS_COLLECTION);

    /**
     * Builds the stored document for a given code. Shared by the custom-alias
     * and generated-code paths so the persisted shape stays identical.
     */
    const buildDocData = (code: string): LinkDocument => ({
      shortCode: code,
      originalUrl,
      ownerUid: uid,
      ownerEmail: email,
      createdAt: FieldValue.serverTimestamp(),
      clicks: 0,
      lastAccessedAt: null,
    });

    let shortCode = '';

    if (customCode.length > 0) {
      // Custom alias path: validate, reject reserved names, then attempt a
      // single create. We do NOT retry with a different code — the user asked
      // for this exact alias.
      if (!CUSTOM_CODE_PATTERN.test(customCode)) {
        return NextResponse.json(
          { error: 'Alias must be 3-32 chars: letters, numbers, - or _' },
          { status: 400 },
        );
      }

      if (RESERVED_CODES.has(customCode.toLowerCase())) {
        return NextResponse.json({ error: 'That alias is reserved' }, { status: 400 });
      }

      try {
        await collection.doc(customCode).create(buildDocData(customCode));
        shortCode = customCode;
      } catch (createError) {
        if (isAlreadyExistsError(createError)) {
          return NextResponse.json({ error: 'That alias is already taken' }, { status: 409 });
        }
        // Any other failure is an unexpected server error.
        return errorResponse(createError);
      }
    } else {
      // Auto-generated path: generate a unique code, retrying on the (very
      // unlikely) collision.
      let created = false;

      for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
        const candidate = nanoid(SHORT_CODE_LENGTH);
        const docRef = collection.doc(candidate);

        try {
          // create() fails if the document already exists, giving us atomic
          // collision detection.
          await docRef.create(buildDocData(candidate));
          shortCode = candidate;
          created = true;
          break;
        } catch {
          // Assume a collision and try a fresh code on the next iteration.
          continue;
        }
      }

      if (!created) {
        return NextResponse.json(
          { error: 'Failed to generate a unique short code, please retry' },
          { status: 500 },
        );
      }
    }

    // Read back the stored doc so we can return the resolved createdAt value.
    const snapshot = await collection.doc(shortCode).get();
    const stored = snapshot.data() as LinkDocument | undefined;
    const createdAt = timestampToIso(
      stored?.createdAt instanceof Timestamp ? stored.createdAt : null,
    );

    return NextResponse.json(
      {
        shortCode,
        shortUrl: buildShortUrl(shortCode),
        originalUrl,
        clicks: 0,
        createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/links
 * Lists the authenticated user's links, newest first.
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);

    const db = getFirestore();
    // Equality filter only (no composite index required); sort in memory below.
    const querySnapshot = await db
      .collection(LINKS_COLLECTION)
      .where('ownerUid', '==', uid)
      .get();

    const links = querySnapshot.docs.map((doc) => {
      const data = doc.data() as LinkDocument;
      return {
        shortCode: doc.id,
        originalUrl: data.originalUrl,
        shortUrl: buildShortUrl(doc.id),
        clicks: data.clicks ?? 0,
        createdAt: timestampToIso(data.createdAt instanceof Timestamp ? data.createdAt : null),
        lastAccessedAt: timestampToIso(data.lastAccessedAt ?? null),
      };
    });

    // Newest first. Links without a resolved createdAt sort last.
    links.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
