import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, TrendingUp, Target } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getResults, ApiResultListItem } from '../api/results';
import { UpdateRow } from '../components/ui/JobRow';
import { PageHeader, Card, Chip, Pill, RowSkeleton, EmptyState, btn } from '../components/ui/kit';
import { fmtDate, daysSince } from '../utils/dates';

export default function ResultsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<ApiResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    getResults().then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [results]);

  const shown = results.filter((r) =>
    (!cat || r.category === cat)
    && (!q || `${r.title} ${r.organizationName} ${r.examName ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  const popular = [...results].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Exam Results & Merit Lists | JobCharcha" description="Latest government exam results, merit lists and cut-off marks for GPSC, GSSSB, SSC, Banking, Railways and Police recruitment, updated as they are declared." path="/results" />

      <PageHeader
        title="Exam results & merit lists"
        subtitle="Direct links to official result pages — added as soon as they are declared."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Results' }]}
      >
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 max-w-xl focus-within:border-emerald-600 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exam or department…" aria-label="Search results" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </label>
        {categories.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <Chip active={!cat} onClick={() => setCat('')} count={results.length}>All</Chip>
            {categories.map(([c, n]) => <Chip key={c} active={cat === c} count={n} onClick={() => setCat(cat === c ? '' : c)}>{c}</Chip>)}
          </div>
        )}
      </PageHeader>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Card>
          {loading ? <RowSkeleton rows={6} /> : shown.length === 0 ? (
            <EmptyState title={results.length ? 'No results match your search' : 'No results published yet'} body="New results are added as soon as they are declared — check back soon." />
          ) : shown.map((r) => {
            const fresh = (daysSince(r.resultDate) ?? 99) <= 3;
            return (
              <UpdateRow
                key={r.id}
                to={`/results/${r.slug}`}
                title={r.title}
                org={r.organizationName}
                meta={`Declared ${fmtDate(r.resultDate)}`}
                pill={fresh || r.isFeatured ? <>{fresh && <Pill tone="blue">New · {fmtDate(r.resultDate)}</Pill>}{r.isFeatured && <Pill tone="amber">Featured</Pill>}</> : undefined}
                action="Check result"
                actionIcon={ArrowRight}
              />
            );
          })}
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20">
          {popular.length > 0 && (
            <Card className="p-5">
              <p className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-700" /> Most checked</p>
              <ol className="mt-2">
                {popular.map((r, i) => (
                  <li key={r.id} className="border-t border-slate-100 first:border-t-0">
                    <Link to={`/results/${r.slug}`} className="flex gap-3 py-2.5 text-[13.5px] font-semibold text-slate-800 hover:text-emerald-800">
                      <span className="text-slate-300 font-extrabold w-4">{i + 1}</span><span className="line-clamp-2">{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <Card className="p-5">
            <p className="font-bold flex items-center gap-2"><Target className="w-4 h-4 text-violet-600" /> Didn't make the cut?</p>
            <p className="text-[13px] text-slate-500 mt-1">Compare your marks with past cut-offs and see where to improve next time.</p>
            <Link to="/cutoff-predictor" className={`${btn.secondary} ${btn.small} mt-3`}>Open cut-off predictor</Link>
          </Card>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
