import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ShieldCheck, Briefcase, Award, Ticket, Flame, PenLine, FileText, ChevronRight, ChevronDown, Download,
  GraduationCap, MapPin, Zap, Bell, Bookmark, BookmarkCheck, Building2, CheckCircle2, Users, ArrowRight,
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
import { Chip, DeadlinePill, OrgAvatar, Pill, SectionHeader, cx } from '../components/ui/kit';
import { QUALIFICATION_OPTIONS } from '../utils/jobFilters';
import { useSavedGovtJobs } from '../utils/localPrefs';
import { daysSince, daysUntil, fmtShortDate } from '../utils/dates';

const FALLBACK_POPULAR = ['GPSC', 'GSSSB', 'Police Bharti', 'Talati', 'Teacher Bharti', 'Bank Jobs', 'Railway Jobs', 'SSC'];

type FeedTab = 'jobs' | 'results' | 'admit';

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
  const [tab, setTab] = useState<FeedTab>('jobs');
  const [showTracker, setShowTracker] = useState(false);
  const [planRole, setPlanRole] = useState<'aspirant' | 'employer'>('aspirant');

  useEffect(() => {
    document.title = 'JobCharcha - Verified Government & Private Job Vacancies 2026';
    searchJobs({ closingWithinDays: 10, sort: 'deadline', pageSize: 4 }).then((r) => setClosing(r.items)).catch(() => setClosing([]));
    getResults().then(setResults).catch(() => setResults([]));
    getAdmitCards().then(setAdmitCards).catch(() => setAdmitCards([]));
    getFeaturedCategories().then(setCategories).catch(() => setCategories([]));
    getTodayQuiz().then(setQuiz).catch(() => setQuiz(null));
  }, []);

  // Latest jobs, re-queried when the qualification chip changes.
  useEffect(() => {
    setLatestLoading(true);
    searchJobs({ qualification: qual || undefined, openOnly: true, pageSize: 7 })
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

  const popular = categories.length ? categories.slice(0, 6).map((c) => c.name) : FALLBACK_POPULAR.slice(0, 6);
  const releasedAdmits = admitCards.filter((a) => a.status === 'Released');
  const newResults = results.filter((r) => (daysSince(r.resultDate) ?? 99) <= 7).length;

  const quickActions: QuickAction[] = [
    { to: '/jobs', icon: Briefcase, color: 'bg-blue-600', label: t('home.qaJobs'), sub: totalJobs ? t('home.qaOpen', { count: totalJobs }) : t('home.qaBrowse') },
    { to: '/results', icon: Award, color: 'bg-green-600', label: t('home.qaResults'), sub: newResults ? t('home.qaNew', { count: newResults }) : t('home.qaBrowse') },
    { to: '/admit-cards', icon: Ticket, color: 'bg-violet-600', label: t('home.qaAdmit'), sub: releasedAdmits.length ? t('home.qaOut', { count: releasedAdmits.length }) : t('home.qaBrowse') },
    { to: '/private-jobs', icon: Building2, color: 'bg-cyan-600', label: t('home.qaPrivate'), sub: t('home.qaBrowse') },
    { to: '/old-papers', icon: FileText, color: 'bg-orange-600', label: t('home.qaPapers'), sub: t('home.qaPdf') },
    { to: '/mock-tests', icon: PenLine, color: 'bg-pink-600', label: t('home.qaMock'), sub: t('home.qaFree') },
    { to: '/daily-quiz', icon: Flame, color: 'bg-amber-600', label: t('home.qaQuiz'), sub: t('home.qaToday') },
    { to: '/job-alerts', icon: Bell, color: 'bg-slate-900', label: t('home.qaAlerts'), sub: t('home.qaFree') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fb]">
      <Navbar user={user} onOpenExamTracker={() => setShowTracker(true)} />

      <main className="flex-1">
        <Hero
          popular={popular}
          onSearch={(q) => navigate(`/jobs?${q}`)}
          job={latest[0] ?? closing[0]}
          result={results[0]}
          admit={releasedAdmits[0]}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Quick actions overlap the hero — one tap to every section */}
          <nav aria-label="Quick links" className="relative -mt-14 sm:-mt-16 bg-white rounded-[20px] border border-slate-200 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.45)] p-2 sm:p-4 grid grid-cols-4 lg:grid-cols-8 gap-0.5 sm:gap-1.5">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className="min-w-0 flex flex-col items-center gap-1.5 sm:gap-2 rounded-2xl px-1 py-2 sm:py-2.5 text-center hover:bg-slate-50 group">
                <span className={cx('w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-[14px] sm:rounded-2xl grid place-items-center text-white shadow-[0_10px_18px_-10px_rgba(15,23,42,0.6)] group-hover:-translate-y-0.5 transition-transform', a.color)}>
                  <a.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </span>
                <span className="text-[11.5px] sm:text-[13px] font-bold text-slate-900 leading-tight line-clamp-2 break-words max-w-full">{a.label}</span>
                <span className="hidden sm:block -mt-1 text-[11.5px] font-semibold text-slate-500 truncate max-w-full">{a.sub}</span>
              </Link>
            ))}
          </nav>

          {closing.length > 0 && <ClosingSoon jobs={closing} />}

          {/* Tabbed feed + sidebar */}
          <section id="jobs-section" className="mt-6 sm:mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5 items-start scroll-mt-24">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-w-0">
              <div role="tablist" className="flex gap-1 px-2 pt-1.5 border-b border-slate-200 overflow-x-auto no-scrollbar">
                <FeedTabButton active={tab === 'jobs'} onClick={() => setTab('jobs')} icon={Briefcase} label={t('home.latestJobs')} count={totalJobs} />
                <FeedTabButton active={tab === 'results'} onClick={() => setTab('results')} icon={Award} label={t('home.results')} count={results.length} />
                <FeedTabButton active={tab === 'admit'} onClick={() => setTab('admit')} icon={Ticket} label={t('home.admitCards')} count={admitCards.length} />
              </div>

              {tab === 'jobs' && (
                <>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-3">
                    <Chip active={!qual} onClick={() => setQual('')} className={cx('!py-1 !px-3 !text-xs', !qual && '!bg-blue-700 !border-blue-700')}>All</Chip>
                    {QUALIFICATION_OPTIONS.slice(0, 6).map((o) => (
                      <Chip key={o.value} active={qual === o.value} onClick={() => setQual(o.value)} className={cx('!py-1 !px-3 !text-xs', qual === o.value && '!bg-blue-700 !border-blue-700')}>{o.label}</Chip>
                    ))}
                  </div>
                  {latestLoading ? <FeedSkeleton rows={5} /> : latest.length === 0 ? (
                    <FeedEmpty text={t('home.noJobs')} />
                  ) : latest.map((j) => <JobFeedRow key={j.id} job={j} />)}
                  <FeedFooter to={qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs'} label={totalJobs ? t('home.allJobsCta', { count: totalJobs }) : t('home.viewAll')} />
                </>
              )}

              {tab === 'results' && (
                <>
                  {results.length === 0 ? <FeedEmpty text={t('home.noResults')} /> : results.slice(0, 8).map((r) => (
                    <FeedRow key={r.id} to={`/results/${r.slug}`} avatar={r.organizationName || r.title} title={r.title}
                      meta={[r.organizationName, r.resultDate && t('home.declared', { date: fmtShortDate(r.resultDate) })]}
                      right={(daysSince(r.resultDate) ?? 99) <= 3 ? <Pill tone="green">{t('home.new')}</Pill> : null} />
                  ))}
                  <FeedFooter to="/results" label={t('home.viewAll')} />
                </>
              )}

              {tab === 'admit' && (
                <>
                  {admitCards.length === 0 ? <FeedEmpty text={t('home.noAdmits')} /> : admitCards.slice(0, 8).map((a) => (
                    <FeedRow key={a.id} to={`/admit-cards/${a.slug}`} avatar={a.organizationName || a.title} title={a.title}
                      meta={[a.organizationName, a.examDate && t('home.examOn', { date: fmtShortDate(a.examDate) })]}
                      right={a.status === 'Released' ? <Pill tone="violet" icon={Download}>{t('home.download')}</Pill> : <Pill tone="amber">{t('home.soon')}</Pill>} />
                  ))}
                  <FeedFooter to="/admit-cards" label={t('home.viewAll')} />
                </>
              )}
            </div>

            <aside className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 min-w-0">
              <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-blue-900 to-blue-600">
                <p className="flex items-center gap-2 font-extrabold text-[17px]"><Bell className="w-5 h-5 shrink-0" />{t('home.alertsTitle')}</p>
                <p className="mt-1 text-[13px] text-blue-100">{t('home.alertsBody')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to="/job-alerts" className="rounded-xl bg-white text-blue-800 font-extrabold text-[13px] py-2.5 px-2 text-center hover:bg-blue-50 truncate">{t('home.emailAlerts')}</Link>
                  <Link to="/saved-jobs" className="rounded-xl bg-white/10 border border-white/25 text-white font-bold text-[13px] py-2.5 px-2 text-center hover:bg-white/20 truncate">{t('home.savedJobs')}</Link>
                </div>
              </div>

              <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-orange-50 to-amber-200 border border-amber-300 min-w-0">
                <p className="flex items-center gap-2 font-extrabold text-[16px] text-slate-900"><Flame className="w-5 h-5 shrink-0 text-orange-600" />{t('home.quizTitle')}</p>
                <p className="mt-1 text-[13px] text-amber-900 line-clamp-2 break-words">
                  {quiz ? `${quiz.title} · ${t('home.quizBody', { count: quiz.questions.length })}` : t('home.dailyQuizBody')}
                </p>
                <Link to="/daily-quiz" className="mt-3 block rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm py-2.5 text-center">{t('home.startQuiz')}</Link>
              </div>

              <div className="rounded-2xl p-4 sm:p-5 bg-white border border-slate-200 sm:col-span-2 lg:col-span-1 min-w-0">
                <p className="font-extrabold text-[16px] text-slate-900 mb-3">{t('home.jobsByQual')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                  {QUALIFICATION_OPTIONS.slice(0, 6).map((o) => (
                    <Link key={o.value} to={`/jobs?qualification=${encodeURIComponent(o.value)}`}
                      className="min-w-0 flex items-center justify-between gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold text-slate-800 hover:border-blue-500 hover:text-blue-700">
                      <span className="truncate">{o.label}</span><ChevronRight className="w-4 h-4 shrink-0 text-blue-600" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          {categories.length > 0 && (
            <section className="mt-8 sm:mt-10">
              <SectionHeader title={t('home.departments')} action={{ label: t('home.allCategories'), to: '/jobs' }} />
              <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-2.5">
                {categories.slice(0, 10).map((c, i) => (
                  <Link key={c.id} to={`/jobs?category=${encodeURIComponent(c.name)}`}
                    className={cx('min-w-0 bg-white border border-slate-200 rounded-2xl px-1.5 py-3 flex flex-col items-center gap-1.5 text-center hover:border-blue-500', i >= 9 && 'hidden sm:flex')}>
                    <OrgAvatar name={c.name} size="md" />
                    <span className="text-[12.5px] font-bold text-slate-900 leading-tight line-clamp-2 break-words max-w-full">{c.name}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{t('home.activeJobsCount', { count: c.jobCount })}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div id="schemes-section" className="mt-4"><SchemesNewsSection /></div>
        <div id="pricing-section"><PricingSection activeRole={planRole} setActiveRole={setPlanRole} /></div>
      </main>

      <Footer />
      <ExamTrackerSidebar isOpen={showTracker} onClose={() => setShowTracker(false)} onOpenMockTest={() => navigate('/mock-tests')} />
    </div>
  );
}

// ---- Hero ----------------------------------------------------------------------------------------

/**
 * Blue hero: headline, search, trending chips — and on large screens a stack of "live" cards
 * built from real data (newest job, latest result, a released admit card). Each card only
 * appears when its data exists, and the column disappears entirely when there is none.
 */
function Hero({ popular, onSearch, job, result, admit }: {
  popular: string[];
  onSearch: (q: string) => void;
  job?: Job;
  result?: ApiResultListItem;
  admit?: ApiAdmitCardListItem;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [ql, setQl] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('search', q.trim());
    if (ql) p.set('qualification', ql);
    onSearch(p.toString());
  };
  const hasLive = !!(job || result || admit);
  const jobDays = job ? daysUntil(job.lastDate) : null;

  return (
    <section className="relative overflow-hidden text-white bg-[radial-gradient(700px_360px_at_85%_10%,rgba(56,189,248,0.45),transparent_60%),radial-gradient(500px_300px_at_0%_100%,rgba(99,102,241,0.45),transparent_60%),linear-gradient(135deg,#172554,#1e40af_55%,#2563eb)]">
      <div className={cx('max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-10 pb-[84px] sm:pb-[100px] grid gap-8 items-center', hasLive && 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]')}>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 max-w-full rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-[11.5px] sm:text-[12.5px] font-semibold text-blue-100">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('home.badge')}</span>
          </span>
          <h1 className="mt-3 sm:mt-4 text-[28px] sm:text-[40px] lg:text-[44px] leading-[1.08] font-extrabold tracking-tight break-words">
            {t('home.heroTitle1')} <span className="text-amber-300">{t('home.titleAccent')}</span><br className="hidden sm:block" /> {t('home.heroTitle2')}
          </h1>
          <p className="mt-2 sm:mt-3 text-[14px] sm:text-base text-blue-100 max-w-xl">{t('home.heroSub')}</p>

          <form onSubmit={submit} role="search" className="mt-4 sm:mt-6 flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-[0_24px_50px_-22px_rgba(2,6,23,0.7)] max-w-2xl">
            <label className="flex-1 min-w-0 flex items-center gap-2.5 px-3">
              <Search className="w-4 h-4 shrink-0 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')} aria-label={t('home.searchLabel')}
                className="w-full min-w-0 py-2.5 text-[15px] font-semibold text-slate-900 outline-none bg-transparent placeholder:font-normal placeholder:text-slate-400" />
            </label>
            <label className="hidden md:flex items-center gap-1.5 px-3 border-l border-slate-200 text-slate-800 relative">
              <GraduationCap className="w-4 h-4 shrink-0 text-slate-500" />
              <select value={ql} onChange={(e) => setQl(e.target.value)} aria-label={t('home.qualification')}
                className="appearance-none bg-transparent outline-none text-sm font-semibold pr-5 cursor-pointer max-w-[11rem] truncate">
                <option value="">{t('home.anyQualification')}</option>
                {QUALIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </label>
            <button type="submit" aria-label={t('home.search')} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[15px] px-3.5 sm:px-7 py-3 cursor-pointer">
              <Search className="w-4 h-4" /><span className="hidden sm:inline">{t('home.search')}</span>
            </button>
          </form>

          {popular.length > 0 && (
            <div className="mt-3 sm:mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap -mr-4 pr-4 sm:mr-0 sm:pr-0">
              <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-200"><Zap className="w-4 h-4" />{t('home.trending')}</span>
              {popular.map((c) => (
                <Link key={c} to={`/jobs?category=${encodeURIComponent(c)}`}
                  className="shrink-0 max-w-[13rem] truncate rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-[12.5px] font-semibold text-white">
                  {c}
                </Link>
              ))}
            </div>
          )}
        </div>

        {hasLive && (
          <div className="hidden lg:flex flex-col gap-3 min-w-0 relative">
            {job && (
              <Link to={`/jobs/${job.slug ?? job.id}`} className="self-start w-[min(100%,330px)] -rotate-2 hover:rotate-0 transition-transform bg-white text-slate-900 rounded-2xl p-4 shadow-[0_28px_50px_-22px_rgba(2,6,23,0.7)]">
                <span className="flex items-center gap-3 min-w-0">
                  <OrgAvatar name={job.companyOrDept} />
                  <span className="min-w-0">
                    <span className="block font-bold text-sm leading-snug line-clamp-2 break-words">{job.title}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {[job.vacancyCount > 0 && t('home.postsCount', { count: job.vacancyCount, n: job.vacancyCount.toLocaleString('en-IN') }), job.qualification].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
                {jobDays !== null && jobDays >= 0 && (
                  <>
                    <span className="mt-3 block h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <span className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${Math.max(8, Math.min(100, 100 - jobDays * 3))}%` }} />
                    </span>
                    <span className="mt-1.5 flex justify-between text-xs font-bold">
                      <span className={jobDays <= 3 ? 'text-red-600' : 'text-amber-600'}>{t('home.daysLeft', { count: jobDays })}</span>
                      <span className="text-blue-700 inline-flex items-center gap-1">{t('home.applyNow')} <ArrowRight className="w-3.5 h-3.5" /></span>
                    </span>
                  </>
                )}
              </Link>
            )}
            {result && (
              <Link to={`/results/${result.slug}`} className="self-end w-[min(100%,300px)] rotate-2 hover:rotate-0 transition-transform bg-white text-slate-900 rounded-2xl p-4 shadow-[0_28px_50px_-22px_rgba(2,6,23,0.7)] flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-green-100 text-green-700 grid place-items-center shrink-0"><CheckCircle2 className="w-5 h-5" /></span>
                <span className="min-w-0">
                  <span className="block font-bold text-sm">{t('home.resultDeclared')}</span>
                  <span className="block text-xs text-slate-500 truncate">{result.title}</span>
                </span>
              </Link>
            )}
            {admit && (
              <Link to={`/admit-cards/${admit.slug}`} className="self-start ml-10 w-[min(100%,310px)] -rotate-1 hover:rotate-0 transition-transform bg-white text-slate-900 rounded-2xl p-4 shadow-[0_28px_50px_-22px_rgba(2,6,23,0.7)] flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center shrink-0"><Ticket className="w-5 h-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm">{t('home.admitOut')}</span>
                  <span className="block text-xs text-slate-500 truncate">{admit.title}</span>
                </span>
                <Pill tone="violet" icon={Download}>{t('home.download')}</Pill>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Closing soon ------------------------------------------------------------------------------

function ClosingSoon({ jobs }: { jobs: Job[] }) {
  const { t } = useTranslation();
  const { isSaved, toggle } = useSavedGovtJobs();
  return (
    <section className="mt-6 sm:mt-7" aria-label={t('home.closingWeek')}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[17px] sm:text-lg font-extrabold tracking-tight text-slate-900 min-w-0 truncate">
          🔥 {t('home.closingWeek')}<span className="hidden sm:inline font-bold text-slate-500"> — {t('home.closingWeekSub')}</span>
        </h2>
        <Link to="/jobs?sort=deadline" className="shrink-0 inline-flex items-center text-[13px] font-bold text-blue-700 hover:text-blue-800">{t('home.seeAll')} <ChevronRight className="w-4 h-4" /></Link>
      </div>
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar -mr-4 pr-4 sm:mr-0 sm:pr-0 pb-1">
        {jobs.slice(0, 4).map((j) => {
          const d = daysUntil(j.lastDate);
          const slug = j.slug ?? j.id;
          const saved = isSaved(slug);
          return (
            <div key={j.id} className={cx('snap-start shrink-0 w-[80%] sm:w-auto min-w-0 bg-white rounded-2xl border border-slate-200 border-t-4 p-3.5 sm:p-4 flex flex-col gap-2.5', d !== null && d <= 3 ? 'border-t-red-500' : 'border-t-amber-500')}>
              <span className="flex items-center justify-between gap-2">
                <OrgAvatar name={j.companyOrDept} size="sm" />
                <DeadlinePill date={j.lastDate} />
              </span>
              <Link to={`/jobs/${slug}`} className="flex-1 font-bold text-[14px] leading-snug text-slate-900 hover:text-blue-700 line-clamp-2 break-words">{j.title}</Link>
              <span className="flex items-center justify-between gap-2 text-[12.5px] text-slate-500 min-w-0">
                <span className="inline-flex items-center gap-1 min-w-0 truncate">
                  {j.vacancyCount > 0 ? <><Users className="w-3.5 h-3.5 shrink-0" />{t('home.postsCount', { count: j.vacancyCount, n: j.vacancyCount.toLocaleString('en-IN') })}</> : <span className="truncate">{j.companyOrDept}</span>}
                </span>
                {j.lastDate && <span className="shrink-0">{t('home.lastDate')} <b className="text-slate-900">{fmtShortDate(j.lastDate)}</b></span>}
              </span>
              <span className="flex gap-2">
                <Link to={`/jobs/${slug}`} className="flex-1 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-extrabold py-2 text-center">{t('home.apply')}</Link>
                <button type="button" onClick={() => toggle({ slug, title: j.title, org: j.companyOrDept, lastDate: j.lastDate })}
                  aria-pressed={saved} aria-label={saved ? t('home.saved') : t('home.save')}
                  className={cx('w-11 rounded-xl border grid place-items-center cursor-pointer', saved ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-400')}>
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---- Feed pieces -------------------------------------------------------------------------------

interface QuickAction { to: string; icon: React.ElementType; color: string; label: string; sub: string }

const FeedTabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string; count: number }> = ({ active, onClick, icon: Icon, label, count }) => (
  <button type="button" role="tab" aria-selected={active} onClick={onClick}
    className={cx('shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-3 border-b-[3px] text-[13.5px] sm:text-sm font-bold cursor-pointer whitespace-nowrap',
      active ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
    <Icon className="w-4 h-4" />{label}
    {count > 0 && <span className="rounded-full bg-blue-50 text-blue-700 text-[11px] font-extrabold px-1.5">{count.toLocaleString('en-IN')}</span>}
  </button>
);

const JobFeedRow: React.FC<{ job: Job }> = ({ job: j }) => {
  const { t } = useTranslation();
  return (
    <Link to={`/jobs/${j.slug ?? j.id}`} className="flex gap-3 px-4 py-3.5 border-t border-slate-100 hover:bg-slate-50 group min-w-0">
      <OrgAvatar name={j.companyOrDept} />
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-bold leading-snug text-slate-900 line-clamp-2 break-words group-hover:text-blue-700">{j.title}</span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 min-w-0">
          {j.qualification && <span className="inline-flex items-center gap-1 min-w-0 max-w-full"><GraduationCap className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{j.qualification}</span></span>}
          {j.location && <span className="inline-flex items-center gap-1 min-w-0 max-w-full"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{j.location}</span></span>}
          {j.lastDate && <span className="hidden sm:inline whitespace-nowrap">{t('home.lastDate')} {fmtShortDate(j.lastDate)}</span>}
        </span>
      </span>
      <span className="shrink-0 self-start flex flex-col items-end gap-1">
        <DeadlinePill date={j.lastDate} />
        {(daysSince(j.postedDate) ?? 9) <= 2 && <Pill tone="green">{t('home.new')}</Pill>}
      </span>
    </Link>
  );
};

const FeedRow: React.FC<{ to: string; avatar: string; title: string; meta: (string | false | null | undefined)[]; right: React.ReactNode }> = ({ to, avatar, title, meta, right }) => (
  <Link to={to} className="flex gap-3 px-4 py-3 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 group min-w-0">
    <OrgAvatar name={avatar} size="sm" />
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-bold leading-snug text-slate-900 line-clamp-2 break-words group-hover:text-blue-700">{title}</span>
      <span className="block mt-0.5 text-xs text-slate-500 truncate">{meta.filter(Boolean).join(' · ')}</span>
    </span>
    {right && <span className="shrink-0 self-start">{right}</span>}
  </Link>
);

const FeedFooter: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to} className="flex items-center justify-center gap-1 py-3.5 border-t border-slate-200 text-sm font-extrabold text-blue-700 hover:bg-blue-50">
    {label} <ChevronRight className="w-4 h-4" />
  </Link>
);

const FeedEmpty: React.FC<{ text: string }> = ({ text }) => <p className="px-4 py-10 text-center text-[13px] text-slate-500 border-t border-slate-100">{text}</p>;

const FeedSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3 px-4 py-3.5 border-t border-slate-100 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2 py-0.5"><div className="h-3.5 bg-slate-100 rounded w-4/5" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
      </div>
    ))}
  </div>
);
