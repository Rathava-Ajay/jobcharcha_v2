import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CalendarDays, FileText, ListChecks, AlertTriangle, HelpCircle, Clock, CheckCircle2, Briefcase, Share2, PenLine } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { getAdmitCardBySlug, ApiAdmitCardDetail } from '../api/admitCards';
import { splitLines, looksLikeHtml, parseFaqSchema } from '../utils/jobDetailParsers';
import { SafeHtml } from '../components/SafeHtml';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';
import { AdUnit } from '../components/ads/AdUnit';
import { DetailHeader, DetailSection, DetailBody, FaqList, MobileCta, DetailLoading, DetailNotFound } from '../components/ui/detail';
import { Card, Pill, btn, cx } from '../components/ui/kit';
import { fmtDate, daysUntil } from '../utils/dates';

export default function AdmitCardDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
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

  if (loading || notFound || !card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        {loading ? <DetailLoading /> : <DetailNotFound title="Admit card not found" back={{ to: '/admit-cards', label: 'Browse all admit cards' }} />}
        {!loading && <Footer />}
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

  const released = card.status === 'Released';
  const examIn = daysUntil(card.examDate);
  const share = () => {
    const url = `${window.location.origin}/admit-cards/${card.slug}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${card.title} — download here: ${url}`)}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
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

      <DetailHeader
        back={{ to: '/admit-cards', label: 'All admit cards' }}
        org={card.organizationName}
        logo={card.organizationLogo}
        pills={<>
          {released ? <Pill tone="green" icon={CheckCircle2}>Released</Pill> : <Pill tone="amber" icon={Clock}>Coming soon</Pill>}
          {examIn !== null && examIn >= 0 && examIn <= 14 && <Pill tone="red">Exam in {examIn === 0 ? 'today' : `${examIn} day${examIn === 1 ? '' : 's'}`}</Pill>}
          {card.isFeatured && <Pill tone="amber">Featured</Pill>}
        </>}
        title={card.title}
        subtitle={card.shortDescription || card.organizationName}
        facts={[
          { label: 'Released on', value: fmtDate(card.releaseDate), icon: CalendarDays },
          { label: 'Exam date', value: card.examDate ? fmtDate(card.examDate) : 'To be announced', icon: CalendarDays, alert: examIn !== null && examIn >= 0 && examIn <= 7 },
          { label: 'Post', value: card.postName || card.examName || '—', icon: Briefcase },
        ]}
        actions={<>
          {card.downloadUrl && <a href={card.downloadUrl} target="_blank" rel="noopener noreferrer" className={btn.primary}><Download className="w-4 h-4" /> Download admit card</a>}
          <button type="button" onClick={share} className={btn.secondary}><Share2 className="w-4 h-4" /> Share</button>
        </>}
      />

      <div className="flex-1">
        <DetailBody aside={
          <>
            <Card className="p-5">
              {card.downloadUrl ? (
                <>
                  <p className="text-[13px] text-slate-500">Official download</p>
                  <a href={card.downloadUrl} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'w-full py-3 mt-2')}>
                    <Download className="w-4 h-4" /> Download admit card
                  </a>
                  <DocumentPreview url={card.downloadUrl} variant="inline" className="block mt-3" />
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">The download link isn't live yet. <Link to="/job-alerts" className="font-bold text-emerald-700">Get an alert</Link> when it is.</p>
              )}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><span className="text-slate-500">Category</span><b>{card.category}</b></div>
                {card.state && <div className="flex justify-between"><span className="text-slate-500">State</span><b>{card.state}</b></div>}
                <div className="flex justify-between"><span className="text-slate-500">Views</span><b>{card.viewsCount.toLocaleString('en-IN')}</b></div>
              </div>
            </Card>
            <Card className="p-5">
              <p className="font-bold flex items-center gap-2"><PenLine className="w-4 h-4 text-emerald-700" /> Last-minute practice</p>
              <p className="text-[13px] text-slate-500 mt-1">Take a full mock test in the real exam pattern before the exam.</p>
              <Link to="/mock-tests" className={cx(btn.secondary, btn.small, 'mt-3')}>Start a mock test</Link>
            </Card>
            <AdUnit slot="7213818525" format="auto" style={{ minHeight: 250 }} />
          </>
        }>
          <DetailSection icon={FileText} title="Overview" html={card.description} />
          <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />
          <DetailSection icon={Download} title="How to download" html={card.howToDownload} />
          <DetailSection icon={ListChecks} title="Exam-day instructions" html={card.instructions} />
          {notes.length > 0 && (
            <DetailSection icon={AlertTriangle} title="Important notes" tone="warning">
              {looksLikeHtml(card.importantNotes)
                ? <SafeHtml html={card.importantNotes!} />
                : <ul className="list-disc pl-5 space-y-1">{notes.map((l, i) => <li key={i}>{l.replace(/^[^\w]+/u, '')}</li>)}</ul>}
            </DetailSection>
          )}
          {faqEntries && <DetailSection icon={HelpCircle} title="Frequently asked questions"><FaqList items={faqEntries} /></DetailSection>}
        </DetailBody>
      </div>

      {card.downloadUrl && (
        <MobileCta>
          <button type="button" onClick={share} aria-label="Share" className="w-12 h-12 rounded-xl border border-slate-200 grid place-items-center shrink-0 text-slate-600 cursor-pointer"><Share2 className="w-5 h-5" /></button>
          <a href={card.downloadUrl} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'flex-1 h-12 text-[15px]')}><Download className="w-4 h-4" /> Download admit card</a>
        </MobileCta>
      )}
      <Footer />
    </div>
  );
}
