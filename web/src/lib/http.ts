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
 * Unexpected errors are logged by default and always return an opaque response.
 * Sensitive workflows can disable logging so request-derived values are never
 * written to logs while preserving the same client-facing behavior.
 */
export function errorResponse(
  error: unknown,
  options: { log?: boolean } = {},
): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminNotConfiguredError) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 503 },
    );
  }

  // Unexpected: log for observability unless the caller handles sensitive input.
  if (options.log !== false) console.error('[api] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Build a JSON error response with an explicit status and message. */
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
