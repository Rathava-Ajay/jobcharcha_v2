import { Job } from '../../types';
import {
  parseVacancyBreakdown, parseCategoryWiseVacancy, parseSelectionSteps, parseFeeTable, splitLines,
  parseFaqSchema, parseExamPattern, parseSalaryBreakdown,
} from '../../utils/jobDetailParsers';

export type DetailJob = Job & { similarJobs: Job[] };

export interface JobLink {
  label: string;
  href: string;
  cta?: string;
  kind: 'apply' | 'pdf' | 'syllabus' | 'website' | 'telegram' | 'whatsapp';
}

export const fmtMoney = (v?: number) => (v === undefined ? undefined : `₹${v.toLocaleString('en-IN')}`);

/**
 * Everything both job-detail layouts (Modern and Classic portal) derive from the raw job:
 * parsed CMS JSON tables, which boxes have content, and the ordered official links.
 * Computed once per render in JobDetailsPage and handed to whichever view is active.
 */
export function buildJobViewModel(job: DetailJob) {
  const importantDates = job.importantDates && job.importantDates.length > 0
    ? job.importantDates
    : [{ label: 'Notification Release', date: job.postedDate }, { label: 'Application Last Date', date: job.lastDate }];

  const feeTable = parseFeeTable(job.applicationFeeJson);
  const salaryBreakdown = parseSalaryBreakdown(job.salaryBreakdownJson);
  const hasAgeInfo = job.minAge !== undefined || job.maxAge !== undefined;
  const hasSalaryRange = job.minSalary !== undefined || job.maxSalary !== undefined;

  const links: JobLink[] = [];
  if (job.applyUrl) links.push({ label: 'Apply Online', href: job.applyUrl, kind: 'apply' });
  if (job.officialNotificationUrl) links.push({ label: 'Download Official Notification', href: job.officialNotificationUrl, kind: 'pdf' });
  if (job.syllabusLink) links.push({ label: 'Syllabus / Exam Pattern', href: job.syllabusLink, kind: 'syllabus' });
  if (job.officialWebsite) links.push({ label: 'Official Website', href: job.officialWebsite, kind: 'website' });
  if (job.telegramLink) links.push({ label: 'Join Telegram Channel', href: job.telegramLink, cta: 'Join Now', kind: 'telegram' });
  if (job.whatsAppLink) links.push({ label: 'Join WhatsApp Group', href: job.whatsAppLink, cta: 'Join Now', kind: 'whatsapp' });

  const ageText = hasAgeInfo
    ? (job.minAge !== undefined && job.maxAge !== undefined ? `${job.minAge}–${job.maxAge} years`
      : job.maxAge !== undefined ? `Up to ${job.maxAge} years` : `${job.minAge}+ years`)
    : undefined;

  const feeText = job.applicationFee === 0 ? 'Nil (No Fee)' : `${fmtMoney(job.applicationFee)}/-`;

  return {
    importantDates,
    highlightLines: splitLines(job.keyHighlights),
    noteLines: splitLines(job.importantNotes),
    vacancyTable: parseVacancyBreakdown(job.vacancyBreakdownJson),
    categoryWise: parseCategoryWiseVacancy(job.categoryWiseVacancyJson),
    selectionSteps: parseSelectionSteps(job.selectionProcessJson),
    feeTable,
    faqEntries: parseFaqSchema(job.faqSchemaJson),
    examPatternRows: parseExamPattern(job.examPatternJson),
    salaryBreakdown,
    hasAgeInfo,
    hasSalaryRange,
    links,
    ageText,
    feeText,
    feeHeadline: feeTable?.[0]?.fee ?? (job.applicationFee !== undefined ? feeText : undefined),
    hasFee: !!feeTable || job.applicationFee !== undefined || !!job.applicationFeeDetails,
    hasAgeBox: hasAgeInfo || job.experienceRequired !== undefined,
    hasSalaryBox: hasSalaryRange || !!job.salary || !!salaryBreakdown,
    salaryRows: salaryBreakdown ? [
      { label: 'Basic Pay', value: salaryBreakdown.basicPay },
      { label: 'DA', value: salaryBreakdown.da },
      { label: 'HRA', value: salaryBreakdown.hra },
      { label: 'Gross Salary', value: salaryBreakdown.grossSalary },
      { label: 'Net Salary', value: salaryBreakdown.netSalary },
    ].filter((r) => r.value) as { label: string; value: string }[] : [],
  };
}

export type JobViewModel = ReturnType<typeof buildJobViewModel>;

export const isLastDateLabel = (label: string) => /last|closing|end/i.test(label);

export interface JobViewProps {
  job: DetailJob;
  vm: JobViewModel;
  saved: boolean;
  onToggleSave: () => void;
  reminded: boolean;
  onToggleReminder: () => void;
  onShare: (platform: 'whatsapp' | 'telegram' | 'facebook') => void;
}
