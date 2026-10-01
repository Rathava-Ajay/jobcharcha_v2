import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Lock, Clock, HelpCircle, Trophy, History, Flame, FileText, BookOpen, Target, ArrowRight, Users } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getCategories, ApiCategory } from '../api/categories';
import { searchTests, ApiTestListItem } from '../api/tests';
import { getTodayQuiz, ApiDailyQuiz } from '../api/dailyQuiz';
import { PageHeader, Card, Chip, Pill, EmptyState, btn, cx } from '../components/ui/kit';
import { Select } from '../components/ui/Select';

const TOOLS = [
  { to: '/old-papers', icon: FileText, title: 'Old papers', body: 'Past papers with answers', tone: 'bg-blue-50 text-blue-700' },
  { to: '/practice-questions', icon: BookOpen, title: 'Practice Qs', body: 'Topic-wise questions', tone: 'bg-amber-50 text-amber-700' },
  { to: '/cutoff-predictor', icon: Target, title: 'Cut-off predictor', body: 'Know your chances', tone: 'bg-violet-50 text-violet-700' },
  { to: '/study', icon: BookOpen, title: 'Study material', body: 'Notes & syllabus', tone: 'bg-emerald-50 text-emerald-700' },
];

export default function MockTestDashboardPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tests, setTests] = useState<ApiTestListItem[]>([]);
  const [quiz, setQuiz] = useState<ApiDailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const categoryId = Number(params.get('categoryId')) || null;
  const freeOnly = params.get('free') === '1';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
    getTodayQuiz().then(setQuiz).catch(() => setQuiz(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      searchTests({ categoryId: categoryId ?? undefined, search: search.trim() || undefined, isFree: freeOnly ? true : undefined })
        .then(setTests)
        .catch(() => setTests([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, categoryId, freeOnly]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Mock Tests & Daily Quiz | JobCharcha" description="Free and premium CBT mock tests for GPSC, GSSSB, Police, SSC, Banking and Railway exams — real exam interface, instant scorecards, daily quiz and old papers." path="/mock-tests" />

      <PageHeader
        title="Practice & mock tests"
        subtitle="Build a daily habit, then test yourself on the real exam pattern."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Mock tests' }]}
        aside={user ? (
          <Link to="/dashboard/aspirant?tab=mock-tests" className={cx(btn.secondary, 'hidden sm:inline-flex')}><History className="w-4 h-4" /> My attempts</Link>
        ) : undefined}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {/* Daily quiz */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><Flame className="w-3.5 h-3.5 text-amber-300" /> Daily quiz</span>
            <h2 className="mt-3 text-xl sm:text-2xl font-extrabold">{quiz ? quiz.title : "Today's quiz"}</h2>
            <p className="text-emerald-100 mt-1 text-sm">
              {quiz ? `${quiz.questions.length} questions · about ${Math.max(3, Math.round(quiz.questions.length / 2))} minutes · answers explained` : '10 quick questions with answers explained — a new set every day.'}
            </p>
          </div>
          <Link to="/daily-quiz" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-emerald-800 font-extrabold px-6 py-3.5 shrink-0 hover:bg-emerald-50">
            Start today's quiz <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-5">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className="card-3d rounded-2xl p-3 sm:p-4 flex items-center gap-3">
              <span className={cx('w-10 h-10 rounded-xl grid place-items-center shrink-0', t.tone)}><t.icon className="w-5 h-5" /></span>
              <span className="min-w-0">
                <span className="block font-bold text-[13.5px] sm:text-sm text-slate-900">{t.title}</span>
                <span className="block text-xs text-slate-500 truncate">{t.body}</span>
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold">Mock tests</h2>
              <p className="text-[13px] text-slate-500">Same pattern, timing and negative marking as the real exam.</p>
            </div>
            <div className="flex gap-2">
              <label className="flex-1 sm:w-64 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 focus-within:border-emerald-600">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests…" aria-label="Search mock tests" className="w-full py-2.5 text-sm outline-none bg-transparent" />
              </label>
              <Select
                value={categoryId ?? ''}
                onChange={(e) => setParam('categoryId', e.target.value)}
                aria-label="Filter by exam category"
                className="w-36 sm:w-48 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold cursor-pointer outline-none focus:border-emerald-600"
              >
                <option value="">All exams</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Chip active={!freeOnly} onClick={() => setParam('free', '')}>All tests</Chip>
            <Chip active={freeOnly} onClick={() => setParam('free', '1')}>Free only</Chip>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="h-44 animate-pulse bg-slate-50" />)}
            </div>
          ) : tests.length === 0 ? (
            <Card><EmptyState title="No mock tests found" body="Try a different exam or search term." /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {tests.map((t) => (
                <Link key={t.id} to={`/mock-tests/${t.slug}`} className="card-3d rounded-2xl p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone="grey" className="truncate max-w-[60%]">{t.categoryName}</Pill>
                    {t.isFree ? <Pill tone="green">Free</Pill> : <Pill tone="violet" icon={Lock}>{t.price != null ? `₹${t.price}` : 'Premium'}</Pill>}
                  </div>
                  <h3 className="mt-3 font-bold text-[15px] text-slate-900 leading-snug flex-1">{t.title}</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5 truncate">{t.examName}</p>
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-3 text-[12.5px] text-slate-600">
                    <span className="inline-flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-slate-400" />{t.totalQuestions} Qs</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{t.durationMinutes} min</span>
                    <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-slate-400" />{t.totalMarks} marks</span>
                    {t.attemptsCount > 0 && <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />{t.attemptsCount.toLocaleString('en-IN')}</span>}
                  </div>
                  <span className={cx(t.isFree ? btn.primary : btn.secondary, 'mt-4 w-full')}>{t.isFree ? 'Start test' : 'View & unlock'}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
