import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore, AdminNotConfiguredError } from '@/lib/firebaseAdmin';
import { parseUserAgent } from '@/lib/ua';

export const runtime = 'nodejs';

const LINKS_COLLECTION = 'links';
const CLICKS_COLLECTION = 'clicks';

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

interface LinkDocument {
  originalUrl: string;
  ownerUid?: string;
}

// Short codes are nanoid / custom-alias values. Anything else can't exist.
const VALID_SHORT_CODE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * GET /[shortCode]
 * PUBLIC. Redirects to the original URL (301) and records a click event with
 * lightweight, privacy-conscious metadata (device, browser, referrer host,
 * country) for analytics.
 */
export async function GET(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const { shortCode } = await ctx.params;

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

    // Record the visit + a click event. Non-fatal: never block the redirect.
    const ua = parseUserAgent(req.headers.get('user-agent'));
    const ref = req.headers.get('referer');
    const country =
      req.headers.get('x-vercel-ip-country') ??
      req.headers.get('cf-ipcountry') ??
      null;

    const writes: Promise<unknown>[] = [
      docRef.update({
        clicks: FieldValue.increment(1),
        lastAccessedAt: FieldValue.serverTimestamp(),
      }),
      db.collection(CLICKS_COLLECTION).add({
        shortCode,
        ownerUid: data.ownerUid ?? null,
        ts: FieldValue.serverTimestamp(),
        ref: ref ?? null,
        country,
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
      }),
    ];
    try {
      await Promise.allSettled(writes);
    } catch {
      // ignore analytics write failures
    }

    return NextResponse.redirect(data.originalUrl, 301);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
