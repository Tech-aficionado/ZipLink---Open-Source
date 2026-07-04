import type { ReactNode } from "react";

interface Highlight {
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

const HIGHLIGHTS: readonly Highlight[] = [
  {
    title: "Fast by default",
    description:
      "Redirects run server-side on the edge, so every hop lands in milliseconds — no spinner, no wait.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M13 2 4.5 13.2c-.4.5 0 1.3.7 1.3H11l-1 7.5 8.5-11.2c.4-.5 0-1.3-.7-1.3H12l1-7.5Z" />
      </svg>
    ),
  },
  {
    title: "Free, forever",
    description:
      "Unlimited short links with no credit card and no trial clock. Sign in with Google and start shipping.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M12 21s-7-4.35-9.5-8.5C.8 9.5 2.2 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.8 0 5.2 4 3.5 7C19 16.65 12 21 12 21Z" />
      </svg>
    ),
  },
  {
    title: "Private to you",
    description:
      "Links are scoped to your account. No public directory, no selling data — your shortcuts stay yours.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M12 3 5 6v5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" />
        <path d="M9.5 12l1.8 1.8L15 10" />
      </svg>
    ),
  },
  {
    title: "Built to share",
    description:
      "Copy a clean link, grab a QR code, and track the clicks — everything you need to hand a link off.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" />
      </svg>
    ),
  },
];

/**
 * "Why Ziplink" band — a glass, gradient-bordered panel of standout points that
 * frames the product before the deeper feature grid.
 */
export default function Highlights() {
  return (
    <section id="why" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="border-gradient overflow-hidden">
          <div className="glass relative rounded-[inherit] px-6 py-12 sm:px-10 sm:py-14">
            {/* Soft accent glow behind the heading */}
            <div
              className="orb brand-gradient left-1/2 top-[-4rem] h-56 w-56 -translate-x-1/2 opacity-30"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs font-medium text-muted-strong backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]" />
                Why Ziplink
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                A shortener that stays{" "}
                <span className="brand-text-2">out of your way</span>
              </h2>
              <p className="mt-4 text-base text-muted-strong">
                No dashboards to learn, no plans to compare. Just fast links,
                clean design, and the data that matters.
              </p>
            </div>

            <ul className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="min-w-0">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] brand-gradient text-white shadow-[0_8px_24px_-8px_rgba(99,91,255,0.9)] [&>svg]:h-6 [&>svg]:w-6">
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-strong">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
