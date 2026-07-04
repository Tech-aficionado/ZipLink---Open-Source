import type { ReactNode } from "react";

interface UseCase {
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

const USE_CASES: readonly UseCase[] = [
  {
    title: "Social bios",
    description:
      "Fit a tidy, on-brand link in a cramped Instagram, TikTok, or X bio — swap the destination anytime.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
      </svg>
    ),
  },
  {
    title: "Campaign & UTM links",
    description:
      "Wrap long UTM-tagged URLs into clean short links for ads and newsletters, then watch the clicks.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M3 11 21 4l-4 16-5-6-6-3Z" />
        <path d="M12 14 21 4" />
      </svg>
    ),
  },
  {
    title: "QR for print & packaging",
    description:
      "Drop a scannable QR code on flyers, packaging, or business cards that resolves in an instant.",
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
    title: "Sharing in chats",
    description:
      "Send links in WhatsApp, Slack, or DMs without the giant preview-breaking URL wall of text.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-5.5A8 8 0 1 1 21 12Z" />
        <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
      </svg>
    ),
  },
  {
    title: "Docs & slides",
    description:
      "Reference short, readable links in decks and PDFs so anyone can type them in from a screen.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4M8.5 13h7M8.5 17h5" />
      </svg>
    ),
  },
  {
    title: "Events & QR check-ins",
    description:
      "Point badges, posters, and tickets at one memorable link — repoint it live if plans change.",
    icon: (
      <svg {...ICON_PROPS} stroke="currentColor">
        <path d="M4 7h16v4a2 2 0 0 0 0 2v4H4v-4a2 2 0 0 0 0-2V7Z" />
        <path d="M14 7v10" />
      </svg>
    ),
  },
];

/** Grid of concrete scenarios where a short link earns its keep. */
export default function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs font-medium text-muted-strong backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]" />
            Use cases
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            One link, <span className="brand-text">everywhere you share</span>
          </h2>
          <p className="mt-4 text-base text-muted-strong">
            From a single bio link to print-ready QR codes, Ziplink fits wherever
            a long URL would get in the way.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((item) => (
            <li
              key={item.title}
              className="group flex min-w-0 items-start gap-4 rounded-[var(--radius-lg)] border border-border bg-surface/50 p-5 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:bg-surface/70"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border-strong bg-surface text-brand-500 transition-colors group-hover:border-brand-400 [&>svg]:h-5.5 [&>svg]:w-5.5">
                {item.icon}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-strong">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
