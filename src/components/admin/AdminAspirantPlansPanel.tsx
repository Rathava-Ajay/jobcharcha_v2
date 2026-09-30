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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Aspirant Subscription Plans</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Plan
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Plan' : 'New Plan'}</h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 block mb-1">Plan Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Plan Name (Gujarati, optional)</label>
              <input value={form.nameGujarati || ''} onChange={(e) => setForm({ ...form, nameGujarati: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description (one feature per line or sentence — shown as bullet points)</label>
              <textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Price (₹)</label>
              <input type="number" required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Duration (days)</label>
              <input type="number" required min={1} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
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
          <div className="text-xs text-slate-400 font-semibold">Loading plans…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No plans yet — nothing is sellable until you publish one.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {item.name}
                {item.unlocksAllTests && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">ALL TESTS</span>}
                {!item.isActive && <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">INACTIVE</span>}
              </div>
              <div className="text-slate-500">
                ₹{item.price} / {item.durationDays} days
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteId === item.id ? 'Confirm Delete?' : 'Delete'}
              </button>
              {confirmDeleteId === item.id && (
                <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-xl cursor-pointer">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
