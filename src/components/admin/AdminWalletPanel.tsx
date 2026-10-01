import React, { useState, useEffect, useCallback } from 'react';
import { Search, Wallet, PlusCircle, MinusCircle, ScrollText } from 'lucide-react';
import { adminSearchWallet, adminAdjustWallet, adminGetWalletAuditLog, AdminWalletLookup, WalletAuditLogItem } from '../../api/wallet';
import { ApiError } from '../../api/client';

export const AdminWalletPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AdminWalletLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  const [auditLog, setAuditLog] = useState<WalletAuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilter, setAuditFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(true);

  const loadAuditLog = useCallback((targetUserId?: string) => {
    setAuditLoading(true);
    adminGetWalletAuditLog({ targetUserId: targetUserId || undefined, pageSize: 50 })
      .then((r) => { setAuditLog(r.items); setAuditTotal(r.totalCount); })
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  }, []);

  useEffect(() => { loadAuditLog(); }, [loadAuditLog]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminSearchWallet(query.trim());
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'User not found.');
    } finally {
      setLoading(false);
    }
  };

  const adjust = async (sign: 1 | -1) => {
    if (!result) return;
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) { setAdjustError('Enter a valid amount.'); return; }
    if (!adjustNotes.trim()) { setAdjustError('Notes are required.'); return; }
    setAdjustError(null);
    setAdjusting(true);
    try {
      const res = await adminAdjustWallet(result.userId, amount * sign, adjustNotes.trim());
      setResult({ ...result, balance: res.balance });
      setAdjustAmount('');
      setAdjustNotes('');
      search();
      loadAuditLog(auditFilter || undefined);
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.message : 'Adjustment failed.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-emerald-600" /> Wallet Management
      </h2>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search by email or user ID"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium"
          />
        </div>
        <button onClick={search} disabled={loading} className="bg-slate-900 disabled:opacity-60 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-semibold">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-[15px] break-words">{result.name}</div>
              <div className="text-xs text-slate-500">{result.email}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Balance</div>
              <div className="text-xl font-black text-emerald-700">₹{result.balance}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-700">Manual Adjustment</div>
            {adjustError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-semibold">{adjustError}</div>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min={0}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Amount (₹)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
              />
              <input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Reason (required)"
                className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
              />
              <button onClick={() => adjust(1)} disabled={adjusting} className="bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 justify-center">
                <PlusCircle className="w-3.5 h-3.5" /> Credit
              </button>
              <button onClick={() => adjust(-1)} disabled={adjusting} className="bg-red-600 disabled:opacity-60 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 justify-center">
                <MinusCircle className="w-3.5 h-3.5" /> Debit
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Recent Transactions</div>
            {result.recentTransactions.length === 0 ? (
              <div className="text-xs text-slate-400">No transactions yet.</div>
            ) : (
              <div className="space-y-1.5">
                {result.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2">
                    <div>
                      <span className="font-bold text-slate-800">{t.type}</span>
                      <span className="text-slate-500 ml-2">{t.description}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{t.amount >= 0 ? '+' : ''}₹{t.amount}</span>
                      <span className="text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-slate-500" /> Adjustment Audit Trail
          </h3>
          <span className="text-xs font-bold text-slate-500">{auditTotal} record{auditTotal === 1 ? '' : 's'}</span>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); loadAuditLog(auditFilter || undefined); }}
          className="flex gap-2"
        >
          <input
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
            placeholder="Filter by target user ID"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium"
          />
          <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Filter
          </button>
        </form>
        {auditLoading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading…</div>
        ) : auditLog.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No admin adjustments recorded yet.</div>
        ) : (
          <div className="space-y-1.5">
            {auditLog.map((l) => (
              <div key={l.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">
                    {l.adminName || l.adminUserId} → {l.targetName || l.targetUserId}
                  </span>
                  <span className={`font-extrabold ${l.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {l.amount >= 0 ? '+' : ''}₹{l.amount} (bal. ₹{l.balanceAfter})
                  </span>
                </div>
                <div className="text-slate-500 mt-1">{l.reason}</div>
                <div className="text-slate-400 mt-1">
                  {new Date(l.createdDate).toLocaleString('en-IN')} {l.ipAddress ? `· ${l.ipAddress}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
