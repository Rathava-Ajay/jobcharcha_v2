import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { StaticPage } from '../components/StaticPage';

interface SiteLink {
  label: string;
  to: string;
}

const SECTIONS: { title: string; links: SiteLink[] }[] = [
  {
    title: 'Jobs & Careers',
    links: [
      { label: 'Home', to: '/' },
      { label: 'All Jobs & Vacancies', to: '/jobs' },
      { label: 'Job Alerts', to: '/job-alerts' },
      { label: 'Employer Job Posting Rules', to: '/employer-job-posting-rules' },
    ],
  },
  {
    title: 'Exam Preparation',
    links: [
      { label: 'Mock Test Dashboard', to: '/mock-tests' },
      { label: 'Daily Quiz', to: '/daily-quiz' },
      { label: 'Practice Questions', to: '/practice-questions' },
      { label: 'Old Papers', to: '/old-papers' },
      { label: 'Cut-Off Predictor', to: '/cutoff-predictor' },
      { label: 'Study Material', to: '/study' },
    ],
  },
  {
    title: 'Results & Admit Cards',
    links: [
      { label: 'Admit Cards', to: '/admit-cards' },
      { label: 'Results', to: '/results' },
    ],
  },
  {
    title: 'Schemes, News & Content',
    links: [
      { label: 'Government Schemes', to: '/schemes' },
      { label: 'Exam News', to: '/news' },
      { label: 'Blog', to: '/blog' },
      { label: 'Store', to: '/store' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login / Register', to: '/login' },
      { label: 'Aspirant Dashboard', to: '/dashboard/aspirant' },
      { label: 'Employer Dashboard', to: '/dashboard/employer' },
    ],
  },
  {
    title: 'Company & Legal',
    links: [
      { label: 'About JobCharcha', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Privacy Policy & Data Security', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

export default function SitemapPage() {
  useEffect(() => { document.title = 'Sitemap | JobCharcha'; }, []);

  return (
    <StaticPage
      eyebrow="Site Index"
      title="Sitemap & Feed Index"
      subtitle="Every page on JobCharcha, organized by section."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="flex items-center gap-1.5 !mt-0">
              <Map className="w-4 h-4 text-emerald-600" /> {section.title}
            </h2>
            <ul className="!mt-3">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-emerald-700 hover:text-emerald-800 hover:underline">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StaticPage>
  );
}
