import Link from "next/link";
import Logo from "@/components/Logo";

const FOOTER_LINKS: readonly { label: string; href: string }[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Sign in", href: "/login" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

/** Site footer with brand mark, tagline, quick links, and small print. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-xs">
            <Logo size={30} />
            <p className="mt-3 text-sm text-muted">
              Shorten links at light speed. Custom aliases, QR codes, and click
              analytics in a fast, futuristic interface.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-sm)] text-sm text-muted-strong transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p>© {year} Ziplink. Illustrative marketing metrics.</p>
          <p>Built with Next.js · Firebase</p>
        </div>
      </div>
    </footer>
  );
}
