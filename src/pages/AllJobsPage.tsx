import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Briefcase, Loader2, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { JobsSection } from '../components/JobsSection';
import { Job } from '../types';
import { searchJobs } from '../api/jobs';
import { getCategories, ApiCategory } from '../api/categories';

const PAGE_SIZE = 12;

export default function AllJobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(() => searchParams.get('district') || searchParams.get('location') || '');
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchPage = useCallback((targetPage: number, append: boolean) => {
    const setBusy = append ? setLoadingMore : setLoading;
    setBusy(true);
    searchJobs({
      search: search || undefined,
      category: category || undefined,
      location: location || undefined,
      page: targetPage,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setJobs((prev) => (append ? [...prev, ...res.items] : res.items));
        setTotalCount(res.totalCount);
        setPage(targetPage);
      })
      .catch(() => {
        if (!append) setJobs([]);
      })
      .finally(() => setBusy(false));
  }, [search, category, location]);

  // Refetch from page 1 whenever filters change
  useEffect(() => {
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, location]);

  const hasMore = jobs.length < totalCount;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="All Jobs & Vacancies | JobCharcha" description="Browse the latest government and private job vacancies across India — UPSC, SSC, Banking, Railways, State PSC and Police — with eligibility, last dates and official links." path="/jobs" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">All Government & Private Job Vacancies</h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">
            {totalCount > 0 ? `${totalCount.toLocaleString()} verified listings` : 'Loading listings…'} — search and filter the full catalog.
          </p>

          <div className="bg-white rounded-2xl p-3 shadow-xl grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, department, keyword..."
                className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location / State"
                className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <JobsSection
            jobs={jobs}
            onSelectJob={(job) => navigate(`/jobs/${job.slug || job.id}`)}
            onOpenNewJobModal={() => navigate('/login')}
            hideAlertBox
            footerSlot={
              hasMore ? (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    onClick={() => fetchPage(page + 1, true)}
                    disabled={loadingMore}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-extrabold px-8 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{loadingMore ? 'Loading…' : 'Load More Jobs'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Showing {jobs.length} of {totalCount.toLocaleString()} listings
                  </span>
                </div>
              ) : jobs.length > 0 ? (
                <div className="mt-8 text-center text-[11px] text-slate-400 font-semibold">
                  You've reached the end — {jobs.length} of {totalCount.toLocaleString()} listings shown.
                </div>
              ) : null
            }
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
