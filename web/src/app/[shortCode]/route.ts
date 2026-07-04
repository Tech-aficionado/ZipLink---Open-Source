import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, AdminNotConfiguredError } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const LINKS_COLLECTION = 'links';

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

interface LinkDocument {
  originalUrl: string;
}

// Short codes are nanoid values (alphabet: A-Za-z0-9_-). Anything outside this
// shape can never exist as a document id, so we can reject it as 404 without
// touching Firestore. This also avoids passing malformed ids (e.g. containing
// slashes) into `.doc()`, which would throw.
const VALID_SHORT_CODE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * GET /[shortCode]
 * PUBLIC endpoint (no auth). Looks up the link by id and issues a 301 redirect
 * to the original URL, incrementing the click count as a side effect.
 *
 * - Invalid/unknown code -> 404
 * - Admin not set up      -> 503
 * - Anything else         -> 500 (never leaks internal details)
 */
export async function GET(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { shortCode } = await ctx.params;

  // Ignore obviously-invalid codes gracefully — treat as not found.
  if (typeof shortCode !== 'string' || !VALID_SHORT_CODE.test(shortCode)) {
    return new NextResponse('Not found', { status: 404 });
  }

  let db;
  try {
    db = getFirestore();
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  try {
    const docRef = db.collection(LINKS_COLLECTION).doc(shortCode);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return new NextResponse('Not found', { status: 404 });
    }

    const data = snapshot.data() as LinkDocument | undefined;
    if (!data || typeof data.originalUrl !== 'string') {
      return new NextResponse('Not found', { status: 404 });
    }

    // Record the visit. Awaited so the write is committed before we respond;
    // failures here should not block the redirect.
    try {
      await docRef.update({
        clicks: FieldValue.increment(1),
        lastAccessedAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // Non-fatal: still redirect the user even if analytics update fails.
    }

    return NextResponse.redirect(data.originalUrl, 301);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
