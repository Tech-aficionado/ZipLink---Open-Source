import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin uses Node.js built-ins and dynamic requires; keep it out of
  // the bundle and let Node load it at runtime.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
