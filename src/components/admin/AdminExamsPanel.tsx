import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import { adminGetAllExams, createExam, updateExam, deleteExam, ApiExam, UpsertExamPayload } from '../../api/tests';
import { getCategories, ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { Select } from '../ui/Select';

const emptyForm: UpsertExamPayload = {
  name: '',
  nameGujarati: '',
  categoryId: null,
  freeTestsAllowed: 1,
  displayOrder: 0,
  isActive: true,
};

export const AdminExamsPanel: React.FC = () => {
  const [items, setItems] = useState<ApiExam[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertExamPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllExams().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getCategories().then(setCategories).catch(() => {});
  }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateExam(editingId, form);
      else await createExam(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save exam.');
    }
  };

  const handleEdit = (item: ApiExam) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      nameGujarati: item.nameGujarati || '',
      categoryId: item.categoryId ?? null,
      freeTestsAllowed: item.freeTestsAllowed,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setDeleteError(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); setDeleteError(null); return; }
    setConfirmDeleteId(null);
    try {
      await deleteExam(id);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete exam.');
    }
  };

  return (
    <div className="shadow-sm bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Manage Exams</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors">
          <PlusCircle className="w-4 h-4" /> New Exam
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-4">
        Exams feed the "Exam" dropdown on mock-test posting (AI-import and manual) — a mock test can only be posted against an exam that exists here.
      </p>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[16px] font-extrabold text-slate-900">{editingId ? 'Edit Exam' : 'New Exam'}</h3>
            <button type="button" onClick={resetForm} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px]">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Exam Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Exam Name (Gujarati, optional)</label>
              <input value={form.nameGujarati || ''} onChange={(e) => setForm({ ...form, nameGujarati: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Category (optional)</label>
              <Select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Free Tests Allowed</label>
              <input type="number" min={0} value={form.freeTestsAllowed} onChange={(e) => setForm({ ...form, freeTestsAllowed: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (selectable when posting mock tests)</label>
            </div>
          </div>
          <button type="submit" className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            {editingId ? 'Save Changes' : 'Create Exam'}
          </button>
        </form>
      )}

      {deleteError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{deleteError}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading exams…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No exams yet — mock tests can't be posted until at least one exists.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div>
              <div className="font-bold text-slate-900 text-[15px] flex items-center gap-2 break-words">
                {item.name}
                {item.categoryName && <span className="bg-blue-50 text-blue-700 text-[10.5px] font-bold px-2 py-0.5 rounded-full">{item.categoryName}</span>}
                {!item.isActive && <span className="bg-slate-100 text-slate-500 text-[10.5px] font-bold px-2 py-0.5 rounded-full">INACTIVE</span>}
              </div>
              {item.nameGujarati && <div className="text-slate-500">{item.nameGujarati}</div>}
              <div className="text-slate-500">{item.testCount} test{item.testCount === 1 ? '' : 's'} • {item.freeTestsAllowed} free allowed</div>
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
