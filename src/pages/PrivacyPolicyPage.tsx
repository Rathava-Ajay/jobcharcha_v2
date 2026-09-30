import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function PrivacyPolicyPage() {
  useEffect(() => { document.title = 'Privacy Policy | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Data Protection"
      title="Privacy Policy & Data Security"
      subtitle="How JobCharcha collects, uses, and protects your personal information."
    >
      <section>
        <h2>Information We Collect</h2>
        <ul>
          <li>Account details you provide at signup: name, email, phone number, and role (aspirant or employer).</li>
          <li>Exam preferences, job alert subscriptions, and mock test attempt/response data tied to your account.</li>
          <li>Payment metadata for premium purchases (plan/test, amount, status) — card and UPI details are handled
            entirely by Razorpay and never stored on our servers.</li>
          <li>Basic technical data such as IP address and browser user agent, used for security and abuse prevention
            on forms like Contact and Job Alerts.</li>
        </ul>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To operate your account, save mock test progress, and show your application/payment history.</li>
          <li>To send job alerts, exam news, and admit card/result notifications you've opted into.</li>
          <li>To verify and process payments for premium plans and individual mock test purchases via Razorpay.</li>
          <li>To respond to support requests submitted through the Contact form.</li>
        </ul>
      </section>

      <section>
        <h2>Payment Data</h2>
        <p>
          All checkout is handled by Razorpay's secure hosted Checkout — JobCharcha never receives or stores your card,
          UPI, or netbanking credentials. We store only the payment status, amount, and Razorpay-issued order/payment
          identifiers needed to activate your plan or unlock a test, and every payment is independently verified
          server-side using Razorpay's signature before anything is unlocked.
        </p>
      </section>

      <section>
        <h2>Data Sharing</h2>
        <p>
          We do not sell your personal information. Data is shared only with service providers strictly necessary to
          run the platform — such as Razorpay for payments and our email provider for notifications — and with
          government or law-enforcement authorities where legally required.
        </p>
      </section>

      <section>
        <h2>Your Choices</h2>
        <p>
          You can unsubscribe from job alert emails at any time using the unsubscribe link included in every alert
          email, or by updating your preferences from your dashboard. To request deletion of your account data,
          contact us using the details below.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to <span className="font-semibold text-slate-800">support@jobcharcha.com</span>{' '}
          or via the Contact form in the footer.
        </p>
      </section>
    </StaticPage>
  );
}
