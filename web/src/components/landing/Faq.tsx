"use client";

import { useId, useState } from "react";

interface QaItem {
  question: string;
  answer: string;
}

const FAQS: readonly QaItem[] = [
  {
    question: "Is Ziplink free to use?",
    answer:
      "Yes. Shortening links is free with no credit card and no trial timer. Sign in with Google and create as many links as you need.",
  },
  {
    question: "Do I need an account?",
    answer:
      "A quick Google sign-in creates your private workspace so your links, aliases, and click counts are saved and scoped to you. There are no passwords to manage.",
  },
  {
    question: "Can I choose a custom alias?",
    answer:
      "Absolutely. Pick your own memorable code — like zl.ash-labs.tech/launch — when you create a link, or let Ziplink generate a short one for you.",
  },
  {
    question: "Do short links expire?",
    answer:
      "No. Your links keep working until you delete them. You can edit the destination or remove a link anytime from your dashboard.",
  },
  {
    question: "How are clicks tracked?",
    answer:
      "Each redirect increments a total click count and records when the link was last accessed, so you can see which links are landing — without invasive per-visitor profiling.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your links are tied to your account and aren't listed in any public directory. We don't sell your data; the shortcuts you create stay yours.",
  },
  {
    question: "Is Ziplink open source?",
    answer:
      "Ziplink is built on an open stack — Next.js and Firebase — with a focus on clean, inspectable behavior like standard server-side 301 redirects.",
  },
];

/** Accessible single-open accordion of common questions. */
export default function Faq() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs font-medium text-muted-strong backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]" />
            FAQ
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, <span className="brand-text">answered</span>
          </h2>
          <p className="mt-4 text-base text-muted-strong">
            Everything you might want to know before you shorten your first link.
          </p>
        </div>

        <ul className="mt-12 flex flex-col gap-3">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `${baseId}-q-${index}`;
            const panelId = `${baseId}-a-${index}`;

            return (
              <li
                key={item.question}
                className={`glass overflow-hidden rounded-[var(--radius-lg)] border transition-colors duration-200 ${
                  isOpen ? "border-brand-400" : "border-border"
                }`}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-6"
                  >
                    <span className="min-w-0 text-base font-semibold tracking-tight">
                      {item.question}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-brand-400 transition-transform duration-300"
                      style={{
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-strong sm:px-6">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
