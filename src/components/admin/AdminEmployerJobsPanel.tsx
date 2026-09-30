import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Building2, Mail, MapPin, Clock3, Check, X, Loader2, Paperclip } from 'lucide-react';
import {
  adminGetPendingEmployerJobs, adminApproveEmployerJob, adminRejectEmployerJob, ApiAdminPendingEmployerJob,
} from '../../api/employerJobs';
import { ApiError } from '../../api/client';

export const AdminEmployerJobsPanel: React.FC = () => {
  const [items, setItems] = useState<ApiAdminPendingEmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetPendingEmployerJobs()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: number) => {
    setBusyId(id); setError(null);
    try {
      await adminApproveEmployerJob(id);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not approve this posting.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (rejectReason.trim().length < 3) { setError('Enter a rejection reason (min 3 characters).'); return; }
    setBusyId(id); setError(null);
    try {
      await adminRejectEmployerJob(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reject this posting.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-heading font-extrabold text-slate-900">Employer Job Moderation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            First-time postings from employers with no previously approved job. Approving one also marks
            the employer trusted — their later postings publish automatically.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <Clock3 className="w-3.5 h-3.5" /> {items.length} awaiting review
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-slate-400 font-semibold">Loading pending postings…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-slate-400 font-semibold">Nothing awaiting review.</div>
      ) : (
        <div className="space-y-4">
          {items.map((job) => (
            <div key={job.id} className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{job.title}</div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {job.companyName}</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {job.employerEmail || '—'}
                      {job.employerEmailVerified
                        ? <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        : <ShieldAlert className="w-3 h-3 text-amber-500" />}
                    </span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.city}, {job.state}</span>
                    <span>{job.jobType}{job.department ? ` · ${job.department}` : ''}</span>
                    {(job.salaryMin || job.salaryMax) && <span>₹{job.salaryMin || '—'}–{job.salaryMax || '—'}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Submitted {new Date(job.createdDate).toLocaleString()} · prior approved postings: {job.priorApprovedPostings}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 whitespace-pre-line">
                {expanded === job.id ? job.description : `${job.description.slice(0, 260)}${job.description.length > 260 ? '…' : ''}`}
                <button onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                  className="ml-1 text-indigo-600 font-bold cursor-pointer">
                  {expanded === job.id ? 'show less' : 'show full posting'}
                </button>
              </div>

              {expanded === job.id && (
                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {job.requirements && <div className="whitespace-pre-line"><span className="font-bold text-slate-700">Requirements: </span>{job.requirements}</div>}
                  {job.benefits && <div className="whitespace-pre-line"><span className="font-bold text-slate-700">Benefits: </span>{job.benefits}</div>}
                  {job.skills && <div><span className="font-bold text-slate-700">Skills: </span>{job.skills}</div>}
                  {job.attachmentUrl && (
                    <a href={job.attachmentUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 font-bold hover:underline">
                      <Paperclip className="w-3 h-3" /> {job.attachmentName || 'Job details attachment'}
                    </a>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span><span className="font-bold">Work mode:</span> {job.workMode}</span>
                    {job.experienceRequired && <span><span className="font-bold">Experience:</span> {job.experienceRequired}</span>}
                    {job.openings != null && <span><span className="font-bold">Openings:</span> {job.openings}</span>}
                    {job.lastDate && <span><span className="font-bold">Apply by:</span> {new Date(job.lastDate).toLocaleDateString()}</span>}
                    {job.isUrgent && <span className="text-rose-600 font-bold">Marked urgent</span>}
                  </div>
                </div>
              )}
              <div className="text-[11px] text-slate-500"><span className="font-bold">Qualification:</span> {job.qualification}</div>

              {rejectingId === job.id ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Reason shown to the employer (e.g. couldn't verify company details)…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReject(job.id)} disabled={busyId === job.id}
                      className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
                      {busyId === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Confirm reject
                    </button>
                    <button onClick={() => { setRejectingId(null); setRejectReason(''); setError(null); }}
                      className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleApprove(job.id)} disabled={busyId === job.id}
                    className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
                    {busyId === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve &amp; publish
                  </button>
                  <button onClick={() => { setRejectingId(job.id); setRejectReason(''); setError(null); }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-1.5 rounded-xl cursor-pointer">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
