import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Briefcase, Award, Ticket, PenLine } from 'lucide-react';
import { isNavActive } from './Navbar';
import { useBodyClass } from '../hooks/useBodyClass';

const TABS = [
  { key: 'home', to: '/', icon: Home },
  { key: 'jobs', to: '/jobs', icon: Briefcase, match: ['/jobs', '/private-jobs', '/saved-jobs'] },
  { key: 'results', to: '/results', icon: Award, match: ['/results'] },
  { key: 'admitcard', to: '/admit-cards', icon: Ticket, match: ['/admit-cards'] },
  { key: 'tests', to: '/mock-tests', icon: PenLine, match: ['/mock-tests', '/daily-quiz', '/old-papers', '/practice-questions'] },
];

/** Screens with their own sticky bottom action bar, or full-screen flows, where a tab bar would get in the way. */
const HIDDEN = [
  /^\/dashboard/, /^\/admin/, /^\/login/, /^\/join/, /^\/unsubscribe/, /^\/attempts\//,
  /^\/jobs\/[^/]+/, /^\/private-jobs\/[^/]+/, /^\/mock-tests\/[^/]+/, /^\/daily-quiz/,
  /^\/results\/[^/]+/, /^\/admit-cards\/[^/]+/,
];

/** Thumb-reach navigation for phones: the five things people come to JobCharcha for. */
export const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const hidden = HIDDEN.some((re) => re.test(pathname));
  // Reserves room for the bar (plus the iPhone home-indicator area) at the very bottom of the page.
  useBodyClass('has-tabbar', !hidden);
  if (hidden) return null;

  return (
    <>
      <nav
        aria-label="Quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {TABS.map((tab) => {
          const active = isNavActive(tab, pathname);
          return (
            <Link
              key={tab.key}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold ${active ? 'text-blue-700' : 'text-slate-500'}`}
            >
              <tab.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.9} />
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
    </>
  );
};
