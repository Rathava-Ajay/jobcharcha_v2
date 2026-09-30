import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Send,
  MapPin,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  Lock,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { submitContact } from '../api/contact';
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

interface FooterProps {
  /** Enables the tactile 3D card/button styling — reserved for the landing page. */
  use3d?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ use3d = false }) => {
  const { t } = useTranslation();
  // Math CAPTCHA state
  const [captchaNum1] = useState(7);
  const [captchaNum2] = useState(5);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(captchaAnswer) !== captchaNum1 + captchaNum2) {
      setContactError('Math CAPTCHA answer is incorrect. Try again.');
      return;
    }
    setContactError('');
    setContactSubmitting(true);
    try {
      await submitContact({
        name: contactName,
        email: contactEmail,
        subject: 'Footer support ticket',
        message: `Support request submitted from footer contact form by ${contactName} (${contactEmail}).`,
      });
      setContactSubmitted(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Could not submit ticket. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSubmitting(true);
    setNewsletterError('');
    try {
      await subscribeAlerts({
        email: newsletterEmail,
        preferredCategories: [],
        alertFrequency: 'instant',
        emailEnabled: true,
        whatsAppEnabled: false,
      });
      trackEmailSignup();
      setNewsletterSubscribed(true);
    } catch (err) {
      setNewsletterError(err instanceof ApiError ? err.message : 'Could not subscribe. Please try again.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const popularDistricts = [
    'Ahmedabad', 'Gandhinagar', 'Surat', 'Vadodara', 'Rajkot',
    'Bhavnagar', 'Junagadh', 'Anand', 'Mehsana', 'Jamnagar',
    'New Delhi', 'Mumbai', 'Lucknow', 'Patna', 'Jaipur'
  ];

  return (
    <footer className="bg-slate-950 text-slate-300 text-xs border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Disclaimer Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-8 text-[11px] text-amber-300 leading-relaxed">
          <span className="font-bold text-amber-400 block mb-1">{t('footer.disclaimerTitle')}</span>
          {t('footer.disclaimerBody')}
        </div>

        {/* Top Newsletter Sub Box */}
        <div className={`${use3d ? 'card-3d-dark' : 'bg-slate-900 shadow-lg'} border border-slate-800 rounded-3xl p-6 sm:p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6`}>
          <div className="max-w-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded">
              {t('footer.newsletterBadge')}
            </span>
            <h3 className="text-xl font-black text-white mt-2">{t('footer.newsletterTitle')}</h3>
            <p className="text-xs text-slate-300 mt-1">
              {t('footer.newsletterBody')}
            </p>
          </div>

          <div className="w-full md:w-auto">
            {newsletterSubscribed ? (
              <span className="text-blue-400 font-bold flex items-center gap-1.5 text-xs bg-blue-500/20 px-4 py-2.5 rounded-xl border border-blue-500/30">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> {t('footer.subscriptionActive', { email: newsletterEmail })}
              </span>
            ) : (
              <div className="w-full">
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t('footer.emailPlaceholder')}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    className={`${use3d ? 'btn-3d btn-3d-blue' : 'shadow-sm hover:shadow-md transition-shadow active:scale-95'} bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black px-5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-1 cursor-pointer`}
                  >
                    <Send className="w-3.5 h-3.5" /> {newsletterSubmitting ? t('footer.subscribing') : t('footer.subscribe')}
                  </button>
                </form>
                {newsletterError && <div className="text-rose-400 text-[10px] mt-1.5">{newsletterError}</div>}
              </div>
            )}
          </div>
        </div>

        {/* District & Location Links Grid */}
        <div className="mb-10 pb-8 border-b border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block mb-3">
            {t('footer.districtDirectory')}
          </span>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {popularDistricts.map((dist) => (
              <Link
                key={dist}
                to={`/jobs?district=${encodeURIComponent(dist)}`}
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
              >
                {t('footer.jobsIn', { district: dist })}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center">
              <img
                src="/icons/jobcharcha_logo_transparent.png"
                alt="JobCharcha"
                width={570}
                height={100}
                loading="lazy"
                className="h-7 w-auto object-contain"
              />
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('footer.brandBlurb')}
            </p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <div>{t('footer.emailLabel')}</div>
              <div>{t('footer.phoneLabel')}</div>
            </div>
          </div>

          {/* Col 2: Exam Categories & Syllabus */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">{t('footer.examsSyllabus')}</h4>
            <ul className="space-y-2 text-xs">
              {EXAM_GUIDE_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <Link to={`/mock-tests?categoryId=${link.categoryId}`} className="hover:text-white transition-colors">{t(link.labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Useful Links & Info Pages */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">{t('footer.informationPages')}</h4>
            <ul className="space-y-2 text-xs">
              {INFO_PAGES.map((link) => (
                <li key={link.labelKey}>
                  <Link to={link.to} className="hover:text-white transition-colors">{t(link.labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Anti-Bot Contact Form with Math CAPTCHA */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" /> {t('footer.supportContact')}
            </h4>

            {contactSubmitted ? (
              <div className="bg-blue-500/20 text-blue-300 p-3 rounded-xl text-[11px] text-center border border-blue-500/30">
                {t('footer.ticketSubmitted')}
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t('footer.namePlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t('footer.emailFieldPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />

                {/* Math CAPTCHA */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-semibold">
                    {t('footer.solveCaptcha')} <span className="font-bold text-blue-400">{captchaNum1} + {captchaNum2} = ?</span>
                  </span>
                  <input
                    type="number"
                    required
                    aria-label={`Answer the anti-bot question: ${captchaNum1} plus ${captchaNum2}`}
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700 text-white text-center rounded text-xs py-1 focus:outline-none font-bold"
                  />
                </div>

                {contactError && <div className="text-rose-400 text-[10px]">{contactError}</div>}

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {contactSubmitting ? t('footer.sending') : t('footer.sendTicket')}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Copyright Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>{t('footer.copyright')}</div>
          <div className="flex gap-4">
            <span>{t('footer.sslEncrypted')}</span>
            <span>{t('footer.encryptedStorage')}</span>
            <span>{t('footer.razorpayPayments')}</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
