import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, FileText, Sparkles, HelpCircle, Trophy, Clock } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getOldPaperBySlug, registerOldPaperDownload, ApiOldPaperDetail } from '../api/oldPapers';

export default function OldPaperDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paper, setPaper] = useState<ApiOldPaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getOldPaperBySlug(slug)
      .then((data) => {
        setPaper(data);
        document.title = `${data.title} - Old Paper | JobCharcha`;
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleDownload = async (kind: 'paper' | 'solution') => {
    if (!paper) return;
    if (kind === 'solution') {
      if (paper.solutionPdfLink) window.open(paper.solutionPdfLink, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloading(true);
    try {
      const res = await registerOldPaperDownload(paper.slug);
      window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      setPaper({ ...paper, downloads: paper.downloads + 1 });
    } catch {
      if (paper.paperPdfLink) window.open(paper.paperPdfLink, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  if (notFound || !paper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Paper not found</h1>
        <Link to="/old-papers" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Old Papers</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md">
                {paper.year} &middot; {paper.categoryName}
              </span>
              {paper.isFeatured && (
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-heading font-extrabold leading-snug">{paper.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold">{paper.examName}</p>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Questions</span>
              <span className="font-extrabold text-white text-sm">{paper.totalQuestions ?? '—'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <Trophy className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Marks</span>
              <span className="font-extrabold text-white text-sm">{paper.totalMarks ?? '—'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <Clock className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration</span>
              <span className="font-extrabold text-white text-sm">{paper.duration ? `${paper.duration}m` : '—'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <Download className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Downloads</span>
              <span className="font-extrabold text-white text-sm">{paper.downloads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {paper.description && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-7 mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
              <h2 className="font-heading font-extrabold text-base text-slate-900">Overview</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{paper.description}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleDownload('paper')}
            disabled={downloading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download Question Paper</span>
          </button>
          {paper.solutionPdfLink && (
            <button
              onClick={() => handleDownload('solution')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /><span>Download Answer Key</span>
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
