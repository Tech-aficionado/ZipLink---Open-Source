import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AnalyticsInit from "@/components/AnalyticsInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

const TITLE = "Ziplink — Shorten links in a zip";
const DESCRIPTION =
  "Ziplink is a fast, free URL shortener. Sign in with Google to create short links and custom aliases, generate QR codes, and track every click — in a clean, dark-first dashboard.";

const faviconSvg =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#635bff"/><stop offset="0.55" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="24" height="24" rx="6" fill="url(#g)"/><g transform="translate(2.4 2.4) scale(0.8)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15.2 6.4 17.8a3.4 3.4 0 0 1-4.8-4.8l2.6-2.6a3.4 3.4 0 0 1 4.8 0"/><path d="M15 8.8l2.6-2.6a3.4 3.4 0 0 1 4.8 4.8l-2.6 2.6a3.4 3.4 0 0 1-4.8 0"/><path d="M13.2 9 10 12.4h2.6L10.8 15" stroke-width="1.7"/></g></svg>',
  );

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Ziplink" },
  description: DESCRIPTION,
  applicationName: "Ziplink",
  category: "technology",
  keywords: [
    "URL shortener",
    "link shortener",
    "short links",
    "custom alias",
    "QR code generator",
    "click tracking",
    "link analytics",
    "free URL shortener",
    "open source URL shortener",
    "Ziplink",
  ],
  authors: [{ name: "Ziplink" }],
  creator: "Ziplink",
  publisher: "Ziplink",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: faviconSvg, type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/logo.png"],
  },
  openGraph: {
    type: "website",
    siteName: "Ziplink",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Ziplink — Shorten links in a zip" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#06060b" },
  ],
};

// Set the initial theme class before paint to avoid a flash of the wrong theme.
// Futuristic look defaults to dark unless the user explicitly chose light.
const themeScript = `(function(){try{var t=localStorage.getItem('ziplink-theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          {children}
          <AnalyticsInit />
        </AuthProvider>
      </body>
    </html>
  );
}
