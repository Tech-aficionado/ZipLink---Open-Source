"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import Toaster from "@/components/Toaster";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import BrandSplash from "@/components/BrandSplash";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

const NAV: readonly NavItem[] = [
  {
    label: "Links",
    href: "/dashboard",
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/links"),
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 5.6 5.6l-2 2M13.5 17.5l-1 1a4 4 0 0 1-5.6-5.6l2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    match: (p) => p.startsWith("/dashboard/analytics"),
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 16l3.5-4 3 2.5L20 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    match: (p) => p.startsWith("/dashboard/settings"),
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 3.5v2M12 18.5v2M4.6 7.5l1.7 1M17.7 15.5l1.7 1M4.6 16.5l1.7-1M17.7 8.5l1.7-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted-strong hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <span className={active ? "text-brand-500" : ""}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Close the mobile menu on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return <BrandSplash label="Loading your workspace…" />;
  }

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();
  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  const UserChip = (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1 pr-3">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-white">
        {initial}
      </span>
      <span className="max-w-[10rem] truncate text-sm text-muted-strong">
        {user.email}
      </span>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-background lg:flex">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface/40 px-4 py-5 backdrop-blur lg:flex">
          <Link href="/" aria-label="Ziplink home" className="px-2">
            <Logo size={30} />
          </Link>
          <div className="mt-8 flex-1">
            <NavLinks pathname={pathname} />
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            {UserChip}
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-muted-strong transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label="Ziplink home">
              <Logo size={28} />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-muted-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {menuOpen ? (
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="border-t border-border px-4 py-3">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                {UserChip}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-muted-strong hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {/* Content */}
        <div className="min-w-0 flex-1 lg:pl-60">
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </ToastProvider>
  );
}
