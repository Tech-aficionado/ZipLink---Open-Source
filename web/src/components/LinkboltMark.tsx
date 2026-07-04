interface LinkboltMarkProps {
  className?: string;
  /** Rendered width/height in px. */
  size?: number;
  /** Stroke weight on the 24x24 viewBox. */
  strokeWidth?: number;
}

/**
 * The Ziplink "Linkbolt" mark — a chain link fused with a zip bolt.
 * Pure inline SVG using `currentColor`, no tile/background. Reusable for the
 * logo, loading splash, and hero watermark.
 */
export default function LinkboltMark({
  className = "",
  size = 24,
  strokeWidth = 1.9,
}: LinkboltMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M9 15.2 6.4 17.8a3.4 3.4 0 0 1-4.8-4.8l2.6-2.6a3.4 3.4 0 0 1 4.8 0" />
      <path d="M15 8.8l2.6-2.6a3.4 3.4 0 0 1 4.8 4.8l-2.6 2.6a3.4 3.4 0 0 1-4.8 0" />
      <path d="M13.2 9 10 12.4h2.6L10.8 15" strokeWidth={strokeWidth * 0.9} />
    </svg>
  );
}
