import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ListChecks, Users, FileText, HelpCircle, CalendarDays, Tag, BookOpen, Share2, Target, PenLine } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getResultBySlug, ApiResultDetail } from '../api/results';
import { SafeHtml } from '../components/SafeHtml';
import { parseFaqSchema, parseVacancyBreakdown } from '../utils/jobDetailParsers';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';
import { AdUnit } from '../components/ads/AdUnit';
import { DetailHeader, DetailSection, DetailBody, DataGrid, FaqList, MobileCta, DetailLoading, DetailNotFound } from '../components/ui/detail';
import { Card, Pill, btn, cx } from '../components/ui/kit';
import { fmtDate } from '../utils/dates';

export default function ResultDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
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

  if (loading || notFound || !result) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        {loading ? <DetailLoading /> : <DetailNotFound title="Result not found" back={{ to: '/results', label: 'Browse all results' }} />}
        {!loading && <Footer />}
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

  const resultHref = result.resultPdf || result.resultLink;
  const share = () => {
    const url = `${window.location.origin}/results/${result.slug}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${result.title} — check here: ${url}`)}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
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

      <DetailHeader
        back={{ to: '/results', label: 'All results' }}
        org={result.organizationName}
        logo={result.organizationLogo}
        pills={<><Pill tone="blue">Official result</Pill>{result.isFeatured && <Pill tone="amber">Featured</Pill>}</>}
        title={result.title}
        subtitle={result.organizationName}
        facts={[
          { label: 'Declared on', value: fmtDate(result.resultDate), icon: CalendarDays },
          { label: 'Exam', value: result.examName || '—', icon: BookOpen },
          { label: 'Category', value: result.category, icon: Tag },
          ...(result.examDate ? [{ label: 'Exam date', value: fmtDate(result.examDate), icon: CalendarDays }] : []),
        ]}
        actions={<>
          {resultHref && <a href={resultHref} target="_blank" rel="noopener noreferrer" className={btn.primary}><Download className="w-4 h-4" /> Check result</a>}
          <button type="button" onClick={share} className={btn.secondary}><Share2 className="w-4 h-4" /> Share</button>
        </>}
      />

      <div className="flex-1">
        <DetailBody aside={
          <>
            <Card className="p-5">
              {resultHref ? (
                <>
                  <p className="text-[13px] text-slate-500">Official result</p>
                  <a href={resultHref} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'w-full py-3 mt-2')}>
                    <Download className="w-4 h-4" /> {result.resultPdf ? 'Download result PDF' : 'Open result page'}
                  </a>
                  <DocumentPreview url={resultHref} variant="inline" className="block mt-3" />
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">The result link hasn't been published yet — check back soon.</p>
              )}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[13px]">
                {result.state && <div className="flex justify-between"><span className="text-slate-500">State</span><b>{result.state}</b></div>}
                <div className="flex justify-between"><span className="text-slate-500">Views</span><b>{result.viewsCount.toLocaleString('en-IN')}</b></div>
              </div>
            </Card>
            <Card className="p-5">
              <p className="font-bold">What next?</p>
              <div className="mt-2 space-y-2">
                <Link to="/cutoff-predictor" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><Target className="w-4 h-4 text-violet-600" /> Compare with past cut-offs</Link>
                <Link to="/jobs" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><Users className="w-4 h-4 text-emerald-600" /> See jobs you can apply to now</Link>
                <Link to="/mock-tests" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><PenLine className="w-4 h-4 text-blue-600" /> Practise for the next exam</Link>
              </div>
            </Card>
            <AdUnit slot="7189688247" format="auto" style={{ minHeight: 250 }} />
          </>
        }>
          <DetailSection icon={FileText} title="Overview" html={result.description} />
          <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />
          <DetailSection icon={ListChecks} title="Cut-off marks" html={result.cutOffMarks} />
          {cutOffTable && (
            <DetailSection icon={ListChecks} title="Category-wise cut-off" flush>
              <DataGrid columns={cutOffTable.columns} rows={cutOffTable.rows.map((row) => cutOffTable.columns.map((c) => row[c]))} />
            </DetailSection>
          )}
          <DetailSection icon={Users} title="Selected candidates" html={result.selectedCandidates} />
          {faqEntries && <DetailSection icon={HelpCircle} title="Frequently asked questions"><FaqList items={faqEntries} /></DetailSection>}
        </DetailBody>
      </div>

      {resultHref && (
        <MobileCta>
          <button type="button" onClick={share} aria-label="Share" className="w-12 h-12 rounded-xl border border-slate-200 grid place-items-center shrink-0 text-slate-600 cursor-pointer"><Share2 className="w-5 h-5" /></button>
          <a href={resultHref} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'flex-1 h-12 text-[15px]')}><Download className="w-4 h-4" /> Check result</a>
        </MobileCta>
      )}
      <Footer />
    </div>
  );
}
