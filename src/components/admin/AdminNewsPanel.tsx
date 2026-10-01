import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllNews, createNews, updateNews, deleteNews, getNewsBySlug,
  ApiNewsListItem, UpsertNewsPayload,
} from '../../api/news';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { OfficialDocumentUpload } from './OfficialDocumentUpload';
import { Select } from '../ui/Select';

const emptyForm: UpsertNewsPayload = {
  title: '',
  summary: '',
  content: '',
  isBreaking: false,
  isFeatured: false,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
}

export const AdminNewsPanel: React.FC<Props> = ({ categories }) => {
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertNewsPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllNews().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateNews(editingId, form);
      else await createNews(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save news article.');
    }
  };

  const handleEdit = async (item: ApiNewsListItem) => {
    const full = await getNewsBySlug(item.slug).catch(() => null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary,
      content: full?.content || '',
      titleGujarati: full?.titleGujarati || undefined,
      contentGujarati: full?.contentGujarati || undefined,
      featuredImage: item.featuredImage || undefined,
      categoryId: full?.categoryId || undefined,
      source: full?.source || undefined,
      sourceLink: full?.sourceLink || undefined,
      isBreaking: item.isBreaking,
      isFeatured: item.isFeatured,
      metaTitle: full?.metaTitle || undefined,
      metaDescription: full?.metaDescription || undefined,
      metaKeywords: full?.metaKeywords || undefined,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteNews(id);
    load();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">News</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Article
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Article' : 'New Article'}</h3>
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
              <label className="text-slate-700 block mb-1">Category</label>
              <Select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Featured Image URL</label>
              <input value={form.featuredImage || ''} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Summary</label>
              <textarea required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Content</label>
              <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={5} />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Source</label>
              <input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Source Link</label>
              <input value={form.sourceLink || ''} onChange={(e) => setForm({ ...form, sourceLink: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <OfficialDocumentUpload
                value={form.sourceLink ?? null}
                onChange={(url) => setForm({ ...form, sourceLink: url ?? undefined })}
                label="…or upload the official source (PDF or image)"
                hint="Uploading fills the Source Link field above with the stored file URL."
              />
            </div>
            <div className="flex items-end gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!form.isBreaking} onChange={(e) => setForm({ ...form, isBreaking: e.target.checked })} /> Breaking</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Article'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading news…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No news articles yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title}</div>
              <div className="text-slate-500">{item.categoryName} • {item.publishedDate}{item.isBreaking && ' • Breaking'}{item.isFeatured && ' • Featured'}</div>
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
