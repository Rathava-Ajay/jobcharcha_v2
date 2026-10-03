import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Pencil, X, Smartphone } from 'lucide-react';
import {
  adminGetAllResults, createResult, updateResult, deleteResult,
  ApiResultListItem, UpsertResultPayload,
} from '../../api/results';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { BulkImportExportBar } from './BulkImportExportBar';
import { OfficialDocumentUpload } from './OfficialDocumentUpload';
import { Select } from '../ui/Select';
import { SkipSocialCheckbox, ShareAgainButton } from './SocialShareControls';

const emptyForm: UpsertResultPayload = {
  title: '',
  organizationName: '',
  resultDate: new Date().toISOString().slice(0, 10),
  isFeatured: false,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
  onChanged?: () => void;
}

export const AdminResultsPanel: React.FC<Props> = ({ categories, onChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertResultPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllResults().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateResult(editingId, form);
      else await createResult(form);
      resetForm();
      load();
      onChanged?.();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save result.');
    }
  };

  const handleEdit = async (id: number) => {
    const { getResultBySlug } = await import('../../api/results');
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const full = await getResultBySlug(item.slug).catch(() => null);
    setEditingId(id);
    setForm({
      title: item.title,
      organizationName: item.organizationName,
      examName: item.examName || undefined,
      categoryId: full?.categoryId || undefined,
      resultDate: item.resultDate,
      resultLink: full?.resultLink || undefined,
      resultPdf: full?.resultPdf || undefined,
      cutOffMarks: full?.cutOffMarks || undefined,
      selectedCandidates: full?.selectedCandidates || undefined,
      state: full?.state || undefined,
      description: full?.description || undefined,
      isFeatured: item.isFeatured,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteResult(id);
    load();
    onChanged?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Results</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/admin/mobile-post-result')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-colors">
            <Smartphone className="w-4 h-4" /> Post via Mobile/AI
          </button>
          <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors">
            <PlusCircle className="w-4 h-4" /> New Result
          </button>
        </div>
      </div>

      <BulkImportExportBar entityLabel="Results" exportPath="/api/results/admin/export" importPath="/api/results/admin/bulk-import" onImported={load} />

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[16px] font-extrabold text-slate-900">{editingId ? 'Edit Result' : 'New Result'}</h3>
            <button type="button" onClick={resetForm} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px]">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Organization</label>
              <input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Category</label>
              <Select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Result Date</label>
              <input type="date" required value={form.resultDate} onChange={(e) => setForm({ ...form, resultDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Result PDF / Link</label>
              <input value={form.resultPdf || form.resultLink || ''} onChange={(e) => setForm({ ...form, resultPdf: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="md:col-span-2">
              <OfficialDocumentUpload
                value={form.resultPdf ?? null}
                onChange={(url) => setForm({ ...form, resultPdf: url ?? undefined })}
                label="…or upload the official result notification (PDF or image)"
                hint="Uploading fills the Result PDF / Link field above with the stored file URL."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Cut-off Marks</label>
              <textarea value={form.cutOffMarks || ''} onChange={(e) => setForm({ ...form, cutOffMarks: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Selected Candidates</label>
              <textarea value={form.selectedCandidates || ''} onChange={(e) => setForm({ ...form, selectedCandidates: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <SkipSocialCheckbox checked={!!form.skipSocial} onChange={(v) => setForm({ ...form, skipSocial: v })} />
          <button type="submit" className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[14px] px-6 py-3 rounded-xl cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)] transition-colors">
            {editingId ? 'Save Changes' : 'Publish Result'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading results…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No results yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div>
              <div className="font-bold text-slate-900 text-[15px] break-words">{item.title}</div>
              <div className="text-slate-500">{item.organizationName} • Published: {item.resultDate} • <span className="font-bold text-indigo-600">{item.viewsCount.toLocaleString()} views</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item.id)} className="bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <ShareAgainButton category="result" entityId={item.id} />
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
