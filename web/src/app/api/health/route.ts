import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * PUBLIC endpoint (no auth). Reports basic service health and whether
 * firebase-admin is configured.
 *
 * `admin` is true only if the admin SDK can be initialized with the current
 * environment. Any failure (missing/invalid service-account env) is swallowed
 * so this route can never crash the build or the running app.
 */
export async function GET(): Promise<NextResponse> {
  let admin = false;
  try {
    getAdmin();
    admin = true;
  } catch {
    // Admin not configured (or failed to init) — report false, never throw.
    admin = false;
  }

  return NextResponse.json({ status: 'ok', admin }, { status: 200 });
}
