import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Thrown when firebase-admin cannot be initialized because one or more
 * required service-account environment variables are missing.
 *
 * Handlers should map this to a 503 response so that `next build` can succeed
 * without real credentials and the running app degrades gracefully.
 */
export class AdminNotConfiguredError extends Error {
  constructor(message = 'Firebase Admin not configured') {
    super(message);
    this.name = 'AdminNotConfiguredError';
    // Preserve prototype chain when targeting older JS runtimes.
    Object.setPrototypeOf(this, AdminNotConfiguredError.prototype);
  }
}

/**
 * Thrown when a request is missing a valid `Authorization: Bearer <token>`
 * header or the ID token cannot be verified. Handlers map this to 401.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

interface ServiceAccountEnv {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Reads and validates the service-account env vars. Throws
 * AdminNotConfiguredError if any are missing/empty.
 */
function readServiceAccountEnv(): ServiceAccountEnv {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new AdminNotConfiguredError();
  }

  // Environment variables often store the private key with literal "\n"
  // sequences (e.g. in .env files or Vercel). Convert them to real newlines.
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey };
}

// Cache the initialized app so we only create it once per server instance.
let cachedApp: App | null = null;

/**
 * Lazily initializes and returns the firebase-admin App singleton.
 * Never runs at import time; only when first called.
 *
 * @throws {AdminNotConfiguredError} if required env vars are missing.
 */
export function getAdmin(): App {
  if (cachedApp) {
    return cachedApp;
  }

  // Reuse an already-initialized default app if one exists (e.g. across
  // hot reloads in development).
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const { projectId, clientEmail, privateKey } = readServiceAccountEnv();

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return cachedApp;
}

/**
 * Returns the admin Firestore instance, initializing the app on first use.
 *
 * @throws {AdminNotConfiguredError} if required env vars are missing.
 */
export function getFirestore(): Firestore {
  return getAdminFirestore(getAdmin());
}

/**
 * Verifies the Firebase ID token from the request's Authorization header and
 * returns the authenticated user's uid and email.
 *
 * @throws {UnauthorizedError} if the header is missing/malformed or the token
 *   is invalid.
 * @throws {AdminNotConfiguredError} if required env vars are missing.
 */
export async function getAuthFromRequest(
  req: Request,
): Promise<{ uid: string; email: string }> {
  const authorization = req.headers.get('authorization') ?? req.headers.get('Authorization');

  if (!authorization) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match) {
    throw new UnauthorizedError('Malformed Authorization header');
  }

  const token = match[1].trim();
  if (!token) {
    throw new UnauthorizedError('Missing bearer token');
  }

  // getAdmin() may throw AdminNotConfiguredError, which propagates to the
  // handler so it can return 503.
  const auth = getAuth(getAdmin());

  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
