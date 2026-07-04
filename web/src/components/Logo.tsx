interface LogoProps {
  className?: string;
  /** Show the "Ziplink" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Size of the square mark in pixels. */
  size?: number;
}

/**
 * Ziplink brand mark: a rounded gradient tile with a lightning "zip" bolt,
 * optionally followed by the wordmark. Pure inline SVG — no external assets.
 */
export default function Logo({
  className = "",
  withWordmark = true,
  size = 32,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-[28%] brand-gradient text-white shadow-[0_6px_16px_-4px_rgba(109,94,252,0.6)]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: size * 0.62, height: size * 0.62 }}
        >
          {/* Linkbolt: a chain link fused with a zip bolt */}
          <path d="M9 15.2 6.4 17.8a3.4 3.4 0 0 1-4.8-4.8l2.6-2.6a3.4 3.4 0 0 1 4.8 0" />
          <path d="M15 8.8l2.6-2.6a3.4 3.4 0 0 1 4.8 4.8l-2.6 2.6a3.4 3.4 0 0 1-4.8 0" />
          <path d="M13.2 9 10 12.4h2.6L10.8 15" strokeWidth={1.7} />
        </svg>
      </span>
      {withWordmark ? (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Zip<span className="brand-text">link</span>
        </span>
      ) : null}
    </span>
  );
}
