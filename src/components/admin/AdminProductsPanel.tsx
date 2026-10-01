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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Store Products</h2>
        <button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors">
          <PlusCircle className="w-4 h-4" /> New Product
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[16px] font-extrabold text-slate-900">{editingId ? 'Edit Product' : 'New Product'}</h3>
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
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Category</label>
              <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. GPSC, Reasoning, Books"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Sub-Category</label>
              <input value={form.subCategory ?? ''} onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Short Description</label>
              <input value={form.shortDescription ?? ''} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Description</label>
              <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Google Drive Download URL</label>
              <input value={form.googleDriveDownloadUrl ?? ''} onChange={(e) => setForm({ ...form, googleDriveDownloadUrl: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div>
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">Cover Image URL</label>
              <input value={form.coverImageUrl ?? ''} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free Product</label>
            </div>
            {!form.isFree && (
              <>
                <div>
                  <label className="text-slate-700 block mb-1.5 text-[12.5px]">Price (₹)</label>
                  <input type="number" min={0} value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1.5 text-[12.5px]">Original Price (₹)</label>
                  <input type="number" min={0} value={form.originalPrice ?? ''} onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="text-slate-700 block mb-1.5 text-[12.5px]">What's Included</label>
              <textarea value={form.whatIncluded ?? ''} onChange={(e) => setForm({ ...form, whatIncluded: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
            </div>
            <div className="flex items-end gap-4 pb-1 md:col-span-2">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            </div>
          </div>
          <button type="submit" className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[14px] px-6 py-3 rounded-xl cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)] transition-colors">
            {editingId ? 'Save Changes' : 'Publish Product'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading products…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No products yet.</div>
        ) : items.map((item) => (
          <div key={item.productId} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
            <div>
              <div className="font-bold text-slate-900 text-[15px] break-words">{item.title} {!item.isActive && <span className="text-red-500">(inactive)</span>}</div>
              <div className="text-slate-500">{item.category} • {item.isFree ? 'Free' : `₹${item.price}`} • {item.totalSales} sales • {item.totalDownloads} downloads</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(item.productId)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteId === item.productId ? 'Confirm Delete?' : 'Delete'}
              </button>
              {confirmDeleteId === item.productId && (
                <button onClick={() => setConfirmDeleteId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
