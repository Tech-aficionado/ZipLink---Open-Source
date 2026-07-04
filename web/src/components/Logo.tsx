interface LogoProps {
  className?: string;
  /** Show the "Ziplink" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Size of the square mark in pixels. */
  size?: number;
}

/**
 * Ziplink brand mark: a rounded gradient tile with a distinctive "Z" letterform
 * drawn as a link path — two nodes (a long link shortened to a short one) joined
 * by a zigzag. Unique to Ziplink; pure inline SVG, no external assets.
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
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: size * 0.64, height: size * 0.64 }}
        >
          {/* "Z" as a link path from top-left node to bottom-right node. */}
          <path d="M7 7.3 H17 L7 16.7 H17" />
          <circle cx="7" cy="7.3" r="2.05" fill="currentColor" stroke="none" />
          <circle cx="17" cy="16.7" r="2.05" fill="currentColor" stroke="none" />
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
