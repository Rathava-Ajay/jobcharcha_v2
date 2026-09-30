import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllGovtSchemes, createGovtScheme, updateGovtScheme, deleteGovtScheme, getGovtSchemeBySlug,
  ApiGovtSchemeListItem, UpsertGovtSchemePayload,
} from '../../api/govtSchemes';
import { ApiError } from '../../api/client';
import { OfficialDocumentUpload } from './OfficialDocumentUpload';

const emptyForm: UpsertGovtSchemePayload = {
  title: '',
  ministry: '',
  category: '',
  eligibility: '',
  benefits: '',
  applyLink: '',
  officialNotificationUrl: null,
  isFeatured: false,
  isActive: true,
};

export const AdminSchemesPanel: React.FC = () => {
  const [items, setItems] = useState<ApiGovtSchemeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertGovtSchemePayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllGovtSchemes().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateGovtScheme(editingId, form);
      else await createGovtScheme(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save scheme.');
    }
  };

  const handleEdit = async (item: ApiGovtSchemeListItem) => {
    const full = await getGovtSchemeBySlug(item.slug).catch(() => null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      ministry: item.ministry,
      category: item.category,
      eligibility: item.eligibility,
      benefits: item.benefits,
      applyLink: item.applyLink,
      officialNotificationUrl: full?.officialNotificationUrl ?? null,
      titleGujarati: full?.titleGujarati || undefined,
      description: full?.description || undefined,
      displayOrder: full?.displayOrder,
      isFeatured: item.isFeatured,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteGovtScheme(id);
    load();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Government Schemes</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Scheme
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Scheme' : 'New Scheme'}</h3>
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
              <label className="text-slate-700 block mb-1">Ministry / Department</label>
              <input required value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Category</label>
              <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Agriculture, Education, Health"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Eligibility</label>
              <textarea required value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Benefits</label>
              <textarea required value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Apply Link</label>
              <input required value={form.applyLink} onChange={(e) => setForm({ ...form, applyLink: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <OfficialDocumentUpload
                value={form.officialNotificationUrl ?? null}
                onChange={(url) => setForm({ ...form, officialNotificationUrl: url })}
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Scheme'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading schemes…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No schemes yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title}</div>
              <div className="text-slate-500">{item.ministry} • {item.category}{item.isFeatured && ' • Featured'}</div>
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
