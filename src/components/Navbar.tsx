import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Clock, Search, Menu, X, ChevronDown, Home, Briefcase, Award, Ticket, PenLine, Building2,
  Flame, FileText, BookOpen, Target, Landmark, Newspaper, Rss, ShoppingBag, Bell, Bookmark,
} from 'lucide-react';
import { UserProfile } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  user: UserProfile | null;
  onOpenExamTracker?: () => void;
}

interface NavItem {
  key: string;
  to: string;
  icon: React.ElementType;
  /** Extra path prefixes that should light this item up (e.g. /jobs/:slug under Jobs). */
  match?: string[];
}

/** Always-visible links on desktop, in reading order. */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'home', to: '/', icon: Home },
  { key: 'jobs', to: '/jobs', icon: Briefcase, match: ['/jobs'] },
  { key: 'results', to: '/results', icon: Award, match: ['/results'] },
  { key: 'admitcard', to: '/admit-cards', icon: Ticket, match: ['/admit-cards'] },
  { key: 'mocktest', to: '/mock-tests', icon: PenLine, match: ['/mock-tests', '/attempts'] },
];

/** Grouped links shown under "More" (desktop) and in the mobile menu. */
export const MORE_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'explore',
    items: [
      { key: 'privatejobs', to: '/private-jobs', icon: Building2, match: ['/private-jobs'] },
      { key: 'saved', to: '/saved-jobs', icon: Bookmark },
      { key: 'jobalerts', to: '/job-alerts', icon: Bell },
      { key: 'schemes', to: '/schemes', icon: Landmark, match: ['/schemes'] },
      { key: 'news', to: '/news', icon: Newspaper, match: ['/news'] },
      { key: 'blog', to: '/blog', icon: Rss, match: ['/blog'] },
    ],
  },
  {
    group: 'prepare',
    items: [
      { key: 'dailyquiz', to: '/daily-quiz', icon: Flame, match: ['/daily-quiz'] },
      { key: 'oldpapers', to: '/old-papers', icon: FileText, match: ['/old-papers'] },
      { key: 'practice', to: '/practice-questions', icon: BookOpen },
      { key: 'cutoff', to: '/cutoff-predictor', icon: Target },
      { key: 'study', to: '/study', icon: BookOpen },
      { key: 'store', to: '/store', icon: ShoppingBag },
    ],
  },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/') return pathname === '/';
  return [item.to, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenExamTracker }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => { setMoreOpen(false); setMenuOpen(false); }, [pathname]);

  // Lock page scroll behind the mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const accountPath = user ? `/dashboard/${user.role === 'superadmin' ? 'admin' : user.role}` : '/login';
  const firstName = user?.name?.split(' ')[0];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/jobs?search=${encodeURIComponent(q)}` : '/jobs');
  };

  const moreActive = MORE_NAV.some((g) => g.items.some((i) => isNavActive(i, pathname)));

  return (
    <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur border-b transition-shadow ${scrolled ? 'border-slate-200 shadow-[0_1px_8px_rgba(15,23,42,0.06)]' : 'border-slate-200/70'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-3 lg:gap-5">
          <Link to="/" className="flex items-center shrink-0" aria-label="JobCharcha home">
            <img
              src="/icons/jobcharcha_logo_transparent.png"
              alt="JobCharcha"
              width={570}
              height={100}
              fetchPriority="high"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5">
            {PRIMARY_NAV.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors ${moreOpen || moreActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {t('nav.more')} <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 grid grid-cols-2 gap-3">
                    {MORE_NAV.map((g) => (
                      <div key={g.group}>
                        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t(`nav.${g.group}`)}</p>
                        {g.items.map((item) => (
                          <Link key={item.key} to={item.to} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            <item.icon className="w-4 h-4 text-slate-400" /> {t(`nav.${item.key}`)}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          <form onSubmit={submitSearch} role="search" className="hidden xl:flex flex-1 max-w-xs ml-auto items-center gap-2 bg-slate-100/70 border border-slate-200 rounded-xl px-3 focus-within:bg-white focus-within:border-emerald-600 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
            />
          </form>

          <div className="flex items-center gap-2 ml-auto xl:ml-0 shrink-0">
            <Link to="/jobs" aria-label={t('nav.search')} className="xl:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100">
              <Search className="w-5 h-5" />
            </Link>
            <LanguageSwitcher className="hidden sm:flex" />
            {onOpenExamTracker && (
              <button
                type="button"
                onClick={onOpenExamTracker}
                title={t('nav.examtracker')}
                className="hidden lg:flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              >
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="hidden 2xl:inline">{t('nav.examtracker')}</span>
              </button>
            )}
            <Link
              to={accountPath}
              aria-label={user ? `Open ${firstName}'s dashboard` : 'Login or register'}
              className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold"
            >
              <User className="w-4 h-4" />
              {user ? firstName : t('nav.login')}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.toggleMenu')}
              aria-expanded={menuOpen}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[86%] max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
              <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-7 w-auto" />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <Link to={accountPath} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 text-white">
                <span className="w-10 h-10 rounded-full bg-white/10 grid place-items-center"><User className="w-5 h-5" /></span>
                <span className="flex-1">
                  <span className="block font-bold">{user ? user.name : t('nav.login')}</span>
                  <span className="block text-xs text-slate-300">{user ? 'Open my dashboard' : 'Save jobs, get alerts, track exams'}</span>
                </span>
              </Link>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">{t('nav.language')}</span>
                <LanguageSwitcher />
              </div>
              {[{ group: 'main', items: PRIMARY_NAV }, ...MORE_NAV].map((g) => (
                <div key={g.group}>
                  {g.group !== 'main' && <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t(`nav.${g.group}`)}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {g.items.map((item) => {
                      const active = isNavActive(item, pathname);
                      return (
                        <Link
                          key={item.key}
                          to={item.to}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700'}`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" /> <span className="truncate">{t(`nav.${item.key}`)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              {onOpenExamTracker && (
                <button type="button" onClick={() => { setMenuOpen(false); onOpenExamTracker(); }} className="w-full flex items-center gap-2 p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer">
                  <Clock className="w-4 h-4 text-indigo-600" /> {t('nav.examtracker')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
