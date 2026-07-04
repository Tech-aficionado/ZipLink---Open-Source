import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FEATURES: readonly Feature[] = [
  {
    title: "Custom aliases",
    description:
      "Pick your own memorable code — zl.ash-labs.tech/launch — or let Ziplink generate one instantly.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L12.5 19.5" />
      </svg>
    ),
  },
  {
    title: "QR codes",
    description:
      "Every link gets a scannable QR code you can preview and download for print or screen.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3M21 14v.01M17 21h4v-4M14 21h.01" />
      </svg>
    ),
  },
  {
    title: "Click analytics",
    description:
      "Track total clicks and last-accessed times so you know which links are landing.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16l3.5-4 3 2.5L20 8" />
      </svg>
    ),
  },
  {
    title: "Google sign-in · private",
    description:
      "One-tap Google auth. Your links are scoped to your account and yours alone.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <rect x="4" y="10" width="16" height="11" rx="2.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5" />
      </svg>
    ),
  },
  {
    title: "Instant redirects",
    description:
      "Server-side 301 redirects run on the edge for near-instant, reliable hops.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M13 2 4.5 13.2c-.4.5 0 1.3.7 1.3H11l-1 7.5 8.5-11.2c.4-.5 0-1.3-.7-1.3H12l1-7.5Z" />
      </svg>
    ),
  },
  {
    title: "Dark, futuristic UI",
    description:
      "A dark-first interface with glass surfaces, neon accents, and subtle motion.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
      </svg>
    ),
  },
];

/** Responsive grid of glass feature cards with hover glow. */
export default function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs font-medium text-muted-strong backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]" />
            Features
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to{" "}
            <span className="brand-text">share smarter</span>
          </h2>
          <p className="mt-4 text-base text-muted-strong">
            A focused toolkit for turning long links into fast, trackable, and
            beautiful short URLs.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="glass group rounded-[var(--radius-lg)] border border-border p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:glow-ring"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] border border-border-strong bg-surface text-brand-500 transition-colors group-hover:border-brand-400 [&>svg]:h-5.5 [&>svg]:w-5.5">
                {feature.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-strong">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
