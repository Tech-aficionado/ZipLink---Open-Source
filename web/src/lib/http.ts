import { NextResponse } from 'next/server';
import { AdminNotConfiguredError, UnauthorizedError } from '@/lib/firebaseAdmin';

/**
 * Shared JSON error helper for API route handlers.
 *
 * Every handler wraps its body in a try/catch and funnels the thrown error
 * here so error shapes and status codes stay consistent across the API:
 *   - UnauthorizedError        -> 401 (message passed through)
 *   - AdminNotConfiguredError  -> 503 (backend not configured yet)
 *   - anything else            -> 500 (generic; details are never leaked)
 *
 * The raw error is logged server-side so unexpected failures remain
 * diagnosable without exposing internals to the client.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminNotConfiguredError) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 503 },
    );
  }

  // Unexpected: log for observability, return an opaque 500.
  console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Build a JSON error response with an explicit status and message. */
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
