import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ShieldCheck, Briefcase, Award, Ticket, Flame, PenLine, FileText, Target, ChevronRight, Download,
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
import { JobRow } from '../components/ui/JobRow';
import { Card, Chip, DeadlinePill, OrgAvatar, Pill, RowSkeleton, SectionHeader, EmptyState, btn, cx } from '../components/ui/kit';
import { QUALIFICATION_OPTIONS, LOCATION_OPTIONS } from '../utils/jobFilters';
import { daysSince, fmtShortDate } from '../utils/dates';

const FALLBACK_POPULAR = ['GPSC', 'GSSSB', 'Police Bharti', 'Talati', 'Teacher Bharti', 'Bank Jobs', 'Railway Jobs'];

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
    searchJobs({ qualification: qual || undefined, openOnly: true, pageSize: 8 })
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

  const popular = categories.length ? categories.slice(0, 7).map((c) => c.name) : FALLBACK_POPULAR;
  const releasedAdmits = admitCards.filter((a) => a.status === 'Released').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onOpenExamTracker={() => setShowTracker(true)} />

      <main className="flex-1">
        <Hero popular={popular} onSearch={(q) => navigate(`/jobs?${q}`)} totalJobs={totalJobs} resultsCount={results.length} admitCount={releasedAdmits || admitCards.length} closing={closing} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Today strip (mobile) */}
          <div className="grid grid-cols-3 gap-2 mt-4 lg:hidden">
            <StatLink to="/jobs" value={totalJobs} label={t('home.activeJobs')} tone="text-emerald-700" />
            <StatLink to="/results" value={results.length} label={t('home.results')} tone="text-blue-700" />
            <StatLink to="/admit-cards" value={releasedAdmits || admitCards.length} label={t('home.admitCards')} tone="text-violet-700" />
          </div>

          {/* Closing soon — the single most useful thing on the page for a job seeker */}
          {closing.length > 0 && (
            <section className="mt-6 lg:hidden">
              <SectionHeader title={t('home.closingSoon')} action={{ label: t('home.seeAll'), to: '/jobs?sort=deadline&closing=10' }} />
              <Card>{closing.slice(0, 3).map((j) => <JobRow key={j.id} job={j} showCta={false} />)}</Card>
            </section>
          )}

          <UpdatesBoard jobs={latest} results={results} admitCards={admitCards} />

          <section id="jobs-section" className="mt-8 sm:mt-10 scroll-mt-24">
            <SectionHeader
              title={t('home.jobsForYou')}
              subtitle={t('home.jobsForYouSub')}
              action={{ label: totalJobs ? t('home.allJobsCta', { count: totalJobs }) : t('home.viewAll'), to: '/jobs' }}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
              <Chip active={!qual} onClick={() => setQual('')}>All</Chip>
              {QUALIFICATION_OPTIONS.slice(0, 5).map((o) => (
                <Chip key={o.value} active={qual === o.value} onClick={() => setQual(o.value)}>{o.label}</Chip>
              ))}
            </div>
            <Card>
              {latestLoading ? <RowSkeleton rows={4} /> : latest.length === 0 ? (
                <EmptyState title={t('home.noJobs')} action={<Link to="/jobs" className={btn.secondary}>{t('home.viewAll')}</Link>} />
              ) : latest.map((j) => <JobRow key={j.id} job={j} />)}
              {!latestLoading && latest.length > 0 && (
                <Link to={qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs'} className="flex items-center justify-center gap-1 border-t border-slate-100 py-3 text-sm font-bold text-emerald-700 hover:bg-slate-50 rounded-b-2xl">
                  {t('home.viewAll')} <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </Card>
          </section>

          {categories.length > 0 && (
            <section className="mt-8 sm:mt-10">
              <SectionHeader title={t('home.departments')} action={{ label: t('home.allCategories'), to: '/jobs' }} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {categories.slice(0, 8).map((c) => (
                  <Link key={c.id} to={`/jobs?category=${encodeURIComponent(c.name)}`} className="card-3d rounded-2xl p-3 sm:p-4 flex items-center gap-3">
                    <OrgAvatar name={c.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-bold text-[13px] sm:text-sm text-slate-900 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500">{t('home.activeJobsCount', { count: c.jobCount })}</span>
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

interface HeroProps {
  popular: string[];
  onSearch: (query: string) => void;
  totalJobs: number;
  resultsCount: number;
  admitCount: number;
  closing: Job[];
}

function Hero({ popular: chips, onSearch, totalJobs, resultsCount, admitCount, closing }: HeroProps) {
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
    return (
      <section className="bg-gradient-to-b from-white to-[#f5f7f8] border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-9 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 items-center">
          <div className="min-w-0">
            <span className="hidden sm:inline-flex"><Pill tone="green" icon={ShieldCheck}>{t('home.badge')}</Pill></span>
            <h1 className="mt-0 sm:mt-3.5 text-[26px] sm:text-[40px] leading-[1.12] font-extrabold text-slate-900 tracking-tight">
              {t('home.title1')} <span className="text-emerald-700">{t('home.titleAccent')}</span> <br className="hidden sm:block" />{t('home.title2')}
            </h1>
            <p className="hidden sm:block mt-3 text-base text-slate-500 max-w-xl">{t('home.subtitle')}</p>

            <form onSubmit={submit} role="search" className="mt-4 sm:mt-6 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_28px_-14px_rgba(15,23,42,0.25)] sm:grid sm:grid-cols-[1.6fr_1fr_1fr_auto] overflow-hidden">
              <label className="flex flex-col px-4 py-2.5 sm:border-r border-slate-100">
                <span className="hidden sm:block text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.searchLabel')}</span>
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')}
                    className="w-full py-1.5 sm:py-0.5 text-[15px] sm:text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400" />
                </span>
              </label>
              <label className="hidden sm:flex flex-col px-4 py-2.5 border-r border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.qualification')}</span>
                <select value={ql} onChange={(e) => setQl(e.target.value)} className="text-sm font-semibold outline-none bg-transparent py-0.5 cursor-pointer">
                  <option value="">{t('home.anyQualification')}</option>
                  {QUALIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="hidden sm:flex flex-col px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('home.location')}</span>
                <select value={loc} onChange={(e) => setLoc(e.target.value)} className="text-sm font-semibold outline-none bg-transparent py-0.5 cursor-pointer">
                  <option value="">{t('home.anyLocation')}</option>
                  {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <div className="hidden sm:block p-2">
                <button type="submit" className={cx(btn.primary, 'h-full px-6')}>{t('home.search')}</button>
              </div>
            </form>

            <div className="flex gap-2 mt-3 sm:mt-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
              <span className="hidden sm:inline text-[13px] font-semibold text-slate-400">{t('home.popular')}</span>
              {chips.map((c) => (
                <Link key={c} to={`/jobs?category=${encodeURIComponent(c)}`} className="shrink-0 rounded-full bg-white border border-slate-200 hover:border-slate-400 px-3 py-1.5 text-[13px] font-semibold text-slate-700">{c}</Link>
              ))}
            </div>
          </div>

          <Card className="hidden lg:block p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold">{t('home.today')}</p>
              <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-3">
              <StatLink to="/jobs" value={totalJobs} label={t('home.activeJobs')} tone="text-emerald-700" soft />
              <StatLink to="/results" value={resultsCount} label={t('home.results')} tone="text-blue-700" soft />
              <StatLink to="/admit-cards" value={admitCount} label={t('home.admitCards')} tone="text-violet-700" soft />
            </div>
            <div className="flex items-center justify-between mt-5 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">{t('home.closingSoon')}</span>
              <Link to="/jobs?sort=deadline&closing=10" className="text-xs font-bold text-emerald-700">{t('home.seeAll')}</Link>
            </div>
            {closing.length === 0 ? (
              <p className="text-[13px] text-slate-400 py-3">Nothing closes in the next 10 days.</p>
            ) : closing.slice(0, 4).map((j) => (
              <Link key={j.id} to={`/jobs/${j.slug ?? j.id}`} className="flex items-center gap-2.5 py-2 border-t border-slate-100 group">
                <OrgAvatar name={j.companyOrDept} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-900 truncate group-hover:text-emerald-800">{j.title}</span>
                  <span className="block text-xs text-slate-400">{j.vacancyCount > 0 ? `${j.vacancyCount.toLocaleString('en-IN')} posts` : j.companyOrDept}</span>
                </span>
                <DeadlinePill date={j.lastDate} />
              </Link>
            ))}
          </Card>
        </div>
      </section>
    );
  }

const StatLink: React.FC<{ to: string; value: number; label: string; tone: string; soft?: boolean }> = ({ to, value, label, tone, soft }) => (
  <Link to={to} className={cx('rounded-xl text-center px-2 py-2.5 sm:py-3', soft ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white border border-slate-200')}>
    <span className={cx('block text-xl sm:text-[22px] font-extrabold tracking-tight', tone)}>{value > 0 ? value.toLocaleString('en-IN') : '—'}</span>
    <span className="block text-[11px] sm:text-xs font-semibold text-slate-500">{label}</span>
  </Link>
);

const ToolCard: React.FC<{ to: string; icon: React.ElementType; tone: string; title: string; body: string; cta: string; primary?: boolean }> = ({ to, icon: Icon, tone, title, body, cta, primary }) => (
  <Link to={to} className="card-3d rounded-2xl p-3.5 sm:p-5 flex flex-col">
    <span className={cx('w-10 h-10 rounded-xl grid place-items-center', tone)}><Icon className="w-5 h-5" /></span>
    <span className="mt-3 font-bold text-[15px] text-slate-900">{title}</span>
    <span className="mt-1 text-[13px] text-slate-500 line-clamp-2 flex-1">{body}</span>
    <span className={cx('mt-3 hidden sm:inline-flex self-start', primary ? btn.primary : btn.secondary, btn.small)}>{cta}</span>
  </Link>
);

/** Classic three-column "Latest Jobs / Results / Admit Cards" board on desktop; tabs on mobile. */
const UpdatesBoard: React.FC<{ jobs: Job[]; results: ApiResultListItem[]; admitCards: ApiAdmitCardListItem[] }> = ({ jobs, results, admitCards }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'jobs' | 'results' | 'admit'>('jobs');

  const cols = useMemo(() => ({
    jobs: jobs.slice(0, 6).map((j) => ({
      key: `j${j.id}`, to: `/jobs/${j.slug ?? j.id}`, title: j.title,
      right: (daysSince(j.postedDate) ?? 9) <= 2 ? <Pill tone="green">{t('home.new')}</Pill> : <span className="text-xs text-slate-400 whitespace-nowrap">{fmtShortDate(j.lastDate)}</span>,
    })),
    results: results.slice(0, 6).map((r) => ({
      key: `r${r.id}`, to: `/results/${r.slug}`, title: r.title,
      right: (daysSince(r.resultDate) ?? 9) <= 3 ? <Pill tone="blue">{t('home.out')}</Pill> : <span className="text-xs text-slate-400 whitespace-nowrap">{fmtShortDate(r.resultDate)}</span>,
    })),
    admit: admitCards.slice(0, 6).map((a) => ({
      key: `a${a.id}`, to: `/admit-cards/${a.slug}`, title: a.title,
      right: a.status === 'Released' ? <Pill tone="violet" icon={Download}>{t('home.download')}</Pill> : <Pill tone="amber">{t('home.soon')}</Pill>,
    })),
  }), [jobs, results, admitCards, t]);

  const meta = {
    jobs: { title: t('home.latestJobs'), to: '/jobs', icon: Briefcase, tone: 'bg-emerald-50 text-emerald-700' },
    results: { title: t('home.results'), to: '/results', icon: Award, tone: 'bg-blue-50 text-blue-700' },
    admit: { title: t('home.admitCards'), to: '/admit-cards', icon: Ticket, tone: 'bg-violet-50 text-violet-700' },
  } as const;

  const Column: React.FC<{ id: keyof typeof meta; className?: string }> = ({ id, className }) => {
    const m = meta[id];
    const Icon = m.icon;
    return (
      <Card className={cx('flex flex-col', className)}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
          <span className={cx('w-8 h-8 rounded-lg grid place-items-center', m.tone)}><Icon className="w-4 h-4" /></span>
          <h3 className="font-extrabold text-[15px]">{m.title}</h3>
          <Link to={m.to} className="ml-auto text-[13px] font-bold text-emerald-700">{t('home.viewAll')}</Link>
        </div>
        <ul className="flex-1">
          {cols[id].length === 0 ? <li className="px-4 py-6 text-[13px] text-slate-400">—</li> : cols[id].map((row) => (
            <li key={row.key} className="border-t border-slate-100 first:border-t-0">
              <Link to={row.to} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 group">
                <span className="flex-1 text-[13.5px] font-semibold text-slate-800 leading-snug group-hover:text-emerald-800">{row.title}</span>
                {row.right}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    );
  };

  return (
    <section className="mt-6 sm:mt-8">
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        <Column id="jobs" /><Column id="results" /><Column id="admit" />
      </div>
      <div className="md:hidden">
        <SectionHeader title={t('home.latestUpdates')} />
        <div className="flex bg-slate-200/60 rounded-xl p-1 gap-1 mb-2.5" role="tablist">
          {(['jobs', 'results', 'admit'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cx('flex-1 py-2 rounded-lg text-[13px] font-bold cursor-pointer', tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              {k === 'jobs' ? t('home.tabJobs') : k === 'results' ? t('home.tabResults') : t('home.tabAdmit')}
            </button>
          ))}
        </div>
        <Column id={tab} />
      </div>
    </section>
  );
};

