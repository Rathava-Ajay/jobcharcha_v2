import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Pencil, X, Smartphone } from 'lucide-react';
import {
  adminGetAllAdmitCards, createAdmitCard, updateAdmitCard, deleteAdmitCard,
  ApiAdmitCardListItem, UpsertAdmitCardPayload,
} from '../../api/admitCards';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { BulkImportExportBar } from './BulkImportExportBar';
import { OfficialDocumentUpload } from './OfficialDocumentUpload';
import { Select } from '../ui/Select';

const emptyForm: UpsertAdmitCardPayload = {
  title: '',
  organizationName: '',
  admitCardReleaseDate: new Date().toISOString().slice(0, 10),
  isFeatured: false,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
  onChanged?: () => void;
}

export const AdminAdmitCardsPanel: React.FC<Props> = ({ categories, onChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiAdmitCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertAdmitCardPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllAdmitCards().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateAdmitCard(editingId, form);
      else await createAdmitCard(form);
      resetForm();
      load();
      onChanged?.();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save admit card.');
    }
  };

  const handleEdit = async (id: number) => {
    const { getAdmitCardBySlug } = await import('../../api/admitCards');
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const full = await getAdmitCardBySlug(item.slug).catch(() => null);
    setEditingId(id);
    setForm({
      title: item.title,
      organizationName: item.organizationName,
      examName: item.examName || undefined,
      categoryId: full?.categoryId || undefined,
      admitCardReleaseDate: item.releaseDate,
      examDate: item.examDate || undefined,
      downloadLink: full?.downloadLink ?? full?.downloadUrl ?? undefined,
      admitCardPdf: full?.admitCardPdf || undefined,
      postName: full?.postName || undefined,
      state: full?.state || undefined,
      description: full?.description || undefined,
      instructions: full?.instructions || undefined,
      howToDownload: full?.howToDownload || undefined,
      importantNotes: full?.importantNotes || undefined,
      isFeatured: item.isFeatured,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteAdmitCard(id);
    load();
    onChanged?.();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Admit Cards</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/mobile-post-admitcard')} className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Post via Mobile/AI
          </button>
          <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> New Admit Card
          </button>
        </div>
      </div>

      <BulkImportExportBar entityLabel="Admit Cards" exportPath="/api/admitcards/admin/export" importPath="/api/admitcards/admin/bulk-import" onImported={load} />

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Admit Card' : 'New Admit Card'}</h3>
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
              <label className="text-slate-700 block mb-1">Organization</label>
              <input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Category</label>
              <Select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Release Date</label>
              <input type="date" required value={form.admitCardReleaseDate} onChange={(e) => setForm({ ...form, admitCardReleaseDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Exam Date</label>
              <input type="date" value={form.examDate || ''} onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Download Link</label>
              <input value={form.downloadLink || ''} onChange={(e) => setForm({ ...form, downloadLink: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <OfficialDocumentUpload
                value={form.admitCardPdf ?? null}
                onChange={(url) => setForm({ ...form, admitCardPdf: url ?? undefined })}
                label="Official Admit Card / Notification (PDF or image)"
                hint="Attach the official admit-card notice. Used for the Download button when no link is set."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Instructions</label>
              <textarea value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={3} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Admit Card'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading admit cards…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No admit cards yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title}</div>
              <div className="text-slate-500">{item.organizationName} • Release: {item.releaseDate} • <span className="font-bold">{item.status}</span> • <span className="font-bold text-indigo-600">{item.viewsCount.toLocaleString()} views</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item.id)} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
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
