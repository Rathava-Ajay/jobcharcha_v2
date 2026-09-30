import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Trash2, Pencil, X } from 'lucide-react';
import {
  adminGetAllProducts, createProduct, updateProduct, deleteProduct,
  ApiProduct, UpsertProductPayload,
} from '../../api/products';
import { ApiError } from '../../api/client';

const emptyForm: UpsertProductPayload = {
  title: '',
  category: '',
  isFree: false,
  isActive: true,
  isFeatured: false,
};

export const AdminProductsPanel: React.FC = () => {
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpsertProductPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllProducts().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(false); setFormError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) await updateProduct(editingId, form);
      else await createProduct(form);
      resetForm();
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save product.');
    }
  };

  const handleEdit = (item: ApiProduct) => {
    setEditingId(item.productId);
    setForm({
      title: item.title,
      slug: item.slug,
      shortDescription: item.shortDescription ?? undefined,
      description: item.description ?? undefined,
      category: item.category,
      subCategory: item.subCategory ?? undefined,
      googleDriveDownloadUrl: item.googleDriveDownloadUrl ?? undefined,
      googleDriveViewUrl: item.googleDriveViewUrl ?? undefined,
      coverImageUrl: item.coverImageUrl ?? undefined,
      isFree: item.isFree,
      price: item.price ?? undefined,
      originalPrice: item.originalPrice ?? undefined,
      whatIncluded: item.whatIncluded ?? undefined,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    await deleteProduct(id);
    load();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-extrabold text-slate-900">Store Products</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4" /> New Product
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingId ? 'Edit Product' : 'New Product'}</h3>
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
              <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. GPSC, Reasoning, Books"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Sub-Category</label>
              <input value={form.subCategory ?? ''} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Short Description</label>
              <input value={form.shortDescription ?? ''} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Description</label>
              <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">Google Drive Download URL</label>
              <input value={form.googleDriveDownloadUrl ?? ''} onChange={(e) => setForm({ ...form, googleDriveDownloadUrl: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">Cover Image URL</label>
              <input value={form.coverImageUrl ?? ''} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free Product</label>
            </div>
            {!form.isFree && (
              <>
                <div>
                  <label className="text-slate-700 block mb-1">Price (₹)</label>
                  <input type="number" min={0} value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1">Original Price (₹)</label>
                  <input type="number" min={0} value={form.originalPrice ?? ''} onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1">What's Included</label>
              <textarea value={form.whatIncluded ?? ''} onChange={(e) => setForm({ ...form, whatIncluded: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
            </div>
            <div className="flex items-end gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
            {editingId ? 'Save Changes' : 'Publish Product'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading products…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No products yet.</div>
        ) : items.map((item) => (
          <div key={item.productId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">{item.title} {!item.isActive && <span className="text-red-500">(inactive)</span>}</div>
              <div className="text-slate-500">{item.category} • {item.isFree ? 'Free' : `₹${item.price}`} • {item.totalSales} sales • {item.totalDownloads} downloads</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(item.productId)} className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteId === item.productId ? 'Confirm Delete?' : 'Delete'}
              </button>
              {confirmDeleteId === item.productId && (
                <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-xl cursor-pointer">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
