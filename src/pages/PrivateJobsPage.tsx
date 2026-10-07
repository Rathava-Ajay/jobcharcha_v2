import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Building2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { searchPublicEmployerJobs, ApiPublicEmployerJobListItem } from '../api/employerJobs';
import { PrivateJobRow } from '../components/ui/JobRow';
import { PageHeader, Card, Chip, RowSkeleton, EmptyState, btn } from '../components/ui/kit';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

export default function PrivateJobsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const city = params.get('city') ?? '';
  const jobType = params.get('type') ?? '';
  const mode = params.get('mode') ?? '';

  const [searchText, setSearchText] = useState(search);
  const [cityText, setCityText] = useState(city);
  const [jobs, setJobs] = useState<ApiPublicEmployerJobListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next);
  };

  useEffect(() => {
    setLoading(true);
    searchPublicEmployerJobs({ search: search || undefined, city: city || undefined, jobType: jobType || undefined })
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search, city, jobType]);

  // Work mode isn't a server-side filter; narrow the fetched list here.
  const shown = mode ? jobs.filter((j) => j.workMode?.toLowerCase() === mode.toLowerCase()) : jobs;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Private Jobs & Corporate Vacancies | JobCharcha" description="Verified private-sector and corporate job openings across India — full-time, remote and contract roles you can apply to directly online." path="/private-jobs" />

      <PageHeader
        title="Private jobs"
        subtitle={loading ? 'Loading listings…' : `${shown.length} live openings posted directly by employers on JobCharcha`}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Private jobs' }]}
        aside={user?.role !== 'employer' ? (
          <Link to="/join/employer" className={`${btn.secondary} hidden sm:inline-flex`}><Building2 className="w-4 h-4" /> Post a job</Link>
        ) : undefined}
      >
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); set({ search: searchText.trim(), city: cityText.trim() }); }}
          className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr_auto] gap-2 max-w-3xl"
        >
          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 focus-within:border-indigo-600 focus-within:bg-white">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Role, skill or company" aria-label="Search private jobs" className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 focus-within:border-indigo-600 focus-within:bg-white">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={cityText} onChange={(e) => setCityText(e.target.value)} placeholder="City" aria-label="City" className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <button type="submit" className={btn.dark}>Search</button>
        </form>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Chip active={!jobType} onClick={() => set({ type: '' })}>All types</Chip>
          {JOB_TYPES.map((t) => <Chip key={t} active={jobType === t} onClick={() => set({ type: jobType === t ? '' : t })}>{t}</Chip>)}
          <span className="w-px bg-slate-200 mx-1 shrink-0" />
          {WORK_MODES.map((m) => <Chip key={m} active={mode === m} onClick={() => set({ mode: mode === m ? '' : m })}>{m}</Chip>)}
        </div>
      </PageHeader>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <Card>
          {loading ? <RowSkeleton rows={5} /> : shown.length === 0 ? (
            <EmptyState
              title="No private jobs match your search"
              body="Try another role or city, or check back soon — employers post new openings every day."
              action={<button type="button" onClick={() => { setSearchText(''); setCityText(''); setParams(new URLSearchParams()); }} className={btn.secondary}>Clear search</button>}
            />
          ) : shown.map((j) => <PrivateJobRow key={j.id} job={j} />)}
        </Card>
        {user?.role !== 'employer' && (
          <Card className="mt-5 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Hiring? Post a job on JobCharcha</p>
              <p className="text-[13px] text-slate-500">Reach lakhs of job seekers across Gujarat. Verified company badge included.</p>
            </div>
            <Link to="/join/employer" className={btn.dark}>Post a job</Link>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
