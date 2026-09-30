import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Search, Lock, Sparkles, Clock, HelpCircle, Trophy, History, ChevronDown } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getCategories, ApiCategory } from '../api/categories';
import { searchTests, ApiTestListItem } from '../api/tests';

export default function MockTestDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tests, setTests] = useState<ApiTestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    const raw = searchParams.get('categoryId');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      searchTests({
        categoryId: selectedCategoryId ?? undefined,
        search: search.trim() || undefined,
        isFree: freeOnly ? true : undefined,
      })
        .then(setTests)
        .catch(() => setTests([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedCategoryId, freeOnly]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Mock Test Dashboard | JobCharcha" description="Free and premium CBT mock tests for SSC, Banking, Railways and State PSC exams — real exam interface, instant scorecards and analysis." path="/mock-tests" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <FileText className="w-3.5 h-3.5" /> CBT Exam Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">Mock Test Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {tests.length > 0 ? `${tests.length} mock tests available` : 'Loading mock tests…'} — category-wise CBT series with instant scoring.
              </p>
            </div>
            {user && (
              <button
                onClick={() => navigate('/dashboard/aspirant?tab=mock-tests')}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start"
              >
                <History className="w-3.5 h-3.5" /> My Attempt History
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters — search + a single category dropdown (replaces the old wall of
            ~57 category pills) + free-only toggle, all on one row. */}
        <div className="flex flex-col lg:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mock tests by title or exam…"
              className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-900 pl-10 pr-3 py-3 focus:outline-none focus:border-emerald-500 font-medium shadow-2xs"
            />
          </div>

          <div className="relative shrink-0 lg:w-72">
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl text-sm text-slate-900 pl-4 pr-9 py-3 focus:outline-none focus:border-emerald-500 font-medium shadow-2xs cursor-pointer"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <label className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer shrink-0">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
            Free tests only
          </label>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No mock tests found</h3>
            <p className="text-xs text-slate-500 mt-1">Try a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/mock-tests/${t.slug}`)}
                className="text-left bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl transition-all group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-md truncate">
                      {t.categoryName}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${
                      t.isFree ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      {!t.isFree && <Lock className="w-3 h-3" />}
                      {t.isFree ? 'Free Mock' : 'Premium'}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-lg leading-snug group-hover:text-emerald-700 transition-colors">{t.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">{t.examName}</p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase flex items-center justify-center gap-0.5"><HelpCircle className="w-3 h-3" /> Qs</span>
                      <span className="font-bold text-slate-800">{t.totalQuestions}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase flex items-center justify-center gap-0.5"><Clock className="w-3 h-3" /> Time</span>
                      <span className="font-bold text-slate-800">{t.durationMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase flex items-center justify-center gap-0.5"><Trophy className="w-3 h-3" /> Marks</span>
                      <span className="font-bold text-slate-800">{t.totalMarks}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-medium text-slate-500 flex items-center justify-between">
                    <span>{t.attemptsCount.toLocaleString()} Attempts</span>
                    {!t.isFree && t.price != null && <span className="text-amber-700 font-bold">₹{t.price}</span>}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <div className="w-full bg-emerald-600 group-hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.isFree ? 'Start Free Test' : 'View & Unlock'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
