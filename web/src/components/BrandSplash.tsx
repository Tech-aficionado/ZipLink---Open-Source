import LinkboltMark from "@/components/LinkboltMark";

interface BrandSplashProps {
  label?: string;
}

/**
 * Full-screen branded loading splash: the Linkbolt mark on a gradient tile,
 * pulsing with a neon glow, over a subtle grid. Used while auth state resolves.
 */
export default function BrandSplash({ label = "Loading…" }: BrandSplashProps) {
  return (
    <div className="glow relative flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 bg-background">
      <div
        className="grid-bg grid-fade pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <span className="animate-pulse-glow relative inline-flex h-16 w-16 items-center justify-center rounded-[28%] brand-gradient text-white">
        <LinkboltMark size={40} strokeWidth={2} />
      </span>
      <span className="relative text-sm text-muted">{label}</span>
    </div>
  );
}
