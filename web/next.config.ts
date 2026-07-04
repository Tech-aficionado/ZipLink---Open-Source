import type { NextConfig } from "next";

// Firebase serves its Google-auth helper (the `/__/auth/handler` page and
// `/__/firebase/init.json`) from `<projectId>.firebaseapp.com`. By proxying
// those paths through our own domain and setting `authDomain` to our domain,
// the sign-in popup stays on `ziplink.ash-labs.tech` instead of exposing the
// raw `*.firebaseapp.com` URL. Auth still runs entirely on Firebase.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseAuthHost = projectId ? `${projectId}.firebaseapp.com` : null;

const nextConfig: NextConfig = {
  // firebase-admin uses Node.js built-ins and dynamic requires; keep it out of
  // the bundle and let Node load it at runtime.
  serverExternalPackages: ["firebase-admin"],

  async rewrites() {
    if (!firebaseAuthHost) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseAuthHost}/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseAuthHost}/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
