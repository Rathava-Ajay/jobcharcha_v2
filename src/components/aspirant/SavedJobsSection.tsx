import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, MapPin, Trash2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { getSavedJobs, unsaveJob, SavedJob } from '../../api/savedJobs';

export const SavedJobsSection: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getSavedJobs().then(setJobs).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    setRemoving(id);
    try {
      await unsaveJob(id);
      setJobs((prev) => prev.filter((j) => j.employerJobId !== id));
    } catch {
      /* keep the row if it fails */
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
            <Bookmark className="w-3.5 h-3.5 text-emerald-600" /> Saved Jobs
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Your Saved Jobs</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Private-employer jobs you bookmarked on JobCharcha. Apply before the last date.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">Loading saved jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
            <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Nothing saved yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Tap the bookmark on any private job to keep it here.</p>
            <button onClick={() => navigate('/private-jobs')} className="bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">Browse Private Jobs</button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((j) => (
              <div key={j.employerJobId} className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded">{j.jobType}</span>
                    <span className="text-[10px] font-bold text-slate-500">{j.workMode}</span>
                    {j.hasApplied && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Applied
                      </span>
                    )}
                  </div>
                  <button onClick={() => navigate(`/private-jobs/${j.slug}`)} className="font-heading font-extrabold text-base text-slate-900 hover:text-indigo-700 cursor-pointer text-left">
                    {j.title}
                  </button>
                  <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                    <MapPin className="w-3 h-3" /> {j.companyName}
                    {(j.city || j.state) && <> • {[j.city, j.state].filter(Boolean).join(', ')}</>}
                    {j.lastDate && <> • Last date {new Date(j.lastDate).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/private-jobs/${j.slug}`)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {j.hasApplied ? 'View job' : 'Apply Now'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(j.employerJobId)}
                    disabled={removing === j.employerJobId}
                    className="bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer disabled:opacity-60"
                    title="Remove from saved"
                  >
                    {removing === j.employerJobId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
