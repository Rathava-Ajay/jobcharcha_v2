import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllPlans, createPlan, updatePlan, deletePlan, ApiAspirantPlan, UpsertAspirantPlanPayload,
} from '../../api/plans';
import { ApiError } from '../../api/client';

const emptyForm: UpsertAspirantPlanPayload = {
  name: '',
  nameGujarati: '',
  description: '',
  price: 199,
  durationDays: 365,
  unlocksAllTests: true,
  displayOrder: 0,
  isActive: true,
};

export const AdminAspirantPlansPanel: React.FC = () => {
  const [items, setItems] = useState<ApiAspirantPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertAspirantPlanPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllPlans().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updatePlan(editingId, form);
      else await createPlan(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save plan.');
    }
  };

  const handleEdit = (item: ApiAspirantPlan) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      nameGujarati: item.nameGujarati || '',
      description: item.description || '',
      price: item.price,
      durationDays: item.durationDays,
      unlocksAllTests: item.unlocksAllTests,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deletePlan(id);
    load();
  };

  return (
    <div className="shadow-sm bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Aspirant Subscription Plans</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors">
          <PlusCircle className="w-4 h-4" /> New Plan
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[16px] font-extrabold text-slate-900">{editingId ? 'Edit Plan' : 'New Plan'}</h3>
            <button type="button" onClick={resetForm} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px]">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Plan Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Plan Name (Gujarati, optional)</label>
              <input value={form.nameGujarati || ''} onChange={(e) => setForm({ ...form, nameGujarati: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Description (one feature per line or sentence — shown as bullet points)</label>
              <textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Price (₹)</label>
              <input type="number" required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Duration (days)</label>
              <input type="number" required min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="flex items-end flex-wrap gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.unlocksAllTests !== false} onChange={(e) => setForm({ ...form, unlocksAllTests: e.target.checked })} /> Unlocks all mock tests</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (visible on pricing page)</label>
            </div>
          </div>
          <button type="submit" className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            {editingId ? 'Save Changes' : 'Publish Plan'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading plans…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No plans yet — nothing is sellable until you publish one.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div>
              <div className="font-bold text-slate-900 text-[15px] flex items-center gap-2 break-words">
                {item.name}
                {item.unlocksAllTests && <span className="bg-emerald-50 text-emerald-700 text-[10.5px] font-bold px-2 py-0.5 rounded-full">ALL TESTS</span>}
                {!item.isActive && <span className="bg-slate-100 text-slate-500 text-[10.5px] font-bold px-2 py-0.5 rounded-full">INACTIVE</span>}
              </div>
              <div className="text-slate-500">
                ₹{item.price} / {item.durationDays} days
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(item.id)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteId === item.id ? 'Confirm Delete?' : 'Delete'}
              </button>
              {confirmDeleteId === item.id && (
                <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
