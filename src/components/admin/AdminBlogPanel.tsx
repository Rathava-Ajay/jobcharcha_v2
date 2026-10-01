import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllBlogPosts, adminGetBlogPostById, createBlogPost, updateBlogPost, deleteBlogPost,
  ApiBlogListItem, UpsertBlogPayload,
} from '../../api/blog';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { OfficialDocumentUpload } from './OfficialDocumentUpload';
import { Select } from '../ui/Select';

const emptyForm: UpsertBlogPayload = {
  title: '',
  excerpt: '',
  content: '',
  officialNotificationUrl: null,
  isFeatured: false,
  isPublished: true,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
}

export const AdminBlogPanel: React.FC<Props> = ({ categories }) => {
  const [items, setItems] = useState<ApiBlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertBlogPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllBlogPosts().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateBlogPost(editingId, form);
      else await createBlogPost(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save blog post.');
    }
  };

  const handleEdit = async (item: ApiBlogListItem) => {
    const full = await adminGetBlogPostById(item.id).catch(() => null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      excerpt: item.excerpt,
      content: full?.content || '',
      titleGujarati: full?.titleGujarati || undefined,
      contentGujarati: full?.contentGujarati || undefined,
      featuredImage: item.featuredImage || undefined,
      officialNotificationUrl: full?.officialNotificationUrl ?? null,
      categoryId: full?.categoryId || undefined,
      tags: full?.tags || undefined,
      author: item.author || undefined,
      readTime: item.readTime,
      isFeatured: item.isFeatured,
      isPublished: item.isPublished,
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
    await deleteBlogPost(id);
    load();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Blog</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Post
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Post' : 'New Post'}</h3>
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
              <label className="text-slate-700 block mb-1">Excerpt</label>
              <textarea required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Content</label>
              <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={5} />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Author</label>
              <input value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Read Time (minutes)</label>
              <input type="number" min={0} value={form.readTime || 0} onChange={(e) => setForm({ ...form, readTime: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Tags (comma separated)</label>
              <input value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <OfficialDocumentUpload
                value={form.officialNotificationUrl ?? null}
                onChange={(url) => setForm({ ...form, officialNotificationUrl: url })}
                label="Official Notification / Source (PDF or image)"
                hint="Attach the source notification or reference document for this post. Optional."
              />
            </div>
            <div className="flex items-end gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isPublished !== false} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Post'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading blog posts…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No blog posts yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title}</div>
              <div className="text-slate-500">
                {item.categoryName} • {item.publishedDate}{item.author && ` • ${item.author}`}{item.isFeatured && ' • Featured'}{!item.isPublished && ' • Draft'}
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
