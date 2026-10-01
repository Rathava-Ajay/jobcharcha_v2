import React from 'react';
import {
  Bookmark, Share2, Users, GraduationCap, UserRound, CalendarDays, Zap, IndianRupee, ListChecks, FileCheck2,
  ClipboardList, Link2, HelpCircle, ExternalLink, Download, Bell, BellRing, ShieldCheck, Check, AlertTriangle,
  MessageCircle, Send, Facebook, FileText, Globe, ChevronRight, ScrollText,
} from 'lucide-react';
import { SafeHtml } from '../SafeHtml';
import { DocumentPreview } from '../DocumentPreview';
import { AdUnit } from '../ads/AdUnit';
import { JobRow } from '../ui/JobRow';
import { Card, OrgAvatar, Pill, DeadlinePill, cx, btn } from '../ui/kit';
import { looksLikeHtml } from '../../utils/jobDetailParsers';
import { fmtDate, daysUntil, daysSince } from '../../utils/dates';
import { useEligibilityProfile, QUALIFICATION_LEVELS, requiredLevel } from '../../utils/localPrefs';
import { JobViewProps, JobLink, fmtMoney, isLastDateLabel } from './jobViewModel';
import { Select } from '../ui/Select';

const LINK_ICON: Record<JobLink['kind'], React.ElementType> = {
  apply: ExternalLink, pdf: Download, syllabus: FileText, website: Globe, telegram: Send, whatsapp: MessageCircle,
};

/** The modern, card-based layout: summary facts up top, sticky apply panel, readable tables. */
export const ModernJobView: React.FC<JobViewProps> = ({ job, vm, saved, onToggleSave, reminded, onToggleReminder, onShare }) => {
  const left = daysUntil(job.lastDate);
  const closed = left !== null && left < 0;
  const primaryHref = job.applyUrl || job.officialNotificationUrl;

  const sections = [
    { id: 'm-overview', label: 'Overview' },
    { id: 'm-dates', label: 'Dates' },
    ...(vm.hasFee ? [{ id: 'm-fee', label: 'Fee' }] : []),
    { id: 'm-eligibility', label: 'Eligibility' },
    { id: 'm-vacancy', label: 'Vacancy' },
    { id: 'm-apply', label: 'How to apply' },
    ...(vm.links.length ? [{ id: 'm-links', label: 'Links' }] : []),
    ...(vm.faqEntries ? [{ id: 'm-faq', label: 'FAQ' }] : []),
  ];

  const facts = [
    { icon: Users, label: 'Total posts', value: job.vacancyCount > 0 ? job.vacancyCount.toLocaleString('en-IN') : '—' },
    { icon: GraduationCap, label: 'Qualification', value: job.qualification },
    vm.ageText
      ? { icon: UserRound, label: 'Age limit', value: vm.ageText }
      : { icon: IndianRupee, label: 'Salary', value: job.salary },
    { icon: CalendarDays, label: 'Last date', value: fmtDate(job.lastDate), alert: true },
  ];

  const main = (
    <div className="space-y-4 min-w-0">
      <Section id="m-overview" icon={Zap} title="In short">
        <SafeHtml
          className="text-slate-700"
          html={job.overview || `${job.companyOrDept} has released a notification for <b>${job.vacancyCount.toLocaleString('en-IN')} ${job.title}</b> posts. Candidates with <b>${job.qualification}</b> can apply until <b>${fmtDate(job.lastDate)}</b>.`}
        />
        {vm.highlightLines.length > 0 && (
          looksLikeHtml(job.keyHighlights)
            ? <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-100 p-3.5"><SafeHtml html={job.keyHighlights!} className="text-[13.5px]" /></div>
            : (
              <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                {vm.highlightLines.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px] text-slate-700"><Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />{l.replace(/^[^\w₹]+/u, '')}</li>
                ))}
              </ul>
            )
        )}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">{job.tags.map((t) => <Pill key={t} tone="grey">#{t}</Pill>)}</div>
        )}
      </Section>

      <AdUnit slot="6771704087" format="fluid" layoutKey="-6t+ed+2i-1n-4w" />

      <Section id="m-dates" icon={CalendarDays} title="Important dates">
        <ol className="relative ml-1.5">
          {vm.importantDates.map((d, i) => {
            const dl = daysUntil(d.date);
            const isLast = isLastDateLabel(d.label);
            const done = dl !== null && dl < 0;
            return (
              <li key={i} className="relative pl-6 pb-4 last:pb-0">
                {i < vm.importantDates.length - 1 && <span className="absolute left-[4px] top-3 bottom-0 w-0.5 bg-slate-200" aria-hidden />}
                <span aria-hidden className={cx(
                  'absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2',
                  isLast && !done ? 'bg-red-600 border-red-600 ring-4 ring-red-50' : done ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300',
                )} />
                <p className={cx('font-bold text-[14.5px]', isLast && !done ? 'text-red-700' : 'text-slate-900')}>{fmtDate(d.date)}</p>
                <p className="text-[13px] text-slate-500">{d.label}{done ? ' · done' : ''}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      {vm.hasFee && (
        <Section id="m-fee" icon={IndianRupee} title="Application fee">
          {vm.feeTable ? (
            <SimpleTable head={['Category', 'Fee']} rows={vm.feeTable.map((r) => [r.category, <b className="text-emerald-700">{r.fee}</b>])} />
          ) : job.applicationFee !== undefined ? (
            <p className="text-lg font-extrabold text-emerald-700">{vm.feeText}</p>
          ) : null}
          {job.applicationFeeDetails && <p className="text-[13px] text-slate-500 mt-3">{job.applicationFeeDetails}</p>}
        </Section>
      )}

      <Section id="m-eligibility" icon={GraduationCap} title="Eligibility">
        <SafeHtml html={job.eligibility || job.qualification} className="text-slate-700" />
        {(vm.hasAgeBox || vm.hasSalaryBox) && (
          <div className="mt-4">
            <SimpleTable rows={[
              ...(vm.ageText ? [['Age limit', vm.ageText]] : []),
              ...(job.experienceRequired !== undefined ? [['Experience', job.experienceRequired > 0 ? `${job.experienceRequired}+ years` : 'Not required (freshers can apply)']] : []),
              ...(vm.hasSalaryRange ? [['Pay range', `${fmtMoney(job.minSalary) ?? ''}${job.maxSalary ? ` – ${fmtMoney(job.maxSalary)}` : ''}${job.salaryType ? ` / ${job.salaryType}` : ''}`]] : []),
              ...(job.salary ? [['Salary', job.salary]] : []),
              ...vm.salaryRows.map((r) => [r.label, r.value]),
            ] as React.ReactNode[][]} keyValue />
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">Age relaxation for reserved categories applies as per the official notification.</p>
      </Section>

      <Section id="m-vacancy" icon={Users} title={`Vacancy details · ${job.vacancyCount.toLocaleString('en-IN')} posts`} flush={!!vm.vacancyTable}>
        {vm.vacancyTable ? (
          <SimpleTable
            head={vm.vacancyTable.columns}
            rows={vm.vacancyTable.rows.map((row) => vm.vacancyTable!.columns.map((c) => {
              const v = row[c] === 0 && c !== 'Total' ? '—' : row[c];
              return c === 'Total' ? <b className="text-emerald-700">{v}</b> : v;
            }))}
            padded
          />
        ) : vm.categoryWise ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {vm.categoryWise.map((c) => (
              <div key={c.label} className={cx('rounded-xl p-2.5 text-center', c.label === 'Total' ? 'bg-emerald-50' : 'bg-slate-50')}>
                <span className="block text-[11px] font-bold uppercase text-slate-500">{c.label}</span>
                <span className={cx('block text-lg font-extrabold', c.label === 'Total' ? 'text-emerald-700' : 'text-slate-900')}>{c.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-700">Total <b>{job.vacancyCount.toLocaleString('en-IN')}</b> posts. The category-wise break-up is given in the official notification.</p>
        )}
      </Section>

      <Section icon={ListChecks} title="Selection process">
        {vm.selectionSteps ? (
          <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {vm.selectionSteps.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
                <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 text-[13px] font-extrabold grid place-items-center shrink-0">{i + 1}</span>
                {s}
                {i < vm.selectionSteps!.length - 1 && <ChevronRight className="hidden sm:block w-4 h-4 text-slate-300" />}
              </li>
            ))}
          </ol>
        ) : job.selectionProcess ? <SafeHtml html={job.selectionProcess} className="text-slate-700" /> : (
          <p className="text-slate-700">Written exam, followed by document verification — see the official notification for details.</p>
        )}
      </Section>

      {vm.examPatternRows && (
        <Section icon={ScrollText} title="Exam pattern" flush>
          <SimpleTable head={['Paper', 'Subject', 'Questions', 'Marks', 'Duration']}
            rows={vm.examPatternRows.map((r) => [r.paper, r.subject, r.questions, r.marks, r.duration])} padded />
        </Section>
      )}

      <Section id="m-apply" icon={ClipboardList} title="How to apply">
        {job.howToApply ? <SafeHtml html={job.howToApply} className="text-slate-700" /> : (
          <ol className="space-y-2.5">
            {['Open the official apply link below.', 'Register with your mobile number and email ID.', 'Fill in your details, upload photo & signature, and pay the fee online.', 'Submit and download the confirmation page.'].map((s, i) => (
              <li key={i} className="flex gap-3 text-slate-700"><span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold grid place-items-center shrink-0">{i + 1}</span>{s}</li>
            ))}
          </ol>
        )}
      </Section>

      {job.documentsRequired && (
        <Section icon={FileCheck2} title="Documents required">
          <SafeHtml html={job.documentsRequired} className="text-slate-700" />
        </Section>
      )}

      {vm.noteLines.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <p className="flex items-center gap-2 font-extrabold text-amber-900"><AlertTriangle className="w-5 h-5" /> Important notes</p>
          <div className="mt-2 text-[14px] text-amber-950/80">
            {looksLikeHtml(job.importantNotes)
              ? <SafeHtml html={job.importantNotes!} />
              : <ul className="list-disc pl-5 space-y-1">{vm.noteLines.map((l, i) => <li key={i}>{l.replace(/^[^\w]+/u, '')}</li>)}</ul>}
          </div>
        </div>
      )}

      {vm.links.length > 0 && (
        <Section id="m-links" icon={Link2} title="Official links">
          <div className="grid sm:grid-cols-2 gap-2">
            {vm.links.map((l) => {
              const Icon = LINK_ICON[l.kind];
              return (
                <a key={l.href + l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  className={cx('flex items-center gap-3 rounded-xl border px-3.5 py-3 font-semibold text-[14px] hover:border-emerald-600 hover:bg-emerald-50/40',
                    l.kind === 'apply' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-slate-200 text-slate-800')}>
                  <Icon className="w-4 h-4 shrink-0" /> <span className="flex-1">{l.label}</span> <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              );
            })}
          </div>
          {job.officialNotificationUrl && <DocumentPreview url={job.officialNotificationUrl} variant="inline" className="block mt-3" />}
        </Section>
      )}

      {vm.faqEntries && (
        <Section id="m-faq" icon={HelpCircle} title="Frequently asked questions">
          <div className="divide-y divide-slate-100 -my-2">
            {vm.faqEntries.map((f, i) => (
              <details key={i} className="group py-3" open={i === 0}>
                <summary className="flex items-start justify-between gap-3 font-bold text-slate-900 cursor-pointer list-none">
                  {f.question}
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-slate-600 mt-1.5 text-[14px]">{f.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <span className="font-bold text-[14px] flex-1 min-w-[12rem]">Know someone preparing? Share this job</span>
        <ShareButtons onShare={onShare} />
      </Card>

      <AdUnit slot="7213818525" format="auto" style={{ minHeight: 250 }} />

      {job.similarJobs.length > 0 && (
        <section>
          <h2 className="text-lg font-extrabold mb-3">Similar jobs</h2>
          <Card>{job.similarJobs.slice(0, 5).map((j) => <JobRow key={j.id} job={j} showCta={false} />)}</Card>
        </section>
      )}
    </div>
  );

  return (
    <div className={primaryHref ? 'pb-20 lg:pb-0' : ''}>
      {/* Summary header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex gap-3.5 sm:gap-4 items-start">
            <OrgAvatar name={job.companyOrDept} logo={job.organizationLogo} size="lg" className="max-sm:w-11 max-sm:h-11 max-sm:text-xs" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <Pill tone="green" icon={ShieldCheck}>Verified</Pill>
                <DeadlinePill date={job.lastDate} />
                {job.isUrgent && <Pill tone="red">Urgent</Pill>}
                {(daysSince(job.postedDate) ?? 9) <= 2 && <Pill tone="blue">New</Pill>}
                {job.advertisementNumber && <span className="hidden sm:inline-flex"><Pill tone="grey">Advt. No. {job.advertisementNumber}</Pill></span>}
              </div>
              <h1 className="mt-2 text-[21px] sm:text-[28px] font-extrabold leading-tight text-slate-900">{job.title}</h1>
              <p className="text-[13px] sm:text-sm text-slate-500 mt-1">{job.companyOrDept} · Posted {fmtDate(job.postedDate)}</p>
            </div>
            <div className="hidden md:flex gap-2 shrink-0">
              <SaveButton saved={saved} onClick={onToggleSave} />
              <button type="button" onClick={() => onShare('whatsapp')} className={btn.secondary}><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 mt-4 sm:mt-5 rounded-2xl border border-slate-200 overflow-hidden bg-slate-200 gap-px">
            {facts.map((f) => (
              <div key={f.label} className="bg-white px-3.5 py-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><f.icon className="w-3.5 h-3.5" />{f.label}</span>
                <span className={cx('block mt-0.5 font-bold text-[15px] sm:text-base leading-snug break-words', f.alert && !closed ? 'text-red-700' : 'text-slate-900')}>{f.value}</span>
              </div>
            ))}
          </div>

          <nav aria-label="Sections" className="flex gap-1 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className={cx('shrink-0 px-3 py-2.5 text-[13.5px] font-semibold border-b-2', i === 0 ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-900')}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 grid lg:grid-cols-[1fr_330px] gap-6 items-start">
        {main}
        <aside className="hidden lg:block sticky top-20 space-y-4">
          <ApplyPanel job={job} left={left} closed={closed} reminded={reminded} onToggleReminder={onToggleReminder} />
          <EligibilityCheck minAge={job.minAge} maxAge={job.maxAge} qualification={job.qualification} />
        </aside>
        {/* On phones the panels sit after the content (apply is in the sticky bar). */}
        <div className="lg:hidden space-y-4">
          <EligibilityCheck minAge={job.minAge} maxAge={job.maxAge} qualification={job.qualification} />
          {!closed && (
            <button type="button" onClick={onToggleReminder} className={cx(btn.secondary, 'w-full')}>
              {reminded ? <BellRing className="w-4 h-4 text-emerald-600" /> : <Bell className="w-4 h-4" />}
              {reminded ? 'Reminder set — tap to cancel' : 'Remind me before the last date'}
            </button>
          )}
        </div>
      </div>

      {primaryHref && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
          <button type="button" onClick={onToggleSave} aria-label={saved ? 'Remove from saved' : 'Save job'} aria-pressed={saved}
            className={cx('w-12 h-12 rounded-xl border grid place-items-center shrink-0 cursor-pointer', saved ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600')}>
            <Bookmark className={cx('w-5 h-5', saved && 'fill-amber-400')} />
          </button>
          <button type="button" onClick={() => onShare('whatsapp')} aria-label="Share on WhatsApp" className="w-12 h-12 rounded-xl border border-slate-200 grid place-items-center shrink-0 text-[#16a34a] cursor-pointer">
            <MessageCircle className="w-5 h-5" />
          </button>
          <a href={primaryHref} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'flex-1 h-12 text-[15px]')}>
            {job.applyUrl ? (closed ? 'Open official site' : `Apply online${left !== null && left <= 30 ? ` · ${left === 0 ? 'last day' : `${left}d left`}` : ''}`) : 'Download notification'}
          </a>
        </div>
      )}
    </div>
  );
};

// ---- pieces ----------------------------------------------------------------------------------

const Section: React.FC<{ id?: string; icon: React.ElementType; title: string; flush?: boolean; children: React.ReactNode }> = ({ id, icon: Icon, title, flush, children }) => (
  <Card id={id} className={cx('scroll-mt-24', flush ? 'py-4 sm:py-5' : 'p-4 sm:p-5')}>
    <h2 className={cx('flex items-center gap-2 text-[16px] sm:text-[17px] font-extrabold text-slate-900 mb-3', flush && 'px-4 sm:px-5')}>
      <Icon className="w-5 h-5 text-emerald-700" /> {title}
    </h2>
    <div className="text-[14.5px] leading-relaxed">{children}</div>
  </Card>
);

const SimpleTable: React.FC<{ head?: string[]; rows: React.ReactNode[][]; keyValue?: boolean; padded?: boolean }> = ({ head, rows, keyValue, padded }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[13.5px] border-collapse">
      {head && (
        <thead>
          <tr>{head.map((h, i) => (
            <th key={h} className={cx('text-left bg-slate-50 text-[11.5px] uppercase tracking-wide font-bold text-slate-500 py-2.5 px-3 whitespace-nowrap border-b border-slate-100', padded && i === 0 && 'pl-4 sm:pl-5')}>{h}</th>
          ))}</tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            {r.map((c, j) => (
              <td key={j} className={cx('py-2.5 px-3 align-top', keyValue && j === 0 ? 'text-slate-500 w-[40%]' : 'text-slate-800', j > 0 && !keyValue && 'whitespace-nowrap', padded && j === 0 && 'pl-4 sm:pl-5 min-w-[9rem]')}>
                {c ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SaveButton: React.FC<{ saved: boolean; onClick: () => void }> = ({ saved, onClick }) => (
  <button type="button" onClick={onClick} aria-pressed={saved} className={cx(btn.secondary, saved && 'border-amber-300 bg-amber-50 text-amber-800')}>
    <Bookmark className={cx('w-4 h-4', saved && 'fill-amber-400 text-amber-500')} /> {saved ? 'Saved' : 'Save'}
  </button>
);

const ShareButtons: React.FC<{ onShare: JobViewProps['onShare'] }> = ({ onShare }) => (
  <div className="flex gap-2">
    <button type="button" onClick={() => onShare('whatsapp')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white text-[13px] font-bold px-3 py-2 cursor-pointer"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
    <button type="button" onClick={() => onShare('telegram')} className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] text-white text-[13px] font-bold px-3 py-2 cursor-pointer"><Send className="w-4 h-4" /> Telegram</button>
    <button type="button" onClick={() => onShare('facebook')} aria-label="Share on Facebook" className="inline-flex items-center rounded-xl bg-[#1877F2] text-white px-3 py-2 cursor-pointer"><Facebook className="w-4 h-4" /></button>
  </div>
);

const ApplyPanel: React.FC<{ job: JobViewProps['job']; left: number | null; closed: boolean; reminded: boolean; onToggleReminder: () => void }> = ({ job, left, closed, reminded, onToggleReminder }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-slate-500">{closed ? 'Applications closed on' : 'Applications close on'}</span>
      <DeadlinePill date={job.lastDate} />
    </div>
    <p className={cx('text-xl font-extrabold mt-1', closed ? 'text-slate-500' : 'text-slate-900')}>{fmtDate(job.lastDate)}</p>
    <div className="mt-4 space-y-2">
      {job.applyUrl && (
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className={cx(btn.primary, 'w-full py-3')}>
          {closed ? 'Open official site' : 'Apply online'} <ExternalLink className="w-4 h-4" />
        </a>
      )}
      {job.officialNotificationUrl && (
        <a href={job.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className={cx(btn.secondary, 'w-full')}>
          <Download className="w-4 h-4" /> Download notification
        </a>
      )}
      {!closed && (
        <button type="button" onClick={onToggleReminder} aria-pressed={reminded} className={cx(btn.secondary, 'w-full', reminded && 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          {reminded ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          {reminded ? 'Reminder set' : 'Remind me before last date'}
        </button>
      )}
    </div>
    {reminded && left !== null && left >= 0 && (
      <p className="text-xs text-slate-500 mt-2">We'll remind you on this device when you visit JobCharcha in the last 3 days.</p>
    )}
  </Card>
);

/**
 * "Am I eligible?" — a quick self-check against the job's age range and minimum qualification.
 * The answers are remembered on this device so every job page can show the verdict instantly.
 */
const EligibilityCheck: React.FC<{ minAge?: number; maxAge?: number; qualification?: string }> = ({ minAge, maxAge, qualification }) => {
  const [profile, setProfile] = useEligibilityProfile();
  const need = requiredLevel(qualification);
  const ageKnown = minAge !== undefined || maxAge !== undefined;

  const ageOk = profile.age === undefined || !ageKnown ? null
    : (minAge === undefined || profile.age >= minAge) && (maxAge === undefined || profile.age <= maxAge);
  const qualOk = profile.level === undefined || need === null ? null : profile.level >= need;

  const verdict = (ok: boolean | null, unknownText: string) => ok === null
    ? <Pill tone="grey">{unknownText}</Pill>
    : ok ? <Pill tone="green" icon={Check}>Yes</Pill> : <Pill tone="red">No</Pill>;

  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-extrabold"><ShieldCheck className="w-5 h-5 text-emerald-700" /> Am I eligible?</p>
      <p className="text-xs text-slate-500 mt-0.5">Quick check — saved on this device, not shared.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <label className="text-xs font-semibold text-slate-600">
          Your age
          <input type="number" inputMode="numeric" min={14} max={70} value={profile.age ?? ''}
            onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600" placeholder="e.g. 24" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Qualification
          <Select value={profile.level ?? ''} onChange={(e) => setProfile({ ...profile, level: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 bg-white cursor-pointer">
            <option value="">Select</option>
            {QUALIFICATION_LEVELS.map((q) => <option key={q.level} value={q.level}>{q.label}</option>)}
          </Select>
        </label>
      </div>
      <div className="mt-3 divide-y divide-slate-100 text-[13.5px]">
        <div className="flex items-center justify-between py-2">
          <span>Age {ageKnown ? `(${minAge ?? '—'}–${maxAge ?? '—'})` : ''}</span>
          {verdict(ageOk, ageKnown ? 'Enter age' : 'See notice')}
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="truncate pr-2">Qualification</span>
          {verdict(qualOk, need === null ? 'See notice' : 'Select')}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Relaxations for reserved categories aren't included — always confirm in the official notification.</p>
    </Card>
  );
};
