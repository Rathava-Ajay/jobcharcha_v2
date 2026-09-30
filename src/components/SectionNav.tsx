import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Award, FileText, BookOpen, ShoppingBag, Newspaper, Rss, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavLink {
  id: string;
  /** Key into the "nav" namespace of the locale files — resolved with t() at render time. */
  labelKey: string;
  icon: React.ElementType;
  kind: 'section' | 'route';
  target: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: 'jobs', labelKey: 'jobs', icon: Briefcase, kind: 'section', target: 'jobs-section' },
  { id: 'results', labelKey: 'results', icon: Award, kind: 'route', target: '/results' },
  { id: 'admitcard', labelKey: 'admitcard', icon: Award, kind: 'route', target: '/admit-cards' },
  { id: 'mocktest', labelKey: 'mocktest', icon: FileText, kind: 'route', target: '/mock-tests' },
  { id: 'privatejobs', labelKey: 'privatejobs', icon: Briefcase, kind: 'route', target: '/private-jobs' },
  { id: 'schemes', labelKey: 'schemes', icon: BookOpen, kind: 'route', target: '/schemes' },
  { id: 'news', labelKey: 'news', icon: Newspaper, kind: 'route', target: '/news' },
  { id: 'blog', labelKey: 'blog', icon: Rss, kind: 'route', target: '/blog' },
  { id: 'store', labelKey: 'store', icon: ShoppingBag, kind: 'route', target: '/store' },
  { id: 'study', labelKey: 'study', icon: BookOpen, kind: 'route', target: '/study' },
  { id: 'jobalerts', labelKey: 'jobalerts', icon: Bell, kind: 'route', target: '/job-alerts' },
];

const PRIMARY_LINKS = NAV_LINKS.slice(0, 4);
const MORE_LINKS = NAV_LINKS.slice(4);

/** The horizontal section-links row used below the header — shared by Navbar and DashboardShell so it never goes missing. */
export const SectionNav: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavLink = (link: NavLink) => {
    setMoreOpen(false);
    setMobileOpen(false);
    if (link.kind === 'route') {
      navigate(link.target);
      return;
    }
    if (location.pathname === '/') {
      document.getElementById(link.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/#${link.target}`);
    }
  };

  const NavButton: React.FC<{ link: NavLink; variant?: 'pill' | 'row' }> = ({ link, variant = 'pill' }) => {
    const Icon = link.icon;
    if (variant === 'row') {
      return (
        <button
          onClick={() => handleNavLink(link)}
          className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
        >
          <Icon className="w-4 h-4 text-slate-500" />
          {t(`nav.${link.labelKey}`)}
        </button>
      );
    }
    return (
      <button
        onClick={() => handleNavLink(link)}
        className="px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold shrink-0"
      >
        <Icon className="w-3.5 h-3.5" />
        {t(`nav.${link.labelKey}`)}
      </button>
    );
  };

  return (
    <nav aria-label="Portal sections" className={`relative ${className}`}>
      {/* Desktop / tablet: a handful of primary links + a "More" dropdown for the rest */}
      <div className="hidden md:flex items-center gap-1.5">
        {PRIMARY_LINKS.map((link) => <NavButton key={link.id} link={link} />)}

        <div className="relative">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              moreOpen ? 'bg-slate-200 text-slate-900' : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            {t('nav.more')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                {MORE_LINKS.map((link) => <NavButton key={link.id} link={link} variant="row" />)}
              </div>
            </>
          )}
        </div>

        <LanguageSwitcher />
      </div>

      {/* Mobile: hamburger toggle opens a dropdown with every link */}
      <div className="md:hidden flex justify-end items-center gap-2">
        <LanguageSwitcher />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
          aria-label={t('nav.toggleMenu')}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/20 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 max-h-[70vh] overflow-y-auto md:hidden">
            {NAV_LINKS.map((link) => <NavButton key={link.id} link={link} variant="row" />)}
          </div>
        </>
      )}
    </nav>
  );
};
