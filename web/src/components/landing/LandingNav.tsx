"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

interface NavAnchor {
  label: string;
  href: string;
}

const NAV_LINKS: readonly NavAnchor[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

/**
 * Sticky glass navigation bar. The primary CTA adapts to auth state:
 * "Open app" (→ /dashboard) when signed in, "Sign in" (→ /login) otherwise.
 */
export default function LandingNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAuthed = !loading && Boolean(user);
  const ctaLabel = isAuthed ? "Open app" : "Sign in";
  const ctaHref = isAuthed ? "/dashboard" : "/login";

  return (
    <header
      className={`glass sticky top-0 z-50 border-b transition-shadow duration-200 ${
        scrolled ? "border-border-strong shadow-md" : "border-border"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label="Ziplink home"
        >
          <Logo size={30} />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Button
            size="sm"
            onClick={() => router.push(ctaHref)}
            aria-label={ctaLabel}
          >
            {ctaLabel}
          </Button>
        </div>
      </nav>
    </header>
  );
}
