import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Download, Loader2, CalendarDays, FileText, ListChecks, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getAdmitCardBySlug, ApiAdmitCardDetail } from '../api/admitCards';
import { splitLines, looksLikeHtml, parseFaqSchema } from '../utils/jobDetailParsers';
import { SafeHtml } from '../components/SafeHtml';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';
import { AdUnit } from '../components/ads/AdUnit';

const Section: React.FC<{ icon: React.ElementType; title: string; html?: string; children?: React.ReactNode }> = ({ icon: Icon, title, html, children }) => (
  <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-3xl border border-slate-200 p-6 sm:p-7">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">{title}</h2>
    </div>
    {html !== undefined ? (
      <SafeHtml html={html} className="text-xs sm:text-sm text-slate-600 leading-relaxed" />
    ) : (
      <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</div>
    )}
  </div>
);

export default function AdmitCardDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [card, setCard] = useState<ApiAdmitCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getAdmitCardBySlug(slug)
      .then(setCard)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;
  }

  if (notFound || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Admit card not found</h1>
        <Link to="/admit-cards" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Admit Cards</Link>
      </div>
    );
  }

  const notes = splitLines(card.importantNotes);
  const faqEntries = parseFaqSchema(card.faqSchemaJson);

  const jsonLdBlocks: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: card.title,
    description: card.shortDescription || card.description,
    datePublished: card.releaseDate,
    publisher: { '@type': 'Organization', name: card.organizationName },
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
        title={card.metaTitle || `${card.title} - Admit Card | JobCharcha`}
        description={card.metaDescription || card.shortDescription || card.description}
        keywords={card.metaKeywords}
        ogTitle={card.ogTitle}
        ogDescription={card.ogDescription}
        ogImage={card.organizationLogo}
        path={`/admit-cards/${card.slug}`}
        jsonLd={jsonLdBlocks}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="bg-slate-900 shadow-lg text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                card.status === 'Released' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {card.status}
              </span>
              {card.isFeatured && (
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-heading font-extrabold leading-snug">{card.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" /> {card.organizationName}
            </p>
            {card.shortDescription && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl pt-1">{card.shortDescription}</p>
            )}
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Release Date</span>
              <span className="font-extrabold text-white text-sm">{card.releaseDate}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Exam Date</span>
              <span className="font-extrabold text-white text-sm">{card.examDate || 'To be announced'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
              <FileText className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Post</span>
              <span className="font-extrabold text-white text-sm truncate block">{card.postName || card.examName || '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {card.description && <Section icon={FileText} title="Overview" html={card.description} />}

            <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />

            {card.instructions && <Section icon={ListChecks} title="Instructions" html={card.instructions} />}
            {card.howToDownload && <Section icon={Download} title="How to Download" html={card.howToDownload} />}

            {notes.length > 0 && (
              <Section icon={AlertTriangle} title="Important Notes">
                {looksLikeHtml(card.importantNotes) ? (
                  <SafeHtml html={card.importantNotes!} className="font-semibold text-slate-700" />
                ) : (
                  <ul className="space-y-2">
                    {notes.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-semibold text-slate-700">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{line.replace(/^[^\w]+/u, '')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {faqEntries && (
              <Section icon={HelpCircle} title="Frequently Asked Questions">
                <div className="space-y-3">
                  {faqEntries.map((f, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">{f.question}</div>
                      <div className="font-medium text-slate-600">{f.answer}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              {card.downloadUrl ? (
                <>
                  <a
                    href={card.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /><span>Download Admit Card</span>
                  </a>
                  <DocumentPreview url={card.downloadUrl} variant="inline" />
                </>
              ) : (
                <div className="text-center text-xs font-semibold text-slate-400 py-3">Download link not published yet</div>
              )}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">Category</span><span className="font-bold text-slate-800">{card.category}</span></div>
                {card.state && <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">State</span><span className="font-bold text-slate-800">{card.state}</span></div>}
                <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">Views</span><span className="font-bold text-slate-800">{card.viewsCount.toLocaleString()}</span></div>
              </div>

              <AdUnit slot="7213818525" format="auto" style={{ minHeight: 250 }} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
