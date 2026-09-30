import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Bell, CheckCircle2, ShieldCheck } from 'lucide-react';
import { subscribeAlerts } from '../api/alerts';
import { ApiError } from '../api/client';
import { trackEmailSignup } from '../utils/analytics';

/** Real mock-test category IDs behind each exam-guide link (from live /api/categories). */
const EXAM_GUIDE_LINKS: { labelKey: string; categoryId: number }[] = [
  { labelKey: 'footer.examGuides.upsc', categoryId: 68 },
  { labelKey: 'footer.examGuides.ssc', categoryId: 6 },
  { labelKey: 'footer.examGuides.ibps', categoryId: 8 },
  { labelKey: 'footer.examGuides.rrb', categoryId: 7 },
  { labelKey: 'footer.examGuides.statePsc', categoryId: 2 },
];

const INFO_PAGES: { labelKey: string; to: string }[] = [
  { labelKey: 'footer.infoPages.about', to: '/about' },
  { labelKey: 'footer.infoPages.privacy', to: '/privacy' },
  { labelKey: 'footer.infoPages.terms', to: '/terms' },
  { labelKey: 'footer.infoPages.refund', to: '/refund-policy' },
  { labelKey: 'footer.infoPages.shipping', to: '/shipping-policy' },
  { labelKey: 'footer.infoPages.employerRules', to: '/employer-job-posting-rules' },
  { labelKey: 'footer.infoPages.sitemap', to: '/sitemap' },
];

const EXPLORE: { label: string; to: string }[] = [
  { label: 'Latest Govt Jobs', to: '/jobs' },
  { label: 'Private Jobs', to: '/private-jobs' },
  { label: 'Results', to: '/results' },
  { label: 'Admit Cards', to: '/admit-cards' },
  { label: 'Mock Tests', to: '/mock-tests' },
  { label: 'Daily Quiz', to: '/daily-quiz' },
  { label: 'Contact / Help', to: '/contact' },
];

const POPULAR_DISTRICTS = [
  'Ahmedabad', 'Gandhinagar', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Junagadh', 'Anand',
  'Mehsana', 'Jamnagar', 'New Delhi', 'Mumbai', 'Lucknow', 'Patna', 'Jaipur',
];

interface FooterProps {
  /** Kept for backwards compatibility with existing call sites; the footer has one look now. */
  use3d?: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError('');
    try {
      await subscribeAlerts({ email, preferredCategories: [], alertFrequency: 'instant', emailEnabled: true, whatsAppEnabled: false });
      trackEmailSignup();
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not subscribe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-[13px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Alerts band */}
        <div className="mt-8 sm:mt-10 rounded-2xl bg-slate-900 text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <p className="text-lg sm:text-xl font-extrabold">Never miss a last date</p>
            <p className="text-slate-300 mt-1">Get new government jobs, results and admit cards in your inbox. Free — unsubscribe anytime.</p>
          </div>
          {subscribed ? (
            <p className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 className="w-5 h-5" /> {t('footer.subscriptionActive', { email })}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 md:w-[440px]">
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-emerald-400"
              />
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl px-5 py-3 text-sm cursor-pointer">
                <Bell className="w-4 h-4" /> {submitting ? t('footer.subscribing') : 'Get alerts'}
              </button>
              {error && <p className="sm:hidden text-red-300 text-xs">{error}</p>}
            </form>
          )}
        </div>
        {error && <p className="hidden sm:block text-red-600 text-xs mt-2 text-right">{error}</p>}

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 py-10">
          <div className="col-span-2 md:col-span-1">
            <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} loading="lazy" className="h-8 w-auto" />
            <p className="mt-3 leading-relaxed max-w-xs">{t('footer.brandBlurb')}</p>
            <div className="mt-4 space-y-1.5">
              <a href="mailto:support@jobcharcha.com" className="flex items-center gap-2 hover:text-slate-900"><Mail className="w-4 h-4 text-slate-400" /> support@jobcharcha.com</a>
              <a href="tel:+919136995118" className="flex items-center gap-2 hover:text-slate-900"><Phone className="w-4 h-4 text-slate-400" /> +91 91369 95118</a>
            </div>
          </div>
          <FooterCol title="Explore" links={EXPLORE.map((l) => ({ label: l.label, to: l.to }))} />
          <FooterCol title={t('footer.examsSyllabus')} links={EXAM_GUIDE_LINKS.map((l) => ({ label: t(l.labelKey), to: `/mock-tests?categoryId=${l.categoryId}` }))} />
          <FooterCol title={t('footer.informationPages')} links={INFO_PAGES.map((l) => ({ label: t(l.labelKey), to: l.to }))} />
        </div>

        {/* City directory — compact, but kept for people (and search engines) looking by location */}
        <div className="border-t border-slate-100 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Jobs by city</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {POPULAR_DISTRICTS.map((d) => (
              <Link key={d} to={`/jobs?district=${encodeURIComponent(d)}`} className="hover:text-emerald-700">{t('footer.jobsIn', { district: d })}</Link>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 py-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-slate-500">
          <p className="flex items-start gap-2 max-w-3xl">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
            <span>JobCharcha is an independent information portal and is not affiliated with any government body. Always confirm details on the official website before applying.</span>
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} JobCharcha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const FooterCol: React.FC<{ title: string; links: { label: string; to: string }[] }> = ({ title, links }) => (
  <div>
    <h4 className="text-slate-900 font-bold text-[13px] mb-3">{title}</h4>
    <ul className="space-y-2">
      {links.map((l) => (
        <li key={l.to + l.label}><Link to={l.to} className="hover:text-emerald-700">{l.label}</Link></li>
      ))}
    </ul>
  </div>
);
