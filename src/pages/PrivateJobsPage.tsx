import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase, Loader2, ArrowLeft, Building2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { searchPublicEmployerJobs, ApiPublicEmployerJobListItem } from '../api/employerJobs';

export default function PrivateJobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [jobs, setJobs] = useState<ApiPublicEmployerJobListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  }, []);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    searchPublicEmployerJobs({ search: search || undefined, city: city || undefined })
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search, city]);

  useEffect(() => {
    const handle = setTimeout(fetchJobs, 250);
    return () => clearTimeout(handle);
  }, [fetchJobs]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Private Jobs & Corporate Vacancies | JobCharcha" description="Verified private-sector and corporate job openings across India — full-time, remote and contract roles you can apply to directly online." path="/private-jobs" />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>Private & Corporate Recruitment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">Private Jobs & Corporate Vacancies</h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-6">
            {jobs.length > 0 ? `${jobs.length} live listings from verified employers` : loading ? 'Loading listings…' : 'No listings match your search'} — posted directly by companies hiring on JobCharcha.
          </p>

          <div className="shadow-sm bg-white rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, company, keyword..."
                className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City / State"
                className="w-full bg-slate-50 text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No private jobs posted yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">Check back soon, or try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/private-jobs/${job.slug}`)}
                className={`bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl p-5 border cursor-pointer flex flex-col justify-between relative group ${
                  job.isFeatured ? 'border-amber-300/70' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      {job.jobType} • {job.workMode}
                    </span>
                    {job.isFeatured && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600 fill-amber-600" /> Featured
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-700 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.companyName}</span>
                    {job.isCompanyVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                      <span className="font-medium text-slate-700 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {job.city}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Salary</span>
                      <span className="font-semibold text-emerald-700 truncate block">
                        {job.hideSalary || (!job.salaryMin && !job.salaryMax) ? 'Not disclosed' : `${job.salaryMin || '—'} – ${job.salaryMax || '—'}`}
                      </span>
                    </div>
                  </div>

                  {job.isUrgent && (
                    <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                      <Zap className="w-3 h-3" /> Urgent Hiring
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-600 group-hover:underline">View Details & Apply</span>
                  <span className="text-slate-400 text-[11px] font-normal">Posted {new Date(job.createdDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
