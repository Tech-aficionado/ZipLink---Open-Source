interface Stat {
  value: string;
  label: string;
}

const STATS: readonly Stat[] = [
  { value: "10 M+", label: "links shortened" },
  { value: "sub-50ms", label: "edge redirects" },
  { value: "99.9%", label: "uptime" },
  { value: "∞", label: "free links" },
];

/**
 * A compact strip of headline marketing stats. Numbers are illustrative.
 */
export default function StatStrip() {
  return (
    <section aria-label="Ziplink by the numbers" className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 px-4 py-7 text-center"
            >
              <span className="text-3xl font-semibold tracking-tight brand-text sm:text-4xl">
                {stat.value}
              </span>
              <span className="text-sm text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
