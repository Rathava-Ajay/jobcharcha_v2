import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Smartphone, FileCheck, CircleCheck, IndianRupee, ListChecks, Search, ExternalLink, Flame, X } from 'lucide-react';
import { StatTile } from '../dashboard/DashboardLayout';
import { adminGetAllTests, deleteTest, ApiTestAdminListItem } from '../../api/tests';
import { ApiError } from '../../api/client';

interface Props {
  onChanged?: () => void;
}

export const AdminMockTestsPanel: React.FC<Props> = ({ onChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiTestAdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllTests().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'free' | 'paid'>('all');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) =>
      (!q || t.title.toLowerCase().includes(q) || (t.examName ?? '').toLowerCase().includes(q))
      && (filter === 'all' || (filter === 'active' ? t.isActive : filter === 'inactive' ? !t.isActive : filter === 'free' ? t.isFree : !t.isFree)));
  }, [items, query, filter]);
  const activeCount = items.filter((t) => t.isActive).length;
  const freeCount = items.filter((t) => t.isFree).length;
  const questionCount = items.reduce((n, t) => n + (t.totalQuestions || 0), 0);

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); setError(null); return; }
    setConfirmDeleteId(null);
    setBusyId(id);
    setError(null);
    try {
      await deleteTest(id);
      // Optimistic removal so the row disappears immediately, then reconcile with the server.
      setItems((list) => list.filter((t) => t.id !== id));
      load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not archive this mock test. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 bg-[radial-gradient(420px_220px_at_100%_0%,rgba(236,72,153,0.35),transparent_60%),linear-gradient(135deg,#0b1a3f,#1e3a8a_60%,#4338ca)]">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center shrink-0"><FileCheck className="w-6 h-6 text-pink-300" /></span>
            <div className="min-w-0">
              <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-tight">CBT test studio</h2>
              <p className="text-[13px] text-blue-100/80 max-w-xl">Create mock tests and the daily quiz from a notification or question paper with Mobile/AI posting, then manage what students see.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={() => navigate('/admin/mobile-post-mocktest')} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[13px] px-4 py-2.5 cursor-pointer whitespace-nowrap">
              <Smartphone className="w-4 h-4" /> New mock test
            </button>
            <button onClick={() => navigate('/admin/mobile-post-quiz')} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-[13px] px-4 py-2.5 cursor-pointer whitespace-nowrap">
              <Flame className="w-4 h-4 text-amber-300" /> Post daily quiz
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatTile icon={FileCheck} tone="bg-blue-50 text-blue-700" value={items.length} label="Mock tests" hint="Live in the catalogue" />
        <StatTile icon={CircleCheck} tone="bg-emerald-50 text-emerald-700" value={activeCount} label="Active" hint={`${items.length - activeCount} inactive`} />
        <StatTile icon={IndianRupee} tone="bg-amber-50 text-amber-700" value={`${freeCount} / ${items.length - freeCount}`} label="Free / paid" />
        <StatTile icon={ListChecks} tone="bg-violet-50 text-violet-700" value={questionCount.toLocaleString('en-IN')} label="Questions" hint="Across all tests" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by test or exam…" aria-label="Search mock tests"
              className="w-full min-w-0 py-2.5 text-[14px] outline-none bg-transparent" />
          </label>
          <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto no-scrollbar">
            {(['all', 'active', 'inactive', 'free', 'paid'] as const).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-bold capitalize cursor-pointer ${filter === f ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="text-[13px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">{error}</div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            {items.length === 0 ? 'No mock tests yet — create one with "New mock test".' : 'No tests match this search or filter.'}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map((item) => {
              const confirming = confirmDeleteId === item.id;
              return (
                <article key={item.id} className={`relative flex flex-col rounded-2xl border bg-white p-4 transition ${confirming ? 'border-red-300 ring-4 ring-red-500/10' : 'border-slate-200 hover:border-blue-300 hover:shadow-[0_14px_30px_-24px_rgba(37,99,235,0.8)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate rounded-md bg-blue-50 text-blue-700 text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5">{item.examName || 'Exam'}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />{item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-extrabold text-[15px] leading-snug text-slate-900 line-clamp-2 break-words">{item.title}</h3>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] font-bold">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 px-2 py-1"><ListChecks className="w-3.5 h-3.5" />{item.totalQuestions} questions</span>
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${item.isFree ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.isFree ? 'Free' : `₹${item.price ?? '—'}`}
                    </span>
                  </div>
                  {confirming && (
                    <p className="mt-2.5 text-[12px] text-slate-600 leading-snug">
                      Archives the test — it's hidden from students and this list, but its questions and every past attempt stay in the database.
                    </p>
                  )}
                  <div className="mt-auto pt-3.5 flex items-center gap-2">
                    {!confirming && (
                      <Link to={`/mock-tests/${item.slug}`} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-3 py-2 text-[13px] font-bold text-slate-700">
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold cursor-pointer disabled:opacity-60 ${confirming ? 'flex-1 bg-red-600 hover:bg-red-700 text-white' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'}`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {busyId === item.id ? 'Archiving…' : confirming ? 'Confirm archive' : 'Archive'}
                    </button>
                    {confirming && busyId !== item.id && (
                      <button onClick={() => setConfirmDeleteId(null)} aria-label="Cancel" className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 grid place-items-center cursor-pointer"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
