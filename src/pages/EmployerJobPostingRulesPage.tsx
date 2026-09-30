import React, { useEffect } from 'react';
import { StaticPage } from '../components/StaticPage';

export default function EmployerJobPostingRulesPage() {
  useEffect(() => { document.title = 'Employer Job Posting Rules | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="For Employers"
      title="Employer Job Posting Rules"
      subtitle="Guidelines every recruiter must follow when posting on JobCharcha."
    >
      <section>
        <h2>Who Can Post</h2>
        <p>
          Job postings are open to verified employer accounts — private companies, staffing agencies, and government
          bodies posting official recruitment notices. Employer accounts are reviewed before posting privileges are
          fully activated.
        </p>
      </section>

      <section>
        <h2>Posting Requirements</h2>
        <ul>
          <li>Listings must be for genuine, currently-open vacancies — no expired, duplicate, or placeholder postings.</li>
          <li>Include an accurate title, organization name, category, location, qualification, and last date to apply.</li>
          <li>Salary information, where disclosed, must reflect the actual offered range.</li>
          <li>Application links must point to your own careers page or official application form — never to a
            third-party paywall or unrelated site.</li>
        </ul>
      </section>

      <section>
        <h2>Prohibited Content</h2>
        <ul>
          <li>Postings that charge candidates a fee to apply, interview, or receive an offer.</li>
          <li>Discriminatory requirements not permitted under applicable Indian labour law.</li>
          <li>Multi-level marketing, pyramid schemes, or postings unrelated to genuine employment.</li>
          <li>Misleading job titles, salaries, or company names.</li>
        </ul>
      </section>

      <section>
        <h2>Moderation & Removal</h2>
        <p>
          JobCharcha reserves the right to edit, unpublish, or remove any listing that violates these rules, and to
          suspend employer accounts found posting fraudulent or repeatedly non-compliant vacancies. Candidates can
          report a suspicious listing via the Contact form.
        </p>
      </section>

      <section>
        <h2>Employer Plans</h2>
        <p>
          Job posting limits and candidate-contact features are tied to your employer subscription plan. Upgrading,
          downgrading, or renewing a plan is available from your Employer Dashboard.
        </p>
      </section>
    </StaticPage>
  );
}
