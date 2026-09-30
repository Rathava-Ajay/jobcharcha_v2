import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Search, Loader2 } from 'lucide-react';
import { getCategories, ApiCategory } from '../api/categories';
import { searchStudyMaterials, registerStudyMaterialDownload, ApiStudyMaterial } from '../api/studyMaterial';

const TYPES = ['All', 'Notes', 'EBook', 'Video', 'Syllabus'];

export const StudyMaterialSection: React.FC = () => {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [materials, setMaterials] = useState<ApiStudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      searchStudyMaterials({
        categoryId: selectedCategoryId ?? undefined,
        materialType: selectedType !== 'All' ? selectedType : undefined,
        search: searchQuery.trim() || undefined,
      })
        .then(setMaterials)
        .catch(() => setMaterials([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [selectedCategoryId, selectedType, searchQuery]);

  const handleDownload = async (material: ApiStudyMaterial) => {
    try {
      const res = await registerStudyMaterialDownload(material.slug);
      window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      setMaterials((prev) => prev.map((m) => (m.id === material.id ? { ...m, downloadCount: m.downloadCount + 1 } : m)));
    } catch {
      window.open(material.filePath, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Official Study Materials & Syllabus Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
            Free Notes, EBooks & Syllabus PDFs
          </h2>
          <p className="text-xs text-slate-500">
            Verified study modules, sourced from official category-wise exam material.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, syllabus…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Filter Bars */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedCategoryId === null ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Material Grid */}
      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin" /></div>
      ) : materials.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">No study material matches your filters yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((material) => (
            <div
              key={material.id}
              className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase inline-block">
                  {material.categoryName} &middot; {material.materialType}
                </span>

                <h3 className="font-heading font-extrabold text-sm text-slate-900 leading-snug">
                  {material.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{material.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="font-mono text-slate-700 font-bold">{material.fileSizeDisplay}</span>
                  <span>&middot;</span>
                  <span>{material.downloadCount.toLocaleString()} downloads</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-end">
                <button
                  onClick={() => handleDownload(material)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
