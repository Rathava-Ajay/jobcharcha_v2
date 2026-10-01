import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Smartphone } from 'lucide-react';
import { adminGetAllTests, deleteTest, ApiTestAdminListItem } from '../../api/tests';
import { ApiError } from '../../api/client';

interface Props {
  onChanged?: () => void;
}

export const AdminMockTestsPanel: React.FC<Props> = ({ onChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiTestAdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllTests().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); setError(null); return; }
    setConfirmDeleteId(null);
    setBusyId(id);
    setError(null);
    try {
      await deleteTest(id);
      // Optimistic removal so the row disappears immediately, then reconcile with the server.
      setItems((list) => list.filter((t) => t.id !== id));
      load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not archive this mock test. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Mock Tests</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/admin/mobile-post-quiz')} className="bg-white border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Post Daily Quiz via Mobile/AI
          </button>
          <button onClick={() => navigate('/admin/mobile-post-mocktest')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-colors">
            <Smartphone className="w-4 h-4" /> Post Mock Test via Mobile/AI
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading mock tests…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No mock tests yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div>
              <div className="font-bold text-slate-900 text-[15px] break-words">{item.title}</div>
              <div className="text-slate-500">
                {item.examName} • {item.totalQuestions} questions • {item.isFree ? 'Free' : `₹${item.price ?? '—'}`} • <span className="font-bold">{item.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              {confirmDeleteId === item.id && (
                <div className="text-[11px] text-slate-500 mt-1.5 max-w-md">
                  Archives the test — it's hidden from students and this list, but its questions and
                  every past attempt stay in the database. This can be undone in the database.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDelete(item.id)}
                disabled={busyId === item.id}
                className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1 disabled:opacity-60"
              >
                <Archive className="w-3.5 h-3.5" />
                {busyId === item.id ? 'Archiving…' : confirmDeleteId === item.id ? 'Confirm archive?' : 'Archive'}
              </button>
              {confirmDeleteId === item.id && busyId !== item.id && (
                <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
