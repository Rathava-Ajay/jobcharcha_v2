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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Manage Exams</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Exam
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-4">
        Exams feed the "Exam" dropdown on mock-test posting (AI-import and manual) — a mock test can only be posted against an exam that exists here.
      </p>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Exam' : 'New Exam'}</h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-700 block mb-1">Exam Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Exam Name (Gujarati, optional)</label>
              <input value={form.nameGujarati || ''} onChange={(e) => setForm({ ...form, nameGujarati: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Category (optional)</label>
              <Select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Free Tests Allowed</label>
              <input type="number" min={0} value={form.freeTestsAllowed} onChange={(e) => setForm({ ...form, freeTestsAllowed: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
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
          <div className="text-xs text-slate-400 font-semibold">Loading exams…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No exams yet — mock tests can't be posted until at least one exists.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {item.name}
                {item.categoryName && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">{item.categoryName}</span>}
                {!item.isActive && <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">INACTIVE</span>}
              </div>
              {item.nameGujarati && <div className="text-slate-500">{item.nameGujarati}</div>}
              <div className="text-slate-500">{item.testCount} test{item.testCount === 1 ? '' : 's'} • {item.freeTestsAllowed} free allowed</div>
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
