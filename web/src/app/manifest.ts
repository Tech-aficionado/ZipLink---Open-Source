import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ziplink — Shorten links in a zip",
    short_name: "Ziplink",
    description:
      "A fast, free URL shortener. Create short links and custom aliases, generate QR codes, and track clicks.",
    start_url: "/",
    display: "standalone",
    background_color: "#06060b",
    theme_color: "#06060b",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/logo-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
