import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, ExternalLink, BadgeCheck, Gift, ScrollText, FileText } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { SafeHtml } from '../components/SafeHtml';
import { DocumentPreview } from '../components/DocumentPreview';
import { useAuth } from '../context/AuthContext';
import { getGovtSchemeBySlug, ApiGovtScheme } from '../api/govtSchemes';

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-7">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">{title}</h2>
    </div>
    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</div>
  </div>
);

export default function SchemeDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scheme, setScheme] = useState<ApiGovtScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getGovtSchemeBySlug(slug)
      .then(setScheme)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !scheme) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Scheme not found</h1>
        <p className="text-sm text-slate-500">This scheme may have been removed or the link is incorrect.</p>
        <Link to="/schemes" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">All schemes</Link>
      </div>
    );
  }

  const plain = (s?: string | null) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const metaDescription =
    plain(scheme.description).slice(0, 300) ||
    `${scheme.title} by ${scheme.ministry}. Eligibility: ${plain(scheme.eligibility)}. Benefits: ${plain(scheme.benefits)}.`.slice(0, 300);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: scheme.title,
    serviceType: scheme.category,
    provider: { '@type': 'GovernmentOrganization', name: scheme.ministry },
    areaServed: { '@type': 'Country', name: 'India' },
    audience: { '@type': 'Audience', audienceType: plain(scheme.eligibility) },
    description: metaDescription,
    ...(scheme.applyLink ? { url: scheme.applyLink } : {}),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead
        title={`${scheme.title} — Eligibility & Benefits | JobCharcha`}
        description={metaDescription}
        path={`/schemes/${scheme.slug}`}
        jsonLd={jsonLd}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 relative mb-5">
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-blue-50 text-blue-700 border-blue-100">
              {scheme.category}
            </span>
            <h1 className="text-xl sm:text-3xl font-extrabold leading-snug text-slate-900">{scheme.title}</h1>
            <p className="text-[13px] sm:text-sm text-slate-500 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" /> {scheme.ministry}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {scheme.description && (
              <Section icon={ScrollText} title="About this scheme">
                <SafeHtml html={scheme.description} />
              </Section>
            )}
            <Section icon={BadgeCheck} title="Eligibility">
              <SafeHtml html={scheme.eligibility} />
            </Section>
            <Section icon={Gift} title="Key Benefits">
              <SafeHtml html={scheme.benefits} />
            </Section>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <a
                href={scheme.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Official Portal</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              {scheme.officialNotificationUrl && (
                <>
                  <a
                    href={scheme.officialNotificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white border border-slate-200 hover:border-blue-400 text-slate-800 font-bold text-sm px-6 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Official Notification</span>
                  </a>
                  <DocumentPreview url={scheme.officialNotificationUrl} variant="inline" />
                </>
              )}
              <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">Ministry</span><span className="font-bold text-slate-800 text-right">{scheme.ministry}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold">Category</span><span className="font-bold text-slate-800">{scheme.category}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
