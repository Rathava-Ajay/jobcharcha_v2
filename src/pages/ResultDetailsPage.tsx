import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Download, Loader2, ListChecks, Users, FileText, Sparkles, HelpCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getResultBySlug, ApiResultDetail } from '../api/results';
import { SafeHtml } from '../components/SafeHtml';
import { parseFaqSchema, parseVacancyBreakdown } from '../utils/jobDetailParsers';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';
import { AdUnit } from '../components/ads/AdUnit';

const Section: React.FC<{ icon: React.ElementType; title: string; html: string }> = ({ icon: Icon, title, html }) => (
  <div className="bg-white shadow-sm rounded-3xl border border-slate-200 p-6 sm:p-7">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">{title}</h2>
    </div>
    <SafeHtml html={html} className="text-xs sm:text-sm text-slate-600 leading-relaxed" />
  </div>
);

export default function ResultDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<ApiResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getResultBySlug(slug)
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  if (notFound || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Result not found</h1>
        <Link to="/results" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Results</Link>
      </div>
    );
  }

  const faqEntries = parseFaqSchema(result.faqSchemaJson);
  const cutOffTable = parseVacancyBreakdown(result.cutOffBreakdownJson);

  const jsonLdBlocks: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: result.title,
    description: result.description || result.cutOffMarks,
    datePublished: result.resultDate,
    publisher: { '@type': 'Organization', name: result.organizationName },
  }];
  if (faqEntries) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntries.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SeoHead
        title={result.metaTitle || `${result.title} - Result | JobCharcha`}
        description={result.metaDescription || result.description || result.cutOffMarks}
        keywords={result.metaKeywords}
        ogTitle={result.ogTitle}
        ogDescription={result.ogDescription}
        ogImage={result.organizationLogo}
        path={`/results/${result.slug}`}
        jsonLd={jsonLdBlocks}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="bg-slate-900 shadow-lg text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                Official Result
              </span>
              {result.isFeatured && (
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-heading font-extrabold leading-snug">{result.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" /> {result.organizationName}
            </p>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Published</span>
              <span className="font-extrabold text-white text-sm">{result.resultDate}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
              <span className="font-extrabold text-white text-sm">{result.category}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Exam</span>
              <span className="font-extrabold text-white text-sm truncate block">{result.examName || '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {result.description && <Section icon={FileText} title="Overview" html={result.description} />}

            <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />

            {result.cutOffMarks && <Section icon={ListChecks} title="Cut-off Marks" html={result.cutOffMarks} />}

            {cutOffTable && (
              <div className="bg-white shadow-sm rounded-3xl border border-slate-200 p-6 sm:p-7">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">Category-wise Cut-off</h2>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs border-collapse min-w-[420px]">
                    <thead>
                      <tr className="bg-slate-50">
                        {cutOffTable.columns.map((col) => (
                          <th key={col} className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cutOffTable.rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          {cutOffTable.columns.map((col) => (
                            <td key={col} className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{row[col] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.selectedCandidates && <Section icon={Users} title="Selected Candidates" html={result.selectedCandidates} />}

            {faqEntries && (
              <div className="bg-white shadow-sm rounded-3xl border border-slate-200 p-6 sm:p-7">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-3">
                  {faqEntries.map((f, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1 text-xs sm:text-sm">{f.question}</div>
                      <div className="font-medium text-slate-600 text-xs sm:text-sm">{f.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              {(result.resultPdf || result.resultLink) ? (
                <>
                  <a
                    href={result.resultPdf || result.resultLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /><span>Download Result PDF</span>
                  </a>
                  <DocumentPreview url={result.resultPdf || result.resultLink} variant="inline" />
                </>
              ) : (
                <div className="text-center text-xs font-semibold text-slate-400 py-3">Result PDF not published yet</div>
              )}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {result.state && <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">State</span><span className="font-bold text-slate-800">{result.state}</span></div>}
                <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">Views</span><span className="font-bold text-slate-800">{result.viewsCount.toLocaleString()}</span></div>
              </div>

              <AdUnit slot="7189688247" format="auto" style={{ minHeight: 600 }} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
