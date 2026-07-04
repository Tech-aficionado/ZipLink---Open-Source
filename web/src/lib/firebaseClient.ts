import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Fallback placeholders keep the Firebase client SDK from throwing
// `auth/invalid-api-key` at import time when env vars are absent (e.g. during
// `next build` prerendering, or before the user has configured `.env.local`).
// Real values from NEXT_PUBLIC_FIREBASE_* are used whenever they are present.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "missing.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "missing-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "missing-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

// Initialize the Firebase client app as a singleton. Guard against
// re-initialization during hot reloads / repeated imports.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Encourage Google to always show the account chooser.
googleProvider.setCustomParameters({ prompt: "select_account" });

let analyticsPromise: Promise<Analytics | null> | null = null;

/**
 * Lazily initialize Firebase Analytics — but only in the browser, only when a
 * measurement id is configured, and only when the environment actually
 * supports it. This is safe to call during SSR/build: it resolves to `null`
 * without ever touching `getAnalytics`. Call it from a client effect.
 */
export function initAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    return Promise.resolve(null);
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}

export default app;
