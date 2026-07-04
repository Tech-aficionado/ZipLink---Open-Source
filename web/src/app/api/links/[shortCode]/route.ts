import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  getFirestore,
  AdminNotConfiguredError,
  UnauthorizedError,
} from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const LINKS_COLLECTION = 'links';

interface LinkDocument {
  shortCode: string;
  originalUrl: string;
  ownerUid: string;
  ownerEmail: string;
  createdAt: Timestamp | null;
  clicks: number;
  lastAccessedAt: Timestamp | null;
}

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

function buildShortUrl(shortCode: string): string {
  const base =
    process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/${shortCode}`;
}

function timestampToIso(value: Timestamp | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toDate().toISOString();
}

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
 * GET /api/links/[shortCode]
 * Returns a single link owned by the authenticated user, else 404.
 */
export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const { shortCode } = await ctx.params;

    const db = getFirestore();
    const snapshot = await db.collection(LINKS_COLLECTION).doc(shortCode).get();

    const data = snapshot.data() as LinkDocument | undefined;

    // Treat missing docs and docs owned by another user identically (404) so
    // we never leak the existence of other users' links.
    if (!snapshot.exists || !data || data.ownerUid !== uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        shortCode: snapshot.id,
        originalUrl: data.originalUrl,
        shortUrl: buildShortUrl(snapshot.id),
        clicks: data.clicks ?? 0,
        createdAt: timestampToIso(data.createdAt ?? null),
        lastAccessedAt: timestampToIso(data.lastAccessedAt ?? null),
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/links/[shortCode]
 * Deletes a link owned by the authenticated user. Returns 204 on success,
 * 404 if missing or not owned by the caller.
 */
export async function DELETE(req: Request, ctx: RouteContext): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const { shortCode } = await ctx.params;

    const db = getFirestore();
    const docRef = db.collection(LINKS_COLLECTION).doc(shortCode);
    const snapshot = await docRef.get();
    const data = snapshot.data() as LinkDocument | undefined;

    if (!snapshot.exists || !data || data.ownerUid !== uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await docRef.delete();

    // 204 No Content — empty body.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
