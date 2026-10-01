import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { adminGetAllAlertSubscribers, adminSetAlertSubscriberActive, ApiAlertPreferenceAdminListItem } from '../../api/alerts';

export const AdminJobAlertsPanel: React.FC = () => {
  const [items, setItems] = useState<ApiAlertPreferenceAdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllAlertSubscribers().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item: ApiAlertPreferenceAdminListItem) => {
    setBusyId(item.id);
    try {
      await adminSetAlertSubscriberActive(item.id, !item.isActive);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = items.filter((i) => i.isActive).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Job Alert Subscribers</h2>
        <span className="text-xs font-bold text-slate-500">{activeCount} active / {items.length} total</span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading subscribers…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No alert subscribers yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-[15px] break-words">{item.name || item.email}</div>
              <div className="flex flex-wrap items-center gap-3 text-slate-500">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                {item.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</span>}
                {item.whatsAppNumber && <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {item.whatsAppNumber}</span>}
              </div>
              <div className="text-slate-400">
                {item.alertFrequency} • {item.preferredCategories.length > 0 ? item.preferredCategories.join(', ') : 'All categories'}
                {item.preferredRegion && ` • ${item.preferredRegion}`} • Joined {item.createdAt}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold px-3 py-1.5 rounded-xl ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {item.isActive ? 'Active' : 'Unsubscribed'}
              </span>
              <button
                onClick={() => handleToggle(item)}
                disabled={busyId === item.id}
                className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40"
              >
                {item.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
