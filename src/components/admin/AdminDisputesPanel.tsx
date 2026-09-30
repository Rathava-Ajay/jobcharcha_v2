import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search } from 'lucide-react';
import { adminGetDisputes, AdminDispute } from '../../api/adminPayments';

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  under_review: 'bg-amber-100 text-amber-800',
  action_required: 'bg-red-100 text-red-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-slate-200 text-slate-600',
};

export const AdminDisputesPanel: React.FC = () => {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((status?: string) => {
    setLoading(true);
    adminGetDisputes(status || undefined).then(setDisputes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); load(statusFilter || undefined); };

  const openCount = disputes.filter((d) => d.status === 'open' || d.status === 'under_review' || d.status === 'action_required').length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" /> Disputes &amp; Chargebacks
        </h2>
        {openCount > 0 && (
          <span className="bg-red-100 text-red-700 font-extrabold text-xs px-3 py-1.5 rounded-full">{openCount} need attention</span>
        )}
      </div>
      <p className="text-xs text-slate-500 -mt-3">
        Populated entirely from Razorpay&apos;s payment.dispute.* webhooks — every phase change
        (created, under review, action required, won, lost, closed) updates the same row.
      </p>

      <form onSubmit={handleFilter} className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under review</option>
          <option value="action_required">Action required</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="closed">Closed</option>
        </select>
        <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Filter
        </button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading…</div>
        ) : disputes.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No disputes on record.</div>
        ) : disputes.map((d) => (
          <div key={d.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-900">{d.razorpayDisputeId}</span>
              <span className="text-slate-400"> · payment {d.razorpayPaymentId}</span>
              <div className="text-slate-400">
                ₹{(d.amount / 100).toFixed(2)} · {d.reasonCode || 'no reason code'}
                {d.respondBy && <> · respond by {new Date(d.respondBy).toLocaleString('en-IN')}</>}
              </div>
              <div className="text-slate-400">
                {d.aspirantPaymentId ? `Aspirant payment #${d.aspirantPaymentId}` : d.orderId ? `Store order #${d.orderId}` : 'No local record matched'}
              </div>
            </div>
            <span className={`font-extrabold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[d.status] || 'bg-slate-200 text-slate-600'}`}>
              {d.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
