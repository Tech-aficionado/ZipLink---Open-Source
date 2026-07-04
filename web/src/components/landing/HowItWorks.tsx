interface Step {
  title: string;
  description: string;
}

const STEPS: readonly Step[] = [
  {
    title: "Sign in with Google",
    description:
      "One tap to create your private workspace. No forms, no passwords to remember.",
  },
  {
    title: "Paste a URL",
    description:
      "Drop in any long link and, if you like, pick a custom alias to make it yours.",
  },
  {
    title: "Share & track",
    description:
      "Copy the short link or its QR code, then watch the clicks roll in from your dashboard.",
  },
];

/** Three numbered steps explaining the core flow. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Live in <span className="brand-text-2">three steps</span>
          </h2>
          <p className="mt-4 text-base text-muted-strong">
            From long URL to trackable short link in under a minute.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-[var(--radius-lg)] border border-border bg-surface/50 p-6 backdrop-blur"
            >
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-full brand-gradient text-base font-semibold text-white shadow-[0_6px_20px_-6px_rgba(99,91,255,0.8)]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-strong">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
