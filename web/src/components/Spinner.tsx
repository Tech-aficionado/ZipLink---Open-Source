interface SpinnerProps {
  className?: string;
  label?: string;
}

/**
 * A minimal, accessible loading spinner rendered with an inline SVG so it has
 * no external dependencies.
 */
export default function Spinner({ className = "h-5 w-5", label = "Loading" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-current ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
