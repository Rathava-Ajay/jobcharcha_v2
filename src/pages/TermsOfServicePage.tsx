import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function TermsOfServicePage() {
  useEffect(() => { document.title = 'Terms of Service | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The terms that govern your use of JobCharcha."
    >
      <section>
        <h2>Acceptance of Terms</h2>
        <p>
          By creating an account or using JobCharcha, you agree to these Terms of Service. If you do not agree, please
          do not use the platform.
        </p>
      </section>

      <section>
        <h2>Nature of Our Service</h2>
        <p>
          JobCharcha is an independent information and exam-preparation platform. We are not a government body and are
          not affiliated with UPSC, SSC, IBPS, NTA, GPSC, GSSSB, or any recruiting authority. Job notifications, admit
          cards, and results are published for informational convenience only — the official notification on the
          concerned department's website is always authoritative.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <ul>
          <li>You must provide accurate registration information and keep your credentials secure.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>We may suspend accounts used for fraud, abuse, or violation of these terms.</li>
        </ul>
      </section>

      <section>
        <h2>Premium Plans & Payments</h2>
        <ul>
          <li>Premium mock test plans and individual test purchases are processed via Razorpay and unlock automatically
            once payment is verified server-side.</li>
          <li>Prices are shown in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Refunds, where applicable, are handled per Razorpay's refund processing and reflected in your payment
            history once completed.</li>
        </ul>
      </section>

      <section>
        <h2>Acceptable Use</h2>
        <p>
          You agree not to misuse the platform — including scraping content at scale, attempting to bypass premium
          test gating, sharing your account, or submitting false information in job applications or the contact form.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          JobCharcha provides information "as is" and makes reasonable efforts to keep listings accurate, but does not
          guarantee the completeness or timeliness of third-party recruitment data. We are not liable for decisions
          made based on information found on this platform — always verify against the official source before
          applying or paying any government fee.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of JobCharcha after changes are posted
          constitutes acceptance of the revised terms.
        </p>
      </section>
    </StaticPage>
  );
}
