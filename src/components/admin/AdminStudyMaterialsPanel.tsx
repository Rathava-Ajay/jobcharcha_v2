import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllStudyMaterials, createStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
  ApiStudyMaterial, UpsertStudyMaterialPayload,
} from '../../api/studyMaterial';
import { ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { Select } from '../ui/Select';

const MATERIAL_TYPES = ['Notes', 'EBook', 'Video', 'Syllabus'];

const emptyForm: UpsertStudyMaterialPayload = {
  title: '',
  categoryId: 0,
  description: '',
  materialType: 'Notes',
  filePath: '',
  fileSize: 0,
  isActive: true,
};

interface Props {
  categories: ApiCategory[];
}

export const AdminStudyMaterialsPanel: React.FC<Props> = ({ categories }) => {
  const [items, setItems] = useState<ApiStudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertStudyMaterialPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllStudyMaterials().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateStudyMaterial(editingId, form);
      else await createStudyMaterial(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save study material.');
    }
  };

  const handleEdit = (item: ApiStudyMaterial) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      categoryId: item.categoryId,
      description: item.description,
      materialType: item.materialType,
      filePath: item.filePath,
      fileSize: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteStudyMaterial(id);
    load();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Study Materials</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Material
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Material' : 'New Material'}</h3>
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
              <Select required value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                <option value="" disabled>Select a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Material Type</label>
              <Select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description</label>
              <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={3} />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">File URL</label>
              <input required value={form.filePath} onChange={(e) => setForm({ ...form, filePath: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">File Size (bytes)</label>
              <input type="number" min={0} value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Material'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading study materials…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No study materials yet.</div>
        ) : items.map((item) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title}</div>
              <div className="text-slate-500">{item.categoryName} • {item.materialType} • {item.fileSizeDisplay} • {item.downloadCount} downloads</div>
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
