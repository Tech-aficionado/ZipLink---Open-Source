import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ziplink collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="July 2026"
      intro="This policy explains what information Ziplink collects, why, and what your choices are. Ziplink is open-source software — if you're using a hosted instance, the operator of that instance is the party responsible for your data."
    >
      <div className="rounded-[var(--radius)] border border-border-strong bg-surface-muted px-4 py-3 text-xs text-muted">
        This is a template intended for self-hosters to adapt. Review it with a
        professional and replace the contact details before relying on it in
        production.
      </div>

      <LegalSection title="Information we collect">
        <p>When you use Ziplink we collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — when you sign in with Google
            we receive your name, email address, and a unique account
            identifier from Firebase Authentication.
          </li>
          <li>
            <strong>Links you create</strong> — the original URL, the generated
            (or custom) short code, when it was created, its click count, and
            the time it was last opened.
          </li>
          <li>
            <strong>Basic usage data</strong> — if the operator enables
            analytics, aggregate, non-identifying usage metrics may be collected
            through Google Analytics for Firebase.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul>
          <li>To sign you in and keep your account secure.</li>
          <li>To create, store, and manage the short links you make.</li>
          <li>To show you click statistics for your own links.</li>
          <li>To operate, maintain, and improve the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Where your data is stored">
        <p>
          Account and link data are stored in{" "}
          <a href="https://firebase.google.com/" target="_blank" rel="noopener noreferrer">
            Firebase
          </a>{" "}
          (Firebase Authentication and Cloud Firestore), which runs on Google
          Cloud infrastructure and is subject to Google&apos;s security and
          privacy practices.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          Ziplink uses cookies and browser local storage only for essential
          functionality — keeping you signed in and remembering your theme
          preference. It does not use third-party advertising or cross-site
          tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="Sharing and disclosure">
        <p>
          We do not sell your personal information. Note that a short link is
          public by nature: anyone who has the short link can follow it to its
          destination. Your dashboard, click counts, and account details remain
          private to your account.
        </p>
      </LegalSection>

      <LegalSection title="Data retention and deletion">
        <p>
          You can delete any of your links at any time from your dashboard, which
          removes them from our database. To delete your account and all
          associated data, contact the operator of the instance you use.
        </p>
      </LegalSection>

      <LegalSection title="Children's privacy">
        <p>
          Ziplink is not directed to children under 13, and we do not knowingly
          collect personal information from them.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by the &quot;Last updated&quot; date at the top of this page.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy? Reach out at{" "}
          <a href="mailto:hello@example.com">hello@example.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
