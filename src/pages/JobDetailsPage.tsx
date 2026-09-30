import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Download, ExternalLink, Bookmark, CheckCircle2, MapPin, Wallet, Users, CalendarDays,
  MessageCircle, Send, Facebook, Sparkles, ArrowLeft, Loader2, FileText, GraduationCap, ClipboardList,
  ListChecks, Zap, IndianRupee, Globe, AlertTriangle, Link2, Cake, Briefcase, Hash, HelpCircle, ScrollText,
  FileCheck,
} from 'lucide-react';
import { Job } from '../types';
import { getJobBySlug } from '../api/jobs';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import {
  parseVacancyBreakdown, parseCategoryWiseVacancy, parseSelectionSteps, parseFeeTable, splitLines, looksLikeHtml,
  parseFaqSchema, parseExamPattern, parseSalaryBreakdown,
} from '../utils/jobDetailParsers';
import { SafeHtml } from '../components/SafeHtml';
import { SeoHead } from '../components/SeoHead';
import { DocumentPreview } from '../components/DocumentPreview';
import { AdUnit } from '../components/ads/AdUnit';

const ACCENT_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
};

const ACCENT_TINTS: Record<string, string> = {
  emerald: 'bg-white shadow-sm',
  amber: 'bg-white shadow-sm',
  red: 'bg-white shadow-sm',
};

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; accent?: 'emerald' | 'amber' | 'red' }> = ({ icon: Icon, title, children, accent = 'emerald' }) => (
  <div className={`${ACCENT_TINTS[accent]} rounded-3xl border border-slate-200 p-6 sm:p-7`}>
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ACCENT_CLASSES[accent]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">{title}</h2>
    </div>
    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</div>
  </div>
);

const fmtMoney = (v?: number) => v === undefined ? undefined : `₹${v.toLocaleString('en-IN')}`;

export default function JobDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<(Job & { similarJobs: Job[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getJobBySlug(slug)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'facebook') => {
    if (!job) return;
    const url = `${window.location.origin}/jobs/${job.slug}`;
    const text = `Check out this job opening: ${job.title} at ${job.companyOrDept} (${job.vacancyCount} Posts)! Apply here: ${url}`;
    if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    else window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Job not found</h1>
        <p className="text-sm text-slate-500">This vacancy may have been removed or the link is incorrect.</p>
        <Link to="/" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Jobs</Link>
      </div>
    );
  }

  const importantDates = job.importantDates && job.importantDates.length > 0
    ? job.importantDates
    : [{ label: 'Notification Release', date: job.postedDate }, { label: 'Application Last Date', date: job.lastDate }];

  const highlightLines = splitLines(job.keyHighlights);
  const noteLines = splitLines(job.importantNotes);
  const vacancyTable = parseVacancyBreakdown(job.vacancyBreakdownJson);
  const categoryWise = parseCategoryWiseVacancy(job.categoryWiseVacancyJson);
  const selectionSteps = parseSelectionSteps(job.selectionProcessJson);
  const feeTable = parseFeeTable(job.applicationFeeJson);
  const faqEntries = parseFaqSchema(job.faqSchemaJson);
  const examPatternRows = parseExamPattern(job.examPatternJson);
  const salaryBreakdown = parseSalaryBreakdown(job.salaryBreakdownJson);

  const hasAgeInfo = job.minAge !== undefined || job.maxAge !== undefined;
  const hasSalaryRange = job.minSalary !== undefined || job.maxSalary !== undefined;

  const links: { label: string; href: string; icon: React.ElementType }[] = [];
  if (job.officialWebsite) links.push({ label: 'Official Website', href: job.officialWebsite, icon: Globe });
  if (job.officialNotificationUrl) links.push({ label: 'Official Notification PDF', href: job.officialNotificationUrl, icon: Download });
  if (job.syllabusLink) links.push({ label: 'Syllabus / Exam Pattern', href: job.syllabusLink, icon: FileText });
  if (job.applyUrl) links.push({ label: 'Apply Online Portal', href: job.applyUrl, icon: ExternalLink });
  if (job.telegramLink) links.push({ label: 'Join Telegram Channel', href: job.telegramLink, icon: Send });
  if (job.whatsAppLink) links.push({ label: 'Join WhatsApp Group', href: job.whatsAppLink, icon: MessageCircle });

  // Google Jobs wants an ISO-8601 validThrough; job.lastDate is a bare yyyy-MM-dd from the API.
  const validThrough = /^\d{4}-\d{2}-\d{2}$/.test(job.lastDate) ? `${job.lastDate}T23:59:59+05:30` : job.lastDate;

  // JobPosting.description accepts HTML and should be a *complete* representation of the job. Use
  // the overview when it has real substance; otherwise compose one from the structured fields so
  // Google never sees a one-line description.
  const overviewText = (job.overview || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const jobPostingDescription = overviewText.length >= 120
    ? job.overview!
    : [
        overviewText || null,
        job.eligibility ? `Eligibility: ${job.eligibility.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}` : null,
        job.qualification ? `Qualification: ${job.qualification}` : null,
        job.vacancyCount ? `Total vacancies: ${job.vacancyCount}` : null,
        job.location ? `Location: ${job.location}` : null,
        job.salary ? `Salary: ${job.salary}` : null,
        job.applicationFee !== undefined ? `Application fee: ₹${job.applicationFee}` : null,
        `Apply on or before ${job.lastDate}.`,
      ].filter(Boolean).join(' ');

  const jsonLdBlocks: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: jobPostingDescription,
    identifier: {
      '@type': 'PropertyValue',
      name: job.companyOrDept,
      value: job.advertisementNumber || job.slug || String(job.id),
    },
    datePosted: job.postedDate,
    validThrough,
    employmentType: job.type === 'public' ? 'FULL_TIME' : 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyOrDept,
      ...(job.organizationLogo ? { logo: job.organizationLogo } : {}),
      ...(job.officialWebsite ? { sameAs: job.officialWebsite } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        ...((job.state || job.district) ? { addressRegion: job.state || job.district } : {}),
        addressCountry: 'IN',
      },
    },
    ...(hasSalaryRange ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: { '@type': 'QuantitativeValue', minValue: job.minSalary, maxValue: job.maxSalary, unitText: 'MONTH' },
      },
    } : {}),
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
        title={job.metaTitle || `${job.title} - ${job.vacancyCount} Vacancies | JobCharcha`}
        description={job.metaDescription || job.overview || job.qualification}
        keywords={job.metaKeywords}
        ogTitle={job.ogTitle}
        ogDescription={job.ogDescription}
        ogImage={job.organizationLogo}
        path={`/jobs/${job.slug}`}
        jsonLd={jsonLdBlocks}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Header Card */}
        <div className="bg-slate-900 shadow-lg text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                  job.type === 'public'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}>
                  {job.type === 'public' ? 'Government Recruitment' : 'Private Sector Job'}
                </span>
                {job.isFeatured && (
                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
                {job.isUrgent && (
                  <span className="bg-red-500/15 text-red-300 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded">Urgent Hiring</span>
                )}
                {job.advertisementNumber && (
                  <span className="bg-white/10 text-slate-300 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {job.advertisementNumber}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-3xl font-heading font-extrabold leading-snug">{job.title}</h1>
              <p className="text-xs sm:text-sm text-slate-300 font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" /> {job.companyOrDept}
              </p>
            </div>

            <button
              onClick={() => setIsBookmarked((b) => !b)}
              className={`p-2.5 rounded-2xl border cursor-pointer transition-colors shrink-0 hover:-translate-y-0.5 ${
                isBookmarked ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Bookmark Job"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </button>
          </div>

          {/* Quick Info Strip */}
          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Total Vacancies', value: `${job.vacancyCount.toLocaleString()} Posts` },
              { icon: Wallet, label: 'Salary Scale', value: job.salary },
              { icon: MapPin, label: 'Location', value: job.location },
              { icon: CalendarDays, label: 'Last Date', value: job.lastDate },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
                <item.icon className="w-3.5 h-3.5 text-emerald-400 mb-1.5" />
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{item.label}</span>
                <span className="font-extrabold text-white text-xs sm:text-sm break-words">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main two-column layout: everything visible at once, no tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Key Highlights — quick-scan summary, mirrors govtjobsalert.in style */}
            {highlightLines.length > 0 && (
              <Section icon={Zap} title="Key Highlights" accent="amber">
                {looksLikeHtml(job.keyHighlights) ? (
                  <SafeHtml html={job.keyHighlights!} className="font-semibold text-slate-700" />
                ) : (
                  <ul className="space-y-2">
                    {highlightLines.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-semibold text-slate-700">
                        <span className="text-emerald-600 mt-0.5">•</span>
                        <span>{line.replace(/^[^\w₹]+/u, '')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            <Section icon={FileText} title="Job Summary & Department Brief">
              <SafeHtml html={job.overview || `${job.companyOrDept} has officially released recruitment notification for ${job.vacancyCount} vacancies of ${job.title}. Candidates holding ${job.qualification} can apply before ${job.lastDate}.`} />
              {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3">
                  {job.tags.map((t, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold">#{t}</span>
                  ))}
                </div>
              )}
            </Section>

            <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />

            {/* Vacancy Breakdown — dynamic table straight from CMS JSON */}
            {vacancyTable && (
              <Section icon={ListChecks} title="Vacancy Breakdown (Category-wise)">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs border-collapse min-w-[420px]">
                    <thead>
                      <tr className="bg-slate-50">
                        {vacancyTable.columns.map((col) => (
                          <th key={col} className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vacancyTable.rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          {vacancyTable.columns.map((col) => (
                            <td key={col} className={`px-3 py-2 whitespace-nowrap ${col === 'Total' ? 'font-extrabold text-emerald-700' : 'font-semibold text-slate-700'}`}>
                              {row[col] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {!vacancyTable && categoryWise && (
              <Section icon={ListChecks} title="Category-wise Vacancy Summary">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoryWise.map((c) => (
                    <div key={c.label} className={`p-3 rounded-xl border text-center ${c.label === 'Total' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">{c.label}</span>
                      <span className={`text-base font-black ${c.label === 'Total' ? 'text-emerald-700' : 'text-slate-800'}`}>{c.value}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section icon={GraduationCap} title="Educational Qualification & Eligibility">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 mb-4">
                <SafeHtml html={job.eligibility || job.qualification} />
              </div>

              {(hasAgeInfo || job.experienceRequired !== undefined) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {hasAgeInfo && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <Cake className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Age Limit</span>
                      <span className="font-bold text-slate-800">
                        {job.minAge ?? '—'} – {job.maxAge ?? '—'} yrs
                      </span>
                    </div>
                  )}
                  {job.experienceRequired !== undefined && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Experience</span>
                      <span className="font-bold text-slate-800">{job.experienceRequired}+ yrs</span>
                    </div>
                  )}
                </div>
              )}

              <ul className="space-y-1.5 font-medium">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Verify age relaxation for reserved categories in the official notification.
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> Must possess valid certificates at time of document verification.
                </li>
              </ul>
            </Section>

            {(hasSalaryRange || job.salary) && (
              <Section icon={IndianRupee} title="Salary & Pay Scale">
                {hasSalaryRange && (
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Pay Range</span>
                      <span className="font-black text-emerald-800 text-base">{fmtMoney(job.minSalary)} – {fmtMoney(job.maxSalary)}</span>
                      {job.salaryType && <span className="text-[10px] text-emerald-700 font-semibold"> / {job.salaryType}</span>}
                    </div>
                  </div>
                )}
                <p className="font-medium">{job.salary}</p>
                {salaryBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    {[
                      { label: 'Basic Pay', value: salaryBreakdown.basicPay },
                      { label: 'DA', value: salaryBreakdown.da },
                      { label: 'HRA', value: salaryBreakdown.hra },
                      { label: 'Gross Salary', value: salaryBreakdown.grossSalary },
                      { label: 'Net Salary', value: salaryBreakdown.netSalary },
                    ].filter((r) => r.value).map((r) => (
                      <div key={r.label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{r.label}</span>
                        <span className="font-bold text-slate-800">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section icon={ListChecks} title="Selection Process">
              {selectionSteps ? (
                <ol className="space-y-2">
                  {selectionSteps.map((step, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">{idx + 1}</span>
                      <span className="font-semibold text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : job.selectionProcess ? (
                <SafeHtml html={job.selectionProcess} className="font-medium" />
              ) : (
                <ul className="space-y-1.5 font-medium">
                  <li>• Phase 1: Computer Based Test (CBT Objective)</li>
                  <li>• Phase 2: Skill Test / Interview (If applicable)</li>
                  <li>• Phase 3: Document Verification & Medical Exam</li>
                </ul>
              )}
            </Section>

            {examPatternRows && (
              <Section icon={ScrollText} title="Exam Pattern">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs border-collapse min-w-[420px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Paper</th>
                        <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Subject</th>
                        <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Questions</th>
                        <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Marks</th>
                        <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examPatternRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{row.paper}</td>
                          <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{row.subject ?? '—'}</td>
                          <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{row.questions ?? '—'}</td>
                          <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{row.marks ?? '—'}</td>
                          <td className="px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{row.duration ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {(feeTable || job.applicationFee !== undefined || job.applicationFeeDetails) && (
              <Section icon={IndianRupee} title="Application Fee">
                {feeTable ? (
                  <div className="overflow-x-auto -mx-1 mb-3">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Category</th>
                          <th className="text-left font-bold text-slate-500 uppercase text-[10px] px-3 py-2 border-b border-slate-200">Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeTable.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 font-semibold text-slate-700">{row.category}</td>
                            <td className="px-3 py-2 font-extrabold text-emerald-700">{row.fee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : job.applicationFee !== undefined ? (
                  <p className="font-bold text-slate-800 mb-2">{fmtMoney(job.applicationFee)}/-</p>
                ) : null}
                {job.applicationFeeDetails && <p className="font-medium text-slate-600">{job.applicationFeeDetails}</p>}
              </Section>
            )}

            <Section icon={ClipboardList} title="Application Procedure">
              {job.howToApply ? (
                <SafeHtml html={job.howToApply} className="font-medium" />
              ) : (
                <ol className="list-decimal list-inside space-y-1.5 font-medium">
                  <li>Visit the official portal link provided below.</li>
                  <li>Register your mobile number and upload your resume.</li>
                  <li>Fill in educational records and pay the application fee online.</li>
                  <li>Submit the final confirmation page and save your registration ID.</li>
                </ol>
              )}
            </Section>

            {job.documentsRequired && (
              <Section icon={FileCheck} title="Required Documents">
                <SafeHtml html={job.documentsRequired} className="font-medium" />
              </Section>
            )}

            <Section icon={CalendarDays} title="Key Exam & Application Dates">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {importantDates.map((d, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{d.label}</span>
                    <span className="font-bold text-slate-800">{d.date}</span>
                  </div>
                ))}
              </div>
            </Section>

            {noteLines.length > 0 && (
              <Section icon={AlertTriangle} title="Important Notes" accent="red">
                {looksLikeHtml(job.importantNotes) ? (
                  <SafeHtml html={job.importantNotes!} className="font-semibold text-slate-700" />
                ) : (
                  <ul className="space-y-2">
                    {noteLines.map((line, idx) => (
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

            {links.length > 0 && (
              <Section icon={Link2} title="Essential Links">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {links.map((l, idx) => (
                    <a
                      key={idx}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:-translate-y-0.5 transition-all font-bold text-slate-700 hover:text-emerald-700"
                    >
                      <l.icon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{l.label}</span>
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Sticky Sidebar: Apply + Share */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <a
                  href={job.applyUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Apply Online</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                {job.officialNotificationUrl && (
                  <>
                    <a
                      href={job.officialNotificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" /> Official PDF Notice
                    </a>
                    <DocumentPreview url={job.officialNotificationUrl} variant="inline" className="-mt-1" />
                  </>
                )}

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Qualification</span><span className="font-bold text-slate-800 text-right">{job.qualification}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Category</span><span className="font-bold text-slate-800">{job.category}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Posted</span><span className="font-bold text-slate-800">{job.postedDate}</span></div>
                  {job.applicationFee !== undefined && (
                    <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Fee</span><span className="font-bold text-slate-800">{fmtMoney(job.applicationFee)}/-</span></div>
                  )}
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Views</span><span className="font-bold text-slate-800">{(job.viewsCount ?? 0).toLocaleString()}</span></div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-2">Share this job</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleShare('whatsapp')} className="flex-1 p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl cursor-pointer flex items-center justify-center hover:-translate-y-0.5 transition-transform" title="Share on WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleShare('telegram')} className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl cursor-pointer flex items-center justify-center hover:-translate-y-0.5 transition-transform" title="Share on Telegram">
                      <Send className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleShare('facebook')} className="flex-1 p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl cursor-pointer flex items-center justify-center hover:-translate-y-0.5 transition-transform" title="Share on Facebook">
                      <Facebook className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <AdUnit slot="7213818525" format="auto" style={{ minHeight: 250 }} />
            </div>
          </div>
        </div>

        {/* Similar Jobs */}
        {job.similarJobs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-heading font-extrabold text-slate-900 mb-4">Similar Jobs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {job.similarJobs.map((sj) => (
                <button
                  key={sj.id}
                  onClick={() => navigate(`/jobs/${sj.slug}`)}
                  className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-emerald-300 cursor-pointer"
                >
                  <p className="text-xs font-extrabold text-slate-900 line-clamp-2">{sj.title}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">{sj.companyOrDept}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-emerald-700 font-bold">{sj.salary}</span>
                    <span className="text-slate-400">Last Date: {sj.lastDate}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
