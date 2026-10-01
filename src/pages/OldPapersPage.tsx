import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Search, Download, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getCategories, ApiCategory } from '../api/categories';
import { searchOldPapers, getOldPaperYears, ApiOldPaperListItem } from '../api/oldPapers';
import { Select } from '../components/ui/Select';

export default function OldPapersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [papers, setPapers] = useState<ApiOldPaperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
    getOldPaperYears().then(setYears).catch(() => setYears([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      searchOldPapers({
        categoryId: selectedCategoryId ?? undefined,
        year: selectedYear ?? undefined,
        search: search.trim() || undefined,
      })
        .then(setPapers)
        .catch(() => setPapers([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedCategoryId, selectedYear]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <SeoHead title="Old Solved Papers | JobCharcha" description="Previous-year solved question papers for government recruitment and competitive exams, with answer keys — free to download." path="/old-papers" />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <FileText className="w-3.5 h-3.5" /> Solved Archives
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Old Solved Papers</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">
            {papers.length > 0 ? `${papers.length} papers available` : 'Loading old papers…'} — official question papers with verified answer keys.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or exam…"
              className="w-full bg-white border border-slate-200 rounded-xl text-sm text-slate-900 pl-10 pr-3 py-3 focus:outline-none focus:border-indigo-500 font-medium shadow-2xs"
            />
          </div>
          <Select
            value={selectedYear ?? ''}
            onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
            className="bg-white border border-slate-200 rounded-xl text-sm text-slate-800 px-3 py-3 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer shadow-2xs"
          >
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryId === null ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryId === c.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No old papers found</h3>
            <p className="text-xs text-slate-500 mt-1">Try a different category, year, or search term.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {papers.map((paper) => (
              <button
                key={paper.id}
                onClick={() => navigate(`/old-papers/${paper.slug}`)}
                className="w-full text-left bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{paper.year} Paper</span>
                    <span className="text-xs text-slate-500">{paper.categoryName}</span>
                    {paper.isFeatured && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        <Sparkles className="w-3 h-3" /> Featured
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-lg">{paper.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{paper.examName}{paper.subject ? ` · ${paper.subject}` : ''} &middot; {(paper.downloads ?? 0).toLocaleString()} Downloads</p>
                </div>
                <span className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 self-start md:self-auto shrink-0">
                  <Download className="w-4 h-4 text-emerald-400" /> View & Download
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
