import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function ShippingDeliveryPage() {
  useEffect(() => { document.title = 'Shipping & Delivery Policy | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Legal"
      title="Shipping & Delivery Policy"
      subtitle="JobCharcha sells digital access only — here's how and when it's delivered."
    >
      <section>
        <h2>No Physical Shipping</h2>
        <p>
          Every product sold on JobCharcha — premium mock tests, aspirant subscription passes, and employer
          credit/subscription plans — is a digital product delivered inside your account. Nothing is printed, packaged,
          or physically shipped, so there are no shipping charges, couriers, or delivery addresses involved.
        </p>
      </section>

      <section>
        <h2>Delivery Timeline</h2>
        <ul>
          <li>Access is unlocked <strong>automatically and instantly</strong> once Razorpay confirms your payment —
            typically within a few seconds of checkout.</li>
          <li>If a payment succeeds but access doesn't appear in your account within 15 minutes, do not repeat the
            payment. Contact <strong>support@jobcharcha.com</strong> with your payment ID and we'll verify and unlock
            it manually.</li>
        </ul>
      </section>

      <section>
        <h2>Where to Find What You Bought</h2>
        <p>
          Unlocked mock tests appear under your Aspirant Dashboard's "Mock Tests" tab; active subscription plans and
          payment receipts appear under "Payments." Employer credits and plan status appear on the employer
          dashboard's "Plan & Credits" tab.
        </p>
      </section>
    </StaticPage>
  );
}
