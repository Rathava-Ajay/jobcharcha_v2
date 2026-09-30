import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Loader2, Building2, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { getResults, ApiResultListItem } from '../api/results';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ApiResultListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResults().then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Exam Results & Merit Lists | JobCharcha" description="Latest government exam results, merit lists and cut-off marks for SSC, UPSC, Banking, Railways and State PSC recruitment, updated as they are declared." path="/results" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Trophy className="w-3.5 h-3.5" /> Examination Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">Exam Results & Merit Lists</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {results.length > 0 ? `${results.length} official results` : 'Loading results…'} — cutoffs, selected candidates, and merit lists.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No results published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon — new results are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/results/${r.slug}`)}
                className="text-left bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-white bg-slate-900 px-2.5 py-1 rounded-md inline-block mb-3">
                    {r.category}
                  </span>
                  {r.isFeatured && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded mb-2 ml-1">
                      <Sparkles className="w-3 h-3" /> Featured
                    </span>
                  )}
                  <h3 className="font-heading font-bold text-slate-900 text-base leading-snug">{r.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{r.organizationName}</span>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Published</span>
                  <span className="font-bold text-slate-800">{r.resultDate}</span>
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
