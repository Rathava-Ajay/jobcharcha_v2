import React from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Bookmark, MessageCircle, Send, Facebook, Sparkles, Hash } from 'lucide-react';
import { SafeHtml } from '../SafeHtml';
import { DocumentPreview } from '../DocumentPreview';
import { AdUnit } from '../ads/AdUnit';
import { looksLikeHtml } from '../../utils/jobDetailParsers';
import {
  PortalBox, KeyValueTable, DataTable, PortalList, LinksTable, KeyValueRow,
  StatsStrip, StatTile, SectionNav, MobileActionBar, fmtPortalDate, deadlineNote,
} from './PortalBlocks';
import { JobViewProps, fmtMoney, isLastDateLabel } from './jobViewModel';

/** The classic govt-portal layout (Sarkari-style bordered boxes and tables). */
export const ClassicJobView: React.FC<JobViewProps> = ({ job, vm, saved, onToggleSave, onShare }) => {
  const {
    importantDates, highlightLines, noteLines, vacancyTable, categoryWise, selectionSteps, feeTable, faqEntries,
    examPatternRows, hasSalaryRange, links, ageText, feeText, feeHeadline, hasFee, hasAgeBox, hasSalaryBox, salaryRows,
  } = vm;
  const overviewRows: KeyValueRow[] = [
    { label: 'Organization', value: job.companyOrDept },
    { label: 'Post Name', value: job.title },
    ...(job.advertisementNumber ? [{ label: 'Advt. No.', value: job.advertisementNumber }] : []),
    { label: 'Total Vacancies', value: `${job.vacancyCount.toLocaleString('en-IN')} Posts` },
    { label: 'Qualification', value: job.qualification },
    ...(job.salary ? [{ label: 'Salary', value: job.salary }] : []),
    { label: 'Job Location', value: job.location },
    { label: 'Category', value: job.category },
    { label: 'Mode of Apply', value: job.applyUrl ? 'Online' : 'As per notification' },
    { label: 'Last Date to Apply', value: fmtPortalDate(job.lastDate), highlight: true },
  ];

  const deadline = deadlineNote(job.lastDate);
  const stats: StatTile[] = [
    { label: 'Total Posts', value: job.vacancyCount > 0 ? job.vacancyCount.toLocaleString('en-IN') : '—' },
    ageText
      ? { label: 'Age Limit', value: ageText }
      : { label: 'Qualification', value: <span className="text-sm sm:text-base">{job.qualification}</span> },
    hasSalaryRange
      ? { label: 'Salary', value: <span className="text-sm sm:text-lg">{fmtMoney(job.minSalary ?? job.maxSalary)}{job.maxSalary && job.minSalary ? '+' : ''}</span>, note: job.salaryType ? `per ${job.salaryType.toLowerCase()}` : undefined, tone: 'muted' }
      : feeHeadline
        ? { label: 'Application Fee', value: <span className="text-sm sm:text-lg">{feeHeadline}</span>, note: feeTable && feeTable.length > 1 ? feeTable[0].category : undefined, tone: 'muted' }
        : { label: 'Location', value: <span className="text-sm sm:text-lg">{job.location}</span> },
    { label: 'Last Date', value: <span className="text-sm sm:text-lg">{fmtPortalDate(job.lastDate)}</span>, note: deadline?.note, tone: deadline?.tone },
  ];


  const navItems = [
    { id: 'dates', label: 'Dates' },
    ...(hasFee ? [{ id: 'fee', label: 'Fee' }] : []),
    ...(hasAgeBox ? [{ id: 'age', label: 'Age Limit' }] : []),
    { id: 'vacancy', label: 'Vacancy' },
    { id: 'eligibility', label: 'Eligibility' },
    ...(hasSalaryBox ? [{ id: 'salary', label: 'Salary' }] : []),
    { id: 'selection', label: 'Selection' },
    { id: 'apply', label: 'How to Apply' },
    ...(links.length > 0 ? [{ id: 'links', label: 'Links' }] : []),
    ...(faqEntries ? [{ id: 'faq', label: 'FAQ' }] : []),
  ];

  return (
    <div className={job.applyUrl || job.officialNotificationUrl ? 'pb-16 sm:pb-0' : ''}>
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-3 sm:space-y-4">
          {/* Title block */}
          <header className="bg-white border sm:border-2 border-emerald-700/40 border-t-4 sm:border-t-4 border-t-emerald-700 text-center px-3 py-4 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-emerald-700 text-white">
                {job.type === 'public' ? 'Government Recruitment' : 'Private Sector Job'}
              </span>
              {job.isFeatured && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
              {job.isUrgent && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white">Urgent</span>
              )}
            </div>
            <p className="font-heading font-extrabold uppercase text-emerald-800 text-sm sm:text-base">{job.companyOrDept}</p>
            <h1 className="font-heading font-extrabold text-red-700 text-xl sm:text-3xl leading-snug mt-1">{job.title}</h1>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {job.advertisementNumber && (
                <span className="inline-flex items-center gap-0.5"><Hash className="w-3 h-3" />Advt. No: {job.advertisementNumber}</span>
              )}
              <span>Post Date: <b className="text-slate-800">{fmtPortalDate(job.postedDate)}</b></span>
              <span>Last Date: <b className="text-red-700">{fmtPortalDate(job.lastDate)}</b></span>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {job.applyUrl && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold px-4 py-2"
                >
                  Apply Online <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {job.officialNotificationUrl && (
                <a
                  href={job.officialNotificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 text-xs sm:text-sm font-extrabold px-4 py-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Notification PDF
                </a>
              )}
              <button
                onClick={onToggleSave}
                className={`inline-flex items-center gap-1.5 border-2 text-xs sm:text-sm font-extrabold px-3 py-1.5 cursor-pointer ${
                  saved ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title="Bookmark Job"
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-400' : ''}`} /> {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </header>

          <StatsStrip stats={stats} />
          <SectionNav items={navItems} />

          {/* Short information */}
          <PortalBox title="Short Information">
            <SafeHtml html={job.overview || `${job.companyOrDept} has officially released recruitment notification for ${job.vacancyCount} vacancies of ${job.title}. Candidates holding ${job.qualification} can apply before ${job.lastDate}.`} />
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3">
                {job.tags.map((t, idx) => (
                  <span key={idx} className="bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 text-[11px] font-bold">#{t}</span>
                ))}
              </div>
            )}
          </PortalBox>

          <PortalBox title="Recruitment Overview" flush>
            <KeyValueTable rows={overviewRows} />
          </PortalBox>

          {highlightLines.length > 0 && (
            <PortalBox title="Key Highlights">
              {looksLikeHtml(job.keyHighlights) ? (
                <SafeHtml html={job.keyHighlights!} className="font-semibold" />
              ) : (
                <PortalList items={highlightLines.map((l) => l.replace(/^[^\w₹]+/u, ''))} />
              )}
            </PortalBox>
          )}

          <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />

          {/* Dates | Fee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PortalBox id="dates" title="Important Dates" className={hasFee ? '' : 'md:col-span-2'}>
              <PortalList
                items={importantDates.map((d) => <>{d.label}: <b>{fmtPortalDate(d.date)}</b></>)}
                highlightIndex={(i) => isLastDateLabel(importantDates[i].label)}
              />
            </PortalBox>
            {hasFee && (
              <PortalBox id="fee" title="Application Fee">
                {feeTable ? (
                  <PortalList items={feeTable.map((r) => <>{r.category}: <b className="text-emerald-800">{r.fee}</b></>)} />
                ) : job.applicationFee !== undefined ? (
                  <PortalList items={[<>Application Fee: <b className="text-emerald-800">{feeText}</b></>]} />
                ) : null}
                {job.applicationFeeDetails && <p className="mt-3 font-medium text-slate-600">{job.applicationFeeDetails}</p>}
              </PortalBox>
            )}
          </div>

          {/* Age | Salary */}
          {(hasAgeBox || hasSalaryBox) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasAgeBox && (
                <PortalBox id="age" title="Age Limit" className={hasSalaryBox ? '' : 'md:col-span-2'}>
                  <PortalList
                    items={[
                      job.minAge !== undefined && <>Minimum Age: <b>{job.minAge} Years</b></>,
                      job.maxAge !== undefined && <>Maximum Age: <b>{job.maxAge} Years</b></>,
                      job.experienceRequired !== undefined && (job.experienceRequired > 0
                        ? <>Experience: <b>{job.experienceRequired}+ Years</b></>
                        : <>Experience: <b>Not required (freshers can apply)</b></>),
                      'Age relaxation for reserved categories as per the official notification.',
                    ].filter(Boolean) as React.ReactNode[]}
                  />
                </PortalBox>
              )}
              {hasSalaryBox && (
                <PortalBox id="salary" title="Salary / Pay Scale" className={hasAgeBox ? '' : 'md:col-span-2'}>
                  {hasSalaryRange && (
                    <p className="font-extrabold text-emerald-800 text-base">
                      {fmtMoney(job.minSalary)} – {fmtMoney(job.maxSalary)}
                      {job.salaryType && <span className="text-xs font-semibold text-slate-600"> / {job.salaryType}</span>}
                    </p>
                  )}
                  {job.salary && <p className="font-semibold mt-1">{job.salary}</p>}
                  {salaryRows.length > 0 && <div className="mt-3"><KeyValueTable rows={salaryRows} /></div>}
                </PortalBox>
              )}
            </div>
          )}

          {/* Vacancy details */}
          <PortalBox id="vacancy" title={`Vacancy Details — Total: ${job.vacancyCount.toLocaleString('en-IN')} Posts`} flush={!!vacancyTable}>
            {vacancyTable ? (
              <DataTable
                columns={vacancyTable.columns}
                rows={vacancyTable.rows.map((row) => vacancyTable.columns.map((c) => (row[c] === 0 && c !== 'Total' ? '—' : row[c])))}
                emphasiseColumn={vacancyTable.columns.indexOf('Total')}
              />
            ) : categoryWise ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 border-l border-t border-slate-300">
                {categoryWise.map((c) => (
                  <div key={c.label} className={`border-r border-b border-slate-300 p-2 text-center ${c.label === 'Total' ? 'bg-emerald-50' : ''}`}>
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">{c.label}</span>
                    <span className={`text-base font-black ${c.label === 'Total' ? 'text-emerald-800' : 'text-slate-800'}`}>{c.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-semibold">{job.title}: <b>{job.vacancyCount.toLocaleString('en-IN')} Posts</b>. Category-wise break-up is given in the official notification.</p>
            )}
          </PortalBox>

          <PortalBox id="eligibility" title="Eligibility Criteria">
            <SafeHtml html={job.eligibility || job.qualification} />
            <p className="mt-3 pt-3 border-t border-dashed border-slate-300 text-xs font-semibold text-slate-500">
              Candidates must hold valid certificates at the time of document verification. Read the official notification before applying.
            </p>
          </PortalBox>

          <PortalBox id="selection" title="Selection Process">
            {selectionSteps ? (
              <ol className="space-y-1.5">
                {selectionSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 font-semibold">
                    <span className="shrink-0 font-extrabold text-emerald-800">Step {idx + 1}:</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : job.selectionProcess ? (
              <SafeHtml html={job.selectionProcess} className="font-medium" />
            ) : (
              <PortalList items={[
                'Computer Based Test (CBT Objective)',
                'Skill Test / Interview (if applicable)',
                'Document Verification & Medical Exam',
              ]} />
            )}
          </PortalBox>

          {examPatternRows && (
            <PortalBox title="Exam Pattern" flush>
              <DataTable
                columns={['Paper', 'Subject', 'Questions', 'Marks', 'Duration']}
                rows={examPatternRows.map((r) => [r.paper, r.subject, r.questions, r.marks, r.duration])}
              />
            </PortalBox>
          )}

          <PortalBox id="apply" title="How to Apply">
            {job.howToApply ? (
              <SafeHtml html={job.howToApply} className="font-medium" />
            ) : (
              <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                <li>Visit the official portal from the Important Links below.</li>
                <li>Register with your mobile number and email ID.</li>
                <li>Fill in your educational details and pay the application fee online.</li>
                <li>Submit the form and save the final confirmation page / registration ID.</li>
              </ol>
            )}
          </PortalBox>

          {job.documentsRequired && (
            <PortalBox title="Documents Required">
              <SafeHtml html={job.documentsRequired} className="font-medium" />
            </PortalBox>
          )}

          {noteLines.length > 0 && (
            <PortalBox title="Important Notes" tone="red">
              {looksLikeHtml(job.importantNotes) ? (
                <SafeHtml html={job.importantNotes!} className="font-semibold" />
              ) : (
                <PortalList items={noteLines.map((l) => l.replace(/^[^\w]+/u, ''))} />
              )}
            </PortalBox>
          )}

          {links.length > 0 && (
            <PortalBox id="links" title="Some Useful Important Links" tone="red" flush>
              <LinksTable links={links} />
              {job.officialNotificationUrl && (
                <DocumentPreview url={job.officialNotificationUrl} variant="inline" className="block px-3 py-2.5" />
              )}
            </PortalBox>
          )}

          {faqEntries && (
            <PortalBox id="faq" title="Frequently Asked Questions">
              <div className="divide-y divide-slate-200">
                {faqEntries.map((f, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="font-extrabold text-slate-900">Q{idx + 1}. {f.question}</p>
                    <p className="font-medium text-slate-600 mt-0.5">{f.answer}</p>
                  </div>
                ))}
              </div>
            </PortalBox>
          )}

          {/* Share */}
          <div className="bg-white border-2 border-slate-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-extrabold text-slate-800">Share this job with your friends</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onShare('whatsapp')} className="inline-flex items-center gap-1.5 bg-[#25D366] hover:brightness-95 text-white text-xs font-extrabold px-3 py-1.5 cursor-pointer" title="Share on WhatsApp">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => onShare('telegram')} className="inline-flex items-center gap-1.5 bg-[#229ED9] hover:brightness-95 text-white text-xs font-extrabold px-3 py-1.5 cursor-pointer" title="Share on Telegram">
                <Send className="w-3.5 h-3.5" /> Telegram
              </button>
              <button onClick={() => onShare('facebook')} className="inline-flex items-center gap-1.5 bg-[#1877F2] hover:brightness-95 text-white text-xs font-extrabold px-3 py-1.5 cursor-pointer" title="Share on Facebook">
                <Facebook className="w-3.5 h-3.5" /> Facebook
              </button>
            </div>
          </div>

          <AdUnit slot="7213818525" format="auto" style={{ minHeight: 250 }} />

          {job.similarJobs.length > 0 && (
            <PortalBox title="Similar Jobs" flush>
              <DataTable
                columns={['Post Name', 'Organization', 'Last Date']}
                rows={job.similarJobs.map((sj) => [
                  <Link key={sj.id} to={`/jobs/${sj.slug}`} className="text-blue-700 hover:text-red-700 font-bold underline underline-offset-2">
                    {sj.title}
                  </Link>,
                  sj.companyOrDept,
                  <span className="whitespace-nowrap">{fmtPortalDate(sj.lastDate)}</span>,
                ])}
              />
            </PortalBox>
          )}
        </main>

        {(job.applyUrl || job.officialNotificationUrl) && (
          <MobileActionBar>
            {job.applyUrl && (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 active:bg-emerald-800 text-white text-sm font-extrabold py-2.5">
                Apply Online <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {job.officialNotificationUrl && (
              <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer"
                className={`${job.applyUrl ? '' : 'flex-1 '}inline-flex items-center justify-center gap-1.5 border-2 border-slate-300 text-slate-800 text-sm font-extrabold px-3 py-2`}>
                <Download className="w-4 h-4" /> PDF
              </a>
            )}
            <button onClick={() => onShare('whatsapp')} aria-label="Share on WhatsApp"
              className="inline-flex items-center justify-center bg-[#25D366] text-white px-3 cursor-pointer">
              <MessageCircle className="w-4 h-4" />
            </button>
          </MobileActionBar>
        )}

    </div>
  );
};
