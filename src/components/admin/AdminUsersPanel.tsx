import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Phone, BadgeCheck, Crown, ShieldCheck, Clock3 } from 'lucide-react';
import { adminGetAllUsers, adminSetUserActive, adminSetEmployerApproval, ApiUserAdminListItem } from '../../api/users';

export const AdminUsersPanel: React.FC = () => {
  const [items, setItems] = useState<ApiUserAdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((query?: string) => {
    setLoading(true);
    adminGetAllUsers(query).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const handleToggle = async (item: ApiUserAdminListItem) => {
    setBusyId(item.id);
    try {
      await adminSetUserActive(item.id, !item.isActive);
      load(search.trim() || undefined);
    } finally {
      setBusyId(null);
    }
  };

  const handleApproval = async (item: ApiUserAdminListItem) => {
    setBusyId(item.id);
    try {
      await adminSetEmployerApproval(item.id, !item.isEmployerApproved);
      load(search.trim() || undefined);
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = items.filter((i) => i.isActive).length;
  const unverifiedEmployers = items.filter((i) => i.role === 'employer' && i.isEmployerApproved === false).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">User Accounts</h2>
        <div className="flex items-center gap-2">
          {unverifiedEmployers > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
              <Clock3 className="w-3 h-3" /> {unverifiedEmployers} employer{unverifiedEmployers === 1 ? '' : 's'} not verified
            </span>
          )}
          <span className="text-xs font-bold text-slate-500">{activeCount} active / {items.length} total</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading users…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No users found.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                {item.firstName} {item.lastName}
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{item.role}</span>
                {item.isPremium && (
                  <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-500">
                {item.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {item.email}
                    {item.isEmailVerified && <BadgeCheck className="w-3 h-3 text-emerald-600" />}
                  </span>
                )}
                {item.phoneNumber && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phoneNumber}</span>}
              </div>
              <div className="text-slate-400">
                Joined {item.createdDate}{item.lastLoginDate && ` • Last login ${item.lastLoginDate}`}
                {item.signupSource && (
                  <span className="ml-1.5 inline-flex items-center bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded capitalize">
                    via {item.signupSource}{item.signupCampaign ? ` · ${item.signupCampaign}` : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {item.role === 'employer' && item.employerProfileId != null && (
                <>
                  <span
                    title="Public 'verified company' badge on this employer's listings. Does not gate job posting — that's handled by email verification + the Employer Job Moderation queue."
                    className={`inline-flex items-center gap-1 font-bold px-3 py-1.5 rounded-xl ${item.isEmployerApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> {item.isEmployerApproved ? 'Verified badge' : 'No badge'}
                  </span>
                  <button
                    onClick={() => handleApproval(item)}
                    disabled={busyId === item.id}
                    className={`font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 ${item.isEmployerApproved ? 'bg-white border border-slate-200 text-slate-700' : 'bg-emerald-600 text-white'}`}
                  >
                    {item.isEmployerApproved ? 'Remove badge' : 'Mark verified'}
                  </button>
                </>
              )}
              <span className={`font-bold px-3 py-1.5 rounded-xl ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {item.isActive ? 'Active' : 'Deactivated'}
              </span>
              <button
                onClick={() => handleToggle(item)}
                disabled={busyId === item.id}
                className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40"
              >
                {item.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
