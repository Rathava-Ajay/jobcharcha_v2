import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, X, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { searchJobs, JobQuery } from '../api/jobs';
import { getCategories, ApiCategory } from '../api/categories';
import { JobRow } from '../components/ui/JobRow';
import { PageHeader, Card, Chip, RowSkeleton, EmptyState, btn, cx } from '../components/ui/kit';
import { QUALIFICATION_OPTIONS, LOCATION_OPTIONS, SORT_OPTIONS, qualificationLabel } from '../utils/jobFilters';

const PAGE_SIZE = 15;

const CLOSING_OPTIONS = [
  { label: 'Any time', value: '' },
  { label: 'Closing in 3 days', value: '3' },
  { label: 'Closing in 7 days', value: '7' },
  { label: 'Closing this month', value: '30' },
];

type FilterKey = 'search' | 'category' | 'qualification' | 'location' | 'closing' | 'sort' | 'closed';

/**
 * Every filter lives in the URL (?category=GPSC&qualification=12th&sort=deadline&page=2) so a
 * filtered list can be shared, bookmarked, reached from the home page/footer, and survives Back.
 */
export default function AllJobsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const f = {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    qualification: params.get('qualification') ?? '',
    // The footer's city directory links with ?district=
    location: params.get('location') ?? params.get('district') ?? '',
    closing: params.get('closing') ?? '',
    sort: (params.get('sort') as JobQuery['sort']) || 'newest',
    closed: params.get('closed') === '1',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
  const [searchText, setSearchText] = useState(f.search);
  useEffect(() => setSearchText(f.search), [f.search]);

  const update = (patch: Partial<Record<FilterKey, string>>, keepPage = false) => {
    const next = new URLSearchParams(params);
    next.delete('district');
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: false });
  };
  const goPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set('page', String(p)); else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

  const queryKey = params.toString();
  useEffect(() => {
    setLoading(true);
    searchJobs({
      search: f.search || undefined,
      category: f.category || undefined,
      qualification: f.qualification || undefined,
      location: f.location || undefined,
      closingWithinDays: f.closing ? Number(f.closing) : undefined,
      openOnly: f.closed ? undefined : true,
      sort: f.sort,
      page: f.page,
      pageSize: PAGE_SIZE,
    })
      .then((r) => { setJobs(r.items); setTotal(r.totalCount); })
      .catch(() => { setJobs([]); setTotal(0); })
      .finally(() => setLoading(false));
    // f is derived from params; queryKey captures every change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const active = useMemo(() => {
    const list: { key: FilterKey; label: string }[] = [];
    if (f.search) list.push({ key: 'search', label: `“${f.search}”` });
    if (f.category) list.push({ key: 'category', label: f.category });
    if (f.qualification) list.push({ key: 'qualification', label: qualificationLabel(f.qualification) });
    if (f.location) list.push({ key: 'location', label: f.location });
    if (f.closing) list.push({ key: 'closing', label: CLOSING_OPTIONS.find((o) => o.value === f.closing)?.label ?? '' });
    if (f.closed) list.push({ key: 'closed', label: 'Including closed' });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const heading = f.category ? `${f.category} Jobs 2026` : f.location ? `Government Jobs in ${f.location}` : 'Latest Government Jobs 2026';

  const filterPanel = (
    <FilterPanel
      f={f}
      categories={categories}
      onChange={(patch) => update(patch)}
    />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead
        title={`${heading} | JobCharcha`}
        description="Browse the latest government job vacancies — GPSC, GSSSB, Police, Panchayat, SSC, Banking and Railways — with eligibility, last dates and official links."
        path="/jobs"
      />

      <PageHeader
        title={heading}
        subtitle={loading && !total ? 'Loading vacancies…' : `${total.toLocaleString('en-IN')} ${f.closed ? '' : 'open '}vacancies · updated daily`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Jobs' }]}
      >
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); update({ search: searchText.trim() }); }}
          className="flex gap-2 max-w-2xl"
        >
          <label className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 focus-within:border-emerald-600 focus-within:bg-white">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search post, department or exam…"
              aria-label="Search jobs"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </label>
          <button type="submit" className={btn.primary}>Search</button>
        </form>
        <div className="flex gap-2 mt-3 lg:hidden">
          <button type="button" onClick={() => setSheetOpen(true)} className={cx(btn.secondary, 'flex-1')}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {active.filter((a) => a.key !== 'search').length > 0 && (
              <span className="bg-emerald-600 text-white text-[11px] rounded-full px-1.5">{active.filter((a) => a.key !== 'search').length}</span>
            )}
          </button>
          <SortSelect value={f.sort ?? 'newest'} onChange={(v) => update({ sort: v === 'newest' ? '' : v })} className="flex-1" />
        </div>
      </PageHeader>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
          <aside className="hidden lg:block sticky top-20">
            <Card className="overflow-hidden">{filterPanel}</Card>
            <Link to="/job-alerts" className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-900 text-white p-4 text-[13px]">
              <Bell className="w-5 h-5 text-emerald-400 shrink-0" />
              <span><b className="block text-sm">Get these jobs by email</b>Alerts for your qualification — free.</span>
            </Link>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-sm text-slate-500 mr-1"><b className="text-slate-900">{total.toLocaleString('en-IN')}</b> jobs</p>
              {active.map((a) => (
                <button key={a.key} type="button" onClick={() => { if (a.key === 'search') setSearchText(''); update({ [a.key]: '' }); }}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[13px] font-semibold pl-3 pr-2 py-1 cursor-pointer hover:bg-emerald-100">
                  {a.label} <X className="w-3.5 h-3.5" aria-label={`Remove ${a.label}`} />
                </button>
              ))}
              {active.length > 1 && (
                <button type="button" onClick={() => { setSearchText(''); setParams(new URLSearchParams()); }} className="text-[13px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer">Clear all</button>
              )}
              <div className="hidden lg:block ml-auto">
                <SortSelect value={f.sort ?? 'newest'} onChange={(v) => update({ sort: v === 'newest' ? '' : v })} />
              </div>
            </div>

            <Card>
              {loading ? <RowSkeleton rows={6} /> : jobs.length === 0 ? (
                <EmptyState
                  title="No jobs match these filters"
                  body="Try removing a filter or searching a broader term. New jobs are added every day."
                  action={<button type="button" onClick={() => { setSearchText(''); setParams(new URLSearchParams()); }} className={btn.secondary}>Clear filters</button>}
                />
              ) : jobs.map((j) => <JobRow key={j.id} job={j} />)}
            </Card>

            {!loading && totalPages > 1 && <Pager page={f.page} totalPages={totalPages} onGo={goPage} />}
          </section>
        </div>
      </main>

      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col">
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5" />
            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <p className="text-lg font-extrabold">Filters</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters" className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1">{filterPanel}</div>
            <div className="p-4 border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setSheetOpen(false)} className={cx(btn.primary, 'w-full py-3')}>
                Show {total.toLocaleString('en-IN')} jobs
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

const SortSelect: React.FC<{ value: string; onChange: (v: string) => void; className?: string }> = ({ value, onChange, className }) => (
  <label className={cx('flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 text-sm font-semibold text-slate-700', className)}>
    <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
    <span className="sr-only">Sort by</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent py-2.5 outline-none cursor-pointer w-full">
      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

interface PanelProps {
  f: { category: string; qualification: string; location: string; closing: string; closed: boolean };
  categories: ApiCategory[];
  onChange: (patch: Partial<Record<FilterKey, string>>) => void;
}

/** Single-select groups (the API filters on one value per field) rendered as tappable chips. */
const FilterPanel: React.FC<PanelProps> = ({ f, categories, onChange }) => {
  const [showAllCats, setShowAllCats] = useState(false);
  const cats = [...categories].sort((a, b) => b.jobCount - a.jobCount);
  const shownCats = showAllCats ? cats : cats.slice(0, 10);
  return (
    <div className="divide-y divide-slate-100">
      <Group title="Qualification">
        {QUALIFICATION_OPTIONS.map((o) => (
          <Chip key={o.value} active={f.qualification === o.value} onClick={() => onChange({ qualification: f.qualification === o.value ? '' : o.value })}>{o.label}</Chip>
        ))}
      </Group>
      <Group title="Department">
        {shownCats.map((c) => (
          <Chip key={c.id} active={f.category === c.name} count={c.jobCount} onClick={() => onChange({ category: f.category === c.name ? '' : c.name })}>{c.name}</Chip>
        ))}
        {cats.length > 10 && (
          <button type="button" onClick={() => setShowAllCats((v) => !v)} className="text-[13px] font-bold text-emerald-700 px-1 cursor-pointer">
            {showAllCats ? 'Show less' : `+${cats.length - 10} more`}
          </button>
        )}
      </Group>
      <Group title="Location">
        {LOCATION_OPTIONS.map((o) => (
          <Chip key={o.value} active={f.location === o.value} onClick={() => onChange({ location: f.location === o.value ? '' : o.value })}>{o.label}</Chip>
        ))}
      </Group>
      <Group title="Last date">
        {CLOSING_OPTIONS.map((o) => (
          <Chip key={o.label} active={f.closing === o.value} onClick={() => onChange({ closing: o.value })}>{o.label}</Chip>
        ))}
        <label className="w-full flex items-center gap-2 mt-1 text-[13px] text-slate-600 cursor-pointer">
          <input type="checkbox" checked={f.closed} onChange={(e) => onChange({ closed: e.target.checked ? '1' : '' })} className="w-4 h-4 accent-emerald-700" />
          Include jobs whose last date has passed
        </label>
      </Group>
    </div>
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-4">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">{title}</p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Pager: React.FC<{ page: number; totalPages: number; onGo: (p: number) => void }> = ({ page, totalPages, onGo }) => {
  const pages = useMemo(() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
    return [...set].sort((a, b) => a - b);
  }, [page, totalPages]);
  const cell = 'min-w-10 h-10 px-2 rounded-xl border text-sm font-bold grid place-items-center cursor-pointer';
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-5">
      <button type="button" disabled={page <= 1} onClick={() => onGo(page - 1)} aria-label="Previous page" className={cx(cell, 'bg-white border-slate-200 disabled:opacity-40 disabled:cursor-default')}><ChevronLeft className="w-4 h-4" /></button>
      {pages.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <button type="button" onClick={() => onGo(p)} aria-current={p === page ? 'page' : undefined}
            className={cx(cell, p === page ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400')}>{p}</button>
        </React.Fragment>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onGo(page + 1)} aria-label="Next page" className={cx(cell, 'bg-white border-slate-200 disabled:opacity-40 disabled:cursor-default')}><ChevronRight className="w-4 h-4" /></button>
    </nav>
  );
};
