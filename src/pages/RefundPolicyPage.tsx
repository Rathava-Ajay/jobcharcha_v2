import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function RefundPolicyPage() {
  useEffect(() => { document.title = 'Refund & Cancellation Policy | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      subtitle="How refunds and cancellations work for JobCharcha's paid plans and purchases."
    >
      <section>
        <h2>What You Can Buy on JobCharcha</h2>
        <p>
          JobCharcha sells digital access only — individual premium mock tests, aspirant subscription passes, and
          employer credit/subscription plans. Nothing is physically shipped; every purchase unlocks access inside
          your account automatically once payment is confirmed by Razorpay.
        </p>
      </section>

      <section>
        <h2>Cancellation</h2>
        <ul>
          <li>One-off purchases (e.g. a single premium mock test) are consumed immediately on purchase and cannot be
            "cancelled" after checkout.</li>
          <li>Subscription passes and employer plans do not auto-renew unless you're explicitly told otherwise at
            checkout; there is no recurring mandate to cancel. To stop using a plan, simply let it lapse at the end
            of its term.</li>
        </ul>
      </section>

      <section>
        <h2>When You're Eligible for a Refund</h2>
        <ul>
          <li>You were charged but never received access (payment succeeded on Razorpay's side but the purchased
            test/plan did not unlock in your account).</li>
          <li>You were charged more than once for the same purchase due to a technical error.</li>
          <li>You were charged for a plan or test that was materially different from what was advertised at checkout.</li>
        </ul>
        <p>
          Refund requests must be raised within <strong>7 days</strong> of the transaction date. Once a mock test's
          questions have been opened and attempted, that specific test purchase is no longer refundable — the content
          has been delivered and consumed.
        </p>
      </section>

      <section>
        <h2>How to Request a Refund</h2>
        <p>
          Email <strong>support@jobcharcha.com</strong> (or use the <a href="/contact">Contact page</a>) with your
          registered email address, the payment ID or date, and the reason for the request. We review each request
          manually and respond within 3–5 business days.
        </p>
      </section>

      <section>
        <h2>Refund Timeline</h2>
        <p>
          Approved refunds are issued to your original payment method via Razorpay. Once processed on our side, banks
          and card networks typically take <strong>5–7 business days</strong> to reflect the credit — this part of the
          timeline is outside JobCharcha's control.
        </p>
      </section>
    </StaticPage>
  );
}
