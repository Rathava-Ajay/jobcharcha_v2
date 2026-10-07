import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function AboutPage() {
  useEffect(() => { document.title = 'About Us | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Our Mission"
      title="About JobCharcha"
      subtitle="An independent portal for Gujarat and central government job alerts, results, admit cards and mock tests."
    >
      <section>
        <h2>Who We Are</h2>
        <p>
          JobCharcha is an independent educational and recruitment information portal built to help job aspirants across
          India — with a focus on Gujarat state government exams — find vacancy notifications, admit cards,
          results, and exam preparation resources in one place. We aggregate publicly available recruitment information
          from official sources and present it in a clear, searchable format alongside CBT-style mock tests to help
          candidates prepare.
        </p>
      </section>

      <section>
        <h2>What We Offer</h2>
        <ul>
          <li>Verified job notifications across OJAS, GPSC, GSSSB, SSC, Railways, Banking, and more.</li>
          <li>Admit card and result tracking with direct links to official download portals.</li>
          <li>Computer-based mock tests with instant scoring, negative marking, and detailed analytics.</li>
          <li>Government scheme and exam news coverage for scholarships, welfare programs, and syllabus updates.</li>
          <li>Personalized job alerts by email so candidates never miss a deadline.</li>
        </ul>
      </section>

      <section>
        <h2>Independence & Accuracy</h2>
        <p>
          JobCharcha is not affiliated with UPSC, SSC, IBPS, NTA, GPSC, GSSSB, or any government department. All
          recruitment details are sourced from official notifications for quick public guidance; candidates should
          always cross-verify eligibility, dates, and application steps on the concerned official website before
          applying or paying any fee.
        </p>
      </section>

      <section>
        <h2>Get in Touch</h2>
        <p>
          Have a correction, a partnership idea, or feedback on the platform? Reach us through the contact form in the
          footer of any page, or write to us at <span className="font-semibold text-slate-800">support@jobcharcha.com</span>.
        </p>
      </section>
    </StaticPage>
  );
}
