import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllOldPapers, createOldPaper, updateOldPaper, deleteOldPaper,
  ApiOldPaperDetail, UpsertOldPaperPayload,
} from '../../api/oldPapers';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { BulkImportExportBar } from './BulkImportExportBar';

const emptyForm: UpsertOldPaperPayload = {
  title: '',
  examName: '',
  categoryId: undefined,
  year: new Date().getFullYear(),
  description: '',
  paperPdfLink: '',
  solutionPdfLink: '',
  subject: '',
  paperType: '',
  isFeatured: false,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
}

export const AdminOldPapersPanel: React.FC<Props> = ({ categories }) => {
  const [items, setItems] = useState<ApiOldPaperDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertOldPaperPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllOldPapers().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateOldPaper(editingId, form);
      else await createOldPaper(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save old paper.');
    }
  };

  const handleEdit = (item: ApiOldPaperDetail) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      examName: item.examName,
      categoryId: item.categoryId ?? undefined,
      year: item.year,
      description: item.description || '',
      paperPdfLink: item.paperPdfLink,
      solutionPdfLink: item.solutionPdfLink || '',
      totalQuestions: item.totalQuestions ?? undefined,
      totalMarks: item.totalMarks ?? undefined,
      duration: item.duration ?? undefined,
      subject: item.subject || '',
      paperType: item.paperType || '',
      isFeatured: item.isFeatured,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteOldPaper(id);
    load();
  };

  return (
    <div className="shadow-sm bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Old Papers</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Paper
        </button>
      </div>

      <BulkImportExportBar entityLabel="Old Papers" exportPath="/api/old-papers/admin/export" importPath="/api/old-papers/admin/bulk-import" onImported={load} />

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Paper' : 'New Paper'}</h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Exam Name</label>
              <input required value={form.examName} onChange={(e) => setForm({ ...form, examName: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Category</label>
              <select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Year</label>
              <input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Subject (optional)</label>
              <input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description (optional)</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Question Paper PDF URL</label>
              <input required value={form.paperPdfLink} onChange={(e) => setForm({ ...form, paperPdfLink: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Answer Key / Solution PDF URL (optional)</label>
              <input value={form.solutionPdfLink || ''} onChange={(e) => setForm({ ...form, solutionPdfLink: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Total Questions (optional)</label>
              <input type="number" min={0} value={form.totalQuestions ?? ''} onChange={(e) => setForm({ ...form, totalQuestions: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Total Marks (optional)</label>
              <input type="number" min={0} value={form.totalMarks ?? ''} onChange={(e) => setForm({ ...form, totalMarks: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="flex items-end flex-wrap gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="shadow-sm hover:shadow-md transition-shadow active:scale-95 bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            {editingId ? 'Save Changes' : 'Publish Paper'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading old papers…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No old papers yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {item.title}
                {!item.isActive && <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">INACTIVE</span>}
              </div>
              <div className="text-slate-500">{item.examName} • {item.year} • {item.categoryName} • {item.downloads} downloads</div>
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
