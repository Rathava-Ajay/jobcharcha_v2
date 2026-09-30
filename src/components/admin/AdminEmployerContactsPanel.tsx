import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ShieldAlert, PlusCircle, MinusCircle } from 'lucide-react';
import {
  adminGetContactLogs, adminGetEmployerOverview, adminAdjustCredits, adminGetFraudFlags,
  ApiAdminContactLogItem, AdminEmployerOverview, ApiFraudFlag,
} from '../../api/adminEmployer';
import { ApiError } from '../../api/client';

const STATUS_LABEL: Record<string, string> = {
  success: 'Unlocked',
  blocked_expired: 'Blocked — expired',
  blocked_no_credits: 'Blocked — no credits',
  blocked_both: 'Blocked — expired & no credits',
};

export const AdminEmployerContactsPanel: React.FC = () => {
  const [logs, setLogs] = useState<ApiAdminContactLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [fraudFlags, setFraudFlags] = useState<ApiFraudFlag[]>([]);

  const [overview, setOverview] = useState<AdminEmployerOverview | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustBusy, setAdjustBusy] = useState(false);

  const loadLogs = useCallback((status?: string) => {
    setLoading(true);
    adminGetContactLogs({ status: status || undefined, pageSize: 50 })
      .then((r) => { setLogs(r.items); setTotalCount(r.totalCount); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { adminGetFraudFlags(20).then(setFraudFlags).catch(() => {}); }, []);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); loadLogs(statusFilter || undefined); };

  const openOverview = async (employerProfileId: string) => {
    const data = await adminGetEmployerOverview(employerProfileId).catch(() => null);
    if (data) { setOverview(data); setAdjustAmount(0); setAdjustReason(''); setAdjustError(null); }
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview || !adjustReason.trim() || adjustAmount === 0) {
      setAdjustError('Enter a non-zero amount and a reason.');
      return;
    }
    setAdjustBusy(true);
    setAdjustError(null);
    try {
      await adminAdjustCredits(overview.employerProfileId, adjustAmount, adjustReason.trim());
      const fresh = await adminGetEmployerOverview(overview.employerProfileId);
      setOverview(fresh);
      setAdjustAmount(0);
      setAdjustReason('');
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.message : 'Failed to adjust credits.');
    } finally {
      setAdjustBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {fraudFlags.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm"><ShieldAlert className="w-4 h-4" /> Possible Fraud — High Contact Volume Today</div>
          <div className="space-y-1.5">
            {fraudFlags.map((f) => (
              <button
                key={f.employerProfileId}
                onClick={() => openOverview(String(f.employerProfileId))}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-amber-900 bg-white/60 hover:bg-white rounded-xl px-3 py-2 cursor-pointer"
              >
                <span>{f.companyName}</span>
                <span>{f.contactsToday} contacts today (threshold {f.threshold})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-heading font-extrabold text-slate-900">Employer Contact Audit Log</h2>
          <span className="text-xs font-bold text-slate-500">{totalCount} attempts</span>
        </div>

        <form onSubmit={handleFilter} className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold"
          >
            <option value="">All statuses</option>
            <option value="success">Unlocked</option>
            <option value="blocked_expired">Blocked — expired</option>
            <option value="blocked_no_credits">Blocked — no credits</option>
            <option value="blocked_both">Blocked — both</option>
          </select>
          <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Filter
          </button>
        </form>

        <div className="space-y-2">
          {loading ? (
            <div className="text-xs text-slate-400 font-semibold">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-xs text-slate-400 font-semibold">No contact attempts found.</div>
          ) : logs.map((log) => (
            <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <button onClick={() => openOverview(String(log.employerProfileId))} className="font-bold text-slate-900 hover:underline cursor-pointer">{log.companyName}</button>
                <span className="text-slate-400"> → {log.candidateName}</span>
                <div className="text-slate-400">{new Date(log.createdDate).toLocaleString('en-IN')}</div>
              </div>
              <span className={`font-extrabold ${log.status === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                {STATUS_LABEL[log.status] || log.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {overview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOverview(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-heading font-extrabold text-slate-900">{overview.companyName}</h3>
              <button onClick={() => setOverview(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Plan</span>
                <span className="font-bold text-slate-800">{overview.subscription.planName || 'None'} ({overview.subscription.status})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Credits</span>
                <span className="font-bold text-slate-800">{overview.credits.isUnlimited ? 'Unlimited' : `${overview.credits.creditsRemaining} / ${overview.credits.totalCredits}`}</span>
              </div>
            </div>

            <form onSubmit={submitAdjustment} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs font-bold">
              <span className="text-slate-700 block">Manual Credit Adjustment</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAdjustAmount((a) => a - 1)} className="text-slate-500 cursor-pointer"><MinusCircle className="w-4 h-4" /></button>
                <input
                  type="number" value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-20 text-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-medium"
                />
                <button type="button" onClick={() => setAdjustAmount((a) => a + 1)} className="text-slate-500 cursor-pointer"><PlusCircle className="w-4 h-4" /></button>
                <span className="text-slate-400 font-medium">credits (negative to revoke)</span>
              </div>
              <textarea
                required value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason (required — shown in the audit ledger)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2}
              />
              {adjustError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{adjustError}</div>}
              <button type="submit" disabled={adjustBusy} className="bg-slate-900 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl cursor-pointer">
                {adjustBusy ? 'Saving…' : 'Apply Adjustment'}
              </button>
            </form>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Recent Contact Logs</span>
              <div className="space-y-1.5">
                {overview.recentContactLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800">{log.candidateName}</span>
                    <span className={log.status === 'success' ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{STATUS_LABEL[log.status] || log.status}</span>
                  </div>
                ))}
                {overview.recentContactLogs.length === 0 && <p className="text-xs text-slate-400 font-semibold">No contact attempts yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
