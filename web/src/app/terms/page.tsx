import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Ziplink",
  description: "The terms that govern your use of Ziplink.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="July 2026"
      intro="These terms govern your use of Ziplink. By using the service, you agree to them. Ziplink is open-source software — if you're using a hosted instance, these terms apply between you and the operator of that instance."
    >
      <div className="rounded-[var(--radius)] border border-border-strong bg-surface-muted px-4 py-3 text-xs text-muted">
        This is a template intended for self-hosters to adapt. Review it with a
        professional and replace the contact and jurisdiction details before
        relying on it in production.
      </div>

      <LegalSection title="Acceptance of terms">
        <p>
          By accessing or using Ziplink you agree to be bound by these terms. If
          you do not agree, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          Ziplink lets you shorten long URLs into short, shareable links, view
          basic click statistics, and manage the links you create. You need a
          Google account to sign in.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to use Ziplink to create links that point to:</p>
        <ul>
          <li>Unlawful, fraudulent, or deceptive content.</li>
          <li>Malware, phishing pages, or other malicious material.</li>
          <li>Content that infringes someone else&apos;s rights.</li>
          <li>Spam or content used to abuse or mislead others.</li>
        </ul>
        <p>
          You also agree not to attempt to disrupt, overload, or gain
          unauthorized access to the service.
        </p>
      </LegalSection>

      <LegalSection title="Your links and content">
        <p>
          You are responsible for the links you create and where they point. The
          operator may remove links or suspend accounts that violate these terms
          or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <p>
          The service is provided on an &quot;as available&quot; basis. Features
          may change, and the service may be updated, interrupted, or
          discontinued at any time without notice.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <p>
          Ziplink is provided &quot;as is&quot; without warranties of any kind,
          express or implied, including fitness for a particular purpose and
          non-infringement.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, the operator will not be liable
          for any indirect, incidental, or consequential damages arising from
          your use of, or inability to use, the service.
        </p>
      </LegalSection>

      <LegalSection title="Third-party destinations">
        <p>
          Short links lead to destinations we do not control. We are not
          responsible for the content, policies, or practices of any third-party
          site you reach through a short link.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using Ziplink at any time. We may suspend or terminate
          access if these terms are violated.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of the operator&apos;s
          jurisdiction, without regard to conflict-of-law rules.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms? Reach out at{" "}
          <a href="mailto:hello@example.com">hello@example.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
