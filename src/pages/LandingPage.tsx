import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ShieldCheck, Briefcase, Award, Ticket, Flame, PenLine, FileText, Target, ChevronRight, ChevronDown, Download,
  GraduationCap, MapPin,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExamTrackerSidebar } from '../components/ExamTrackerSidebar';
import { SchemesNewsSection } from '../components/SchemesNewsSection';
import { PricingSection } from '../components/PricingSection';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { searchJobs } from '../api/jobs';
import { getAdmitCards, ApiAdmitCardListItem } from '../api/admitCards';
import { getResults, ApiResultListItem } from '../api/results';
import { getFeaturedCategories, ApiCategory } from '../api/categories';
import { getTodayQuiz, ApiDailyQuiz } from '../api/dailyQuiz';
import { Card, Chip, DeadlinePill, OrgAvatar, Pill, SectionHeader, btn, cx } from '../components/ui/kit';
import { QUALIFICATION_OPTIONS, LOCATION_OPTIONS } from '../utils/jobFilters';
import { daysSince, daysUntil, fmtShortDate } from '../utils/dates';

const FALLBACK_POPULAR = ['GPSC', 'GSSSB', 'Police Bharti', 'Talati', 'Teacher Bharti', 'Bank Jobs', 'Railway Jobs', 'SSC'];

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [latest, setLatest] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [latestLoading, setLatestLoading] = useState(true);
  const [closing, setClosing] = useState<Job[]>([]);
  const [results, setResults] = useState<ApiResultListItem[]>([]);
  const [admitCards, setAdmitCards] = useState<ApiAdmitCardListItem[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [quiz, setQuiz] = useState<ApiDailyQuiz | null>(null);
  const [qual, setQual] = useState('');
  const [showTracker, setShowTracker] = useState(false);
  const [planRole, setPlanRole] = useState<'aspirant' | 'employer'>('aspirant');

  useEffect(() => {
    document.title = 'JobCharcha - Verified Government & Private Job Vacancies 2026';
    searchJobs({ closingWithinDays: 10, sort: 'deadline', pageSize: 5 }).then((r) => setClosing(r.items)).catch(() => setClosing([]));
    getResults().then(setResults).catch(() => setResults([]));
    getAdmitCards().then(setAdmitCards).catch(() => setAdmitCards([]));
    getFeaturedCategories().then(setCategories).catch(() => setCategories([]));
    getTodayQuiz().then(setQuiz).catch(() => setQuiz(null));
  }, []);

  // Latest jobs, re-queried when the qualification chip changes.
  useEffect(() => {
    setLatestLoading(true);
    searchJobs({ qualification: qual || undefined, openOnly: true, pageSize: 6 })
      .then((r) => { setLatest(r.items); if (!qual) setTotalJobs(r.totalCount); })
      .catch(() => setLatest([]))
      .finally(() => setLatestLoading(false));
  }, [qual]);

  // Old deep links (/#jobs-section etc.) still land somewhere sensible.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    return () => clearTimeout(timer);
  }, [location.hash, latestLoading]);

  const popular = categories.length ? categories.slice(0, 8).map((c) => c.name) : FALLBACK_POPULAR;
  const closingIn3 = closing.filter((j) => { const d = daysUntil(j.lastDate); return d !== null && d >= 0 && d <= 3; }).length;
  const releasedAdmits = admitCards.filter((a) => a.status === 'Released').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onOpenExamTracker={() => setShowTracker(true)} />

      <main className="flex-1">
        <SearchBand
          popular={popular}
          onSearch={(q) => navigate(`/jobs?${q}`)}
          stats={[
            { value: totalJobs, label: t('home.activeJobs'), to: '/jobs' },
            { value: results.length, label: t('home.results'), to: '/results' },
            { value: releasedAdmits || admitCards.length, label: t('home.admitCards'), to: '/admit-cards' },
            { value: closingIn3, label: 'closing in 3 days', to: '/jobs?sort=deadline&closing=3', alert: true },
          ]}
          overlap={closing.length > 0}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Closing soon — overlaps the band so the most urgent jobs are the first thing seen */}
          {closing.length > 0 && (
            <section aria-label={t('home.closingSoon')} className="relative -mt-9 sm:-mt-11">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {closing.slice(0, 4).map((j, i) => (
                  <Link
                    key={j.id}
                    to={`/jobs/${j.slug ?? j.id}`}
                    className={cx(
                      'min-w-0 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.4)] hover:border-emerald-500 transition-colors',
                      i >= 2 && 'hidden lg:flex',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <OrgAvatar name={j.companyOrDept} size="sm" />
                      <DeadlinePill date={j.lastDate} />
                    </span>
                    <span className="font-bold text-[14px] leading-snug text-slate-900 line-clamp-2 break-words">{j.title}</span>
                    <span className="text-xs text-slate-500 truncate">{j.companyOrDept}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Live board: latest jobs, results, admit cards side by side */}
          <section id="jobs-section" className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 scroll-mt-24">
            <BoardCard
              className="md:col-span-2 lg:col-span-1"
              icon={Briefcase}
              tone="bg-emerald-50 text-emerald-700"
              title={t('home.latestJobs')}
              action={{ label: totalJobs ? t('home.allJobsCta', { count: totalJobs }) : t('home.viewAll'), to: qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs' }}
              toolbar={
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2 border-b border-slate-100">
                  <Chip active={!qual} onClick={() => setQual('')} className="!py-1 !px-2.5 !text-xs">All</Chip>
                  {QUALIFICATION_OPTIONS.slice(0, 5).map((o) => (
                    <Chip key={o.value} active={qual === o.value} onClick={() => setQual(o.value)} className="!py-1 !px-2.5 !text-xs">{o.label}</Chip>
                  ))}
                </div>
              }
            >
              {latestLoading ? <BoardSkeleton rows={5} /> : latest.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-slate-500">{t('home.noJobs')}</p>
              ) : latest.map((j) => (
                <Link key={j.id} to={`/jobs/${j.slug ?? j.id}`} className="flex gap-3 px-4 py-3 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 group min-w-0">
                  <OrgAvatar name={j.companyOrDept} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-bold leading-snug text-slate-900 line-clamp-2 break-words group-hover:text-emerald-800">{j.title}</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {j.qualification && <span className="inline-flex items-center gap-1 min-w-0 max-w-full"><GraduationCap className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{j.qualification}</span></span>}
                      {j.location && <span className="inline-flex items-center gap-1 min-w-0 max-w-full"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{j.location}</span></span>}
                    </span>
                  </span>
                  <span className="shrink-0 self-start flex flex-col items-end gap-1">
                    <DeadlinePill date={j.lastDate} />
                    {(daysSince(j.postedDate) ?? 9) <= 2 && <Pill tone="green">{t('home.new')}</Pill>}
                  </span>
                </Link>
              ))}
            </BoardCard>

            <BoardCard icon={Award} tone="bg-blue-50 text-blue-700" title={t('home.results')} action={{ label: t('home.viewAll'), to: '/results' }}>
              {results.length === 0 ? <BoardEmpty /> : results.slice(0, 7).map((r) => (
                <BoardLink key={r.id} to={`/results/${r.slug}`} title={r.title}
                  right={(daysSince(r.resultDate) ?? 9) <= 3 ? <Pill tone="blue">{t('home.new')}</Pill> : <span className="text-xs text-slate-400 whitespace-nowrap">{fmtShortDate(r.resultDate)}</span>} />
              ))}
            </BoardCard>

            <BoardCard icon={Ticket} tone="bg-violet-50 text-violet-700" title={t('home.admitCards')} action={{ label: t('home.viewAll'), to: '/admit-cards' }}>
              {admitCards.length === 0 ? <BoardEmpty /> : admitCards.slice(0, 7).map((a) => (
                <BoardLink key={a.id} to={`/admit-cards/${a.slug}`} title={a.title}
                  right={a.status === 'Released' ? <Pill tone="violet" icon={Download}>{t('home.download')}</Pill> : <Pill tone="amber">{t('home.soon')}</Pill>} />
              ))}
            </BoardCard>
          </section>

          {categories.length > 0 && (
            <section className="mt-8 sm:mt-10">
              <SectionHeader title={t('home.departments')} action={{ label: t('home.allCategories'), to: '/jobs' }} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {categories.slice(0, 10).map((c) => (
                  <Link key={c.id} to={`/jobs?category=${encodeURIComponent(c.name)}`} className="card-3d rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 min-w-0">
                    <OrgAvatar name={c.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-bold text-[13px] sm:text-sm text-slate-900 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500 truncate">{t('home.activeJobsCount', { count: c.jobCount })}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 sm:mt-10">
            <SectionHeader title={t('home.prepare')} subtitle={t('home.prepareSub')} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <ToolCard to="/daily-quiz" icon={Flame} tone="bg-amber-50 text-amber-700" title={t('home.dailyQuiz')}
                body={quiz ? `${quiz.questions.length} Qs · ${quiz.title}` : t('home.dailyQuizBody')} cta={t('home.startQuiz')} primary />
              <ToolCard to="/mock-tests" icon={PenLine} tone="bg-emerald-50 text-emerald-700" title={t('home.mockTests')} body={t('home.mockTestsBody')} cta={t('home.browseTests')} />
              <ToolCard to="/old-papers" icon={FileText} tone="bg-blue-50 text-blue-700" title={t('home.oldPapers')} body={t('home.oldPapersBody')} cta={t('home.downloadPapers')} />
              <ToolCard to="/cutoff-predictor" icon={Target} tone="bg-violet-50 text-violet-700" title={t('home.cutoff')} body={t('home.cutoffBody')} cta={t('home.checkChances')} />
            </div>
          </section>
        </div>

        <div id="schemes-section" className="mt-4"><SchemesNewsSection /></div>
        <div id="pricing-section"><PricingSection activeRole={planRole} setActiveRole={setPlanRole} /></div>
      </main>

      <Footer />
      <ExamTrackerSidebar isOpen={showTracker} onClose={() => setShowTracker(false)} onOpenMockTest={() => navigate('/mock-tests')} />
    </div>
  );
}

// ---- Search band ------------------------------------------------------------------------------

interface BandStat { value: number; label: string; to: string; alert?: boolean }

/**
 * Full-width brand band: headline on its own line (never squeezed by a side card), full-width
 * search, popular chips and live counts. Its bottom padding leaves room for the overlapping
 * closing-soon cards when there are any.
 */
function SearchBand({ popular, onSearch, stats, overlap }: { popular: string[]; onSearch: (q: string) => void; stats: BandStat[]; overlap: boolean }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [ql, setQl] = useState('');
  const [loc, setLoc] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('search', q.trim());
    if (ql) p.set('qualification', ql);
    if (loc) p.set('location', loc);
    onSearch(p.toString());
  };
  const shownStats = stats.filter((s) => s.value > 0);

  return (
    <section className={cx('bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 text-white', overlap ? 'pb-14 sm:pb-16' : 'pb-7 sm:pb-9')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 min-w-0">
        <h1 className="text-[22px] sm:text-[30px] lg:text-[32px] leading-tight font-extrabold tracking-tight break-words">
          {t('home.title1')} <span className="text-amber-200">{t('home.titleAccent')}</span> {t('home.title2')}
        </h1>
        <p className="hidden sm:flex items-center gap-1.5 mt-1.5 text-emerald-100 text-sm">
          <ShieldCheck className="w-4 h-4 shrink-0" /> {t('home.badge')} · {t('home.subtitle')}
        </p>

        <form
          onSubmit={submit}
          role="search"
          className="mt-4 sm:mt-5 bg-white text-slate-900 rounded-2xl overflow-hidden shadow-[0_14px_30px_-18px_rgba(0,0,0,0.55)] grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <label className="min-w-0 flex flex-col justify-center px-4 py-2.5 md:border-r border-slate-100">
            <span className="hidden md:block text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.searchLabel')}</span>
            <span className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')} aria-label={t('home.searchLabel')}
                className="w-full min-w-0 py-1.5 md:py-0.5 text-[15px] md:text-sm font-semibold outline-none bg-transparent placeholder:font-normal placeholder:text-slate-400" />
            </span>
          </label>
          <label className="hidden md:flex min-w-0 flex-col justify-center px-4 py-2.5 border-r border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.qualification')}</span>
            <span className="relative">
              <select value={ql} onChange={(e) => setQl(e.target.value)} className="w-full appearance-none truncate text-sm font-semibold outline-none bg-transparent py-0.5 pr-5 cursor-pointer">
                <option value="">{t('home.anyQualification')}</option>
                {QUALIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </span>
          </label>
          <label className="hidden md:flex min-w-0 flex-col justify-center px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.location')}</span>
            <span className="relative">
              <select value={loc} onChange={(e) => setLoc(e.target.value)} className="w-full appearance-none truncate text-sm font-semibold outline-none bg-transparent py-0.5 pr-5 cursor-pointer">
                <option value="">{t('home.anyLocation')}</option>
                {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </span>
          </label>
          <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[15px] px-5 sm:px-8 cursor-pointer whitespace-nowrap">
            {t('home.search')}
          </button>
        </form>

        <div className="flex gap-2 mt-3 sm:mt-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
          <span className="hidden sm:inline text-[13px] font-semibold text-emerald-100 shrink-0">{t('home.popular')}</span>
          {popular.map((c) => (
            <Link key={c} to={`/jobs?category=${encodeURIComponent(c)}`}
              className="shrink-0 max-w-[14rem] truncate rounded-full bg-white/10 hover:bg-white/20 border border-white/25 px-3 py-1.5 text-[13px] font-semibold text-white">
              {c}
            </Link>
          ))}
        </div>

        {shownStats.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 sm:mt-4 text-[13px] text-emerald-100">
            {shownStats.map((s) => (
              <Link key={s.label} to={s.to} className="hover:text-white whitespace-nowrap">
                <b className={cx('text-lg sm:text-xl font-extrabold mr-1', s.alert ? 'text-amber-200' : 'text-white')}>{s.value.toLocaleString('en-IN')}</b>{s.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Board pieces ------------------------------------------------------------------------------

const BoardCard: React.FC<{
  icon: React.ElementType;
  tone: string;
  title: string;
  action: { label: string; to: string };
  toolbar?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, tone, title, action, toolbar, className, children }) => (
  <Card className={cx('flex flex-col min-w-0 overflow-hidden', className)}>
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 min-w-0">
      <span className={cx('w-8 h-8 rounded-lg grid place-items-center shrink-0', tone)}><Icon className="w-4 h-4" /></span>
      <h2 className="font-extrabold text-[15px] truncate">{title}</h2>
      <Link to={action.to} className="ml-auto shrink-0 inline-flex items-center text-[13px] font-bold text-emerald-700 hover:text-emerald-800">
        {action.label} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
    {toolbar}
    <div className="flex-1">{children}</div>
  </Card>
);

const BoardLink: React.FC<{ to: string; title: string; right: React.ReactNode }> = ({ to, title, right }) => (
  <Link to={to} className="flex items-start gap-3 px-4 py-2.5 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 group min-w-0">
    <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-slate-800 leading-snug line-clamp-2 break-words group-hover:text-emerald-800">{title}</span>
    <span className="shrink-0">{right}</span>
  </Link>
);

const BoardEmpty: React.FC = () => <p className="px-4 py-8 text-center text-[13px] text-slate-400">Nothing new yet — check back soon.</p>;

const BoardSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3 px-4 py-3 border-t border-slate-100 first:border-t-0 animate-pulse">
        <div className="w-9 h-9 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2 py-0.5"><div className="h-3.5 bg-slate-100 rounded w-4/5" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
      </div>
    ))}
  </div>
);

const ToolCard: React.FC<{ to: string; icon: React.ElementType; tone: string; title: string; body: string; cta: string; primary?: boolean }> = ({ to, icon: Icon, tone, title, body, cta, primary }) => (
  <Link to={to} className="card-3d rounded-2xl p-3.5 sm:p-5 flex flex-col min-w-0">
    <span className={cx('w-10 h-10 rounded-xl grid place-items-center', tone)}><Icon className="w-5 h-5" /></span>
    <span className="mt-3 font-bold text-[15px] text-slate-900">{title}</span>
    <span className="mt-1 text-[13px] text-slate-500 line-clamp-2 flex-1 break-words">{body}</span>
    <span className={cx('mt-3 hidden sm:inline-flex self-start', primary ? btn.primary : btn.secondary, btn.small)}>{cta}</span>
  </Link>
);
