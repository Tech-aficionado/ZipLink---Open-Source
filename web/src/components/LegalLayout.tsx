import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";

/** A titled section within a legal document. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Shared shell for the Privacy and Terms pages: a slim header with the logo and
 * a link home, a readable content column, and a small footer.
 */
export default function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href="/"
            aria-label="Ziplink home"
            className="rounded-[var(--radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <Logo size={28} />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>

        {intro ? (
          <p className="mt-6 text-sm leading-relaxed text-muted-strong">{intro}</p>
        ) : null}

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-strong [&_a]:text-brand-500 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-5 py-6 text-xs text-muted sm:px-6">
          © {year} Ziplink ·{" "}
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link> ·{" "}
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
