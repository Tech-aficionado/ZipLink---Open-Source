import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * Custom 404 page. Rendered for unmatched routes and any `notFound()` call,
 * within the root layout so it inherits the app chrome and theme.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="app-aurora" aria-hidden="true" />
      <div className="glass-card glass-ring relative z-10 w-full max-w-md overflow-hidden p-8">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 brand-gradient" />
        <div className="flex justify-center">
          <Logo withWordmark={false} size={44} />
        </div>
        <p className="mt-5 text-5xl font-bold brand-text tabular-nums">404</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Check the
          link and try again.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] brand-gradient px-5 text-sm font-medium text-white shadow-[0_8px_30px_-8px_rgba(99,91,255,0.8)] transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:border-brand-400 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
