export interface ParsedFaqItem {
  question: string;
  answer: string;
}

export interface ParsedVacancyRow {
  postName: string;
  sc: number;
  st: number;
  obc: number;
  ews: number;
  ur: number;
  total: number;
}

export interface ParsedFeeRow {
  category: string;
  fee: string;
}

export interface ParsedExamPatternRow {
  paper: string;
  subject?: string | null;
  questions: number;
  marks: number;
  duration?: string | null;
  type?: string | null;
}

export interface ParsedSalaryBreakdown {
  basicPay?: string | null;
  da?: string | null;
  hra?: string | null;
  grossSalary?: string | null;
  netSalary?: string | null;
}

export interface ParsedImportantDates {
  notificationDate?: string | null;
  applicationStart?: string | null;
  applicationEnd?: string | null;
  feePaymentEnd?: string | null;
  admitCardDate?: string | null;
  examDate?: string | null;
  resultDate?: string | null;
}

export interface ParsedAiJob {
  title: string;
  slug?: string | null;
  department: string;
  categoryName: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  totalPosts?: number | null;
  salary?: string | null;
  ageLimit?: string | null;
  qualification?: string | null;
  location?: string | null;
  lastDate: string;
  applyLink?: string | null;
  shortDescription: string;
  overview: string;
  keyHighlights?: string | null;
  eligibilityDetails?: string | null;
  howToApply: string;
  importantNotes?: string | null;
  documentsRequired?: string | null;
  faqSchema: ParsedFaqItem[];
  vacancyBreakdown: ParsedVacancyRow[];
  categoryWiseVacancy: Record<string, number>;
  applicationFee: ParsedFeeRow[];
  selectionProcess: string[];
  examPattern: ParsedExamPatternRow[];
  salaryBreakdown: ParsedSalaryBreakdown | null;
  importantDates: ParsedImportantDates | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  internalLinkAnchors: string[];
  autoPublish: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateOrNull(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (typeof v === 'string' && DATE_RE.test(v));
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  return fallback;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/** Strips a ```json ... ``` (or bare ``` ... ```) fence some AI apps wrap output in despite instructions not to. */
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  data?: ParsedAiJob;
}

/** Parses + validates the AI-returned JSON against the schema `aiPrompts.ts`'s extraction prompt requests.
 * Hard errors block posting; warnings (e.g. meta-length overages) are shown but don't block. */
export function validateAiJobImport(rawText: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch (err) {
    return { errors: [`Could not parse JSON: ${err instanceof Error ? err.message : 'invalid syntax'}`], warnings: [] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { errors: ['Pasted content is not a JSON object.'], warnings: [] };
  }
  const obj = parsed as Record<string, unknown>;

  const requiredStrings: (keyof ParsedAiJob)[] = [
    'title', 'department', 'categoryName', 'focusKeyword',
    'shortDescription', 'overview', 'howToApply', 'metaTitle', 'metaDescription',
  ];
  for (const field of requiredStrings) {
    const v = obj[field];
    if (typeof v !== 'string' || v.trim() === '') {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  if (typeof obj.lastDate !== 'string' || !DATE_RE.test(obj.lastDate)) {
    errors.push('"lastDate" must be in YYYY-MM-DD format.');
  }

  if (obj.faqSchema !== undefined) {
    if (!Array.isArray(obj.faqSchema)) {
      errors.push('"faqSchema" must be an array.');
    } else {
      obj.faqSchema.forEach((item, idx) => {
        const f = item as Record<string, unknown>;
        if (typeof f?.question !== 'string' || typeof f?.answer !== 'string') {
          errors.push(`"faqSchema[${idx}]" must have both "question" and "answer" as strings.`);
        }
      });
    }
  }

  const importantDates = obj.importantDates as Record<string, unknown> | null | undefined;
  if (importantDates && typeof importantDates === 'object') {
    for (const key of ['notificationDate', 'applicationStart', 'applicationEnd', 'feePaymentEnd', 'admitCardDate', 'examDate', 'resultDate']) {
      if (!isDateOrNull(importantDates[key])) {
        errors.push(`"importantDates.${key}" must be YYYY-MM-DD or null.`);
      }
    }
  }

  const title = typeof obj.title === 'string' ? obj.title : '';
  const metaTitle = typeof obj.metaTitle === 'string' ? obj.metaTitle : '';
  const metaDescription = typeof obj.metaDescription === 'string' ? obj.metaDescription : '';
  const shortDescription = typeof obj.shortDescription === 'string' ? obj.shortDescription : '';
  if (metaTitle.length > 60) warnings.push(`metaTitle is ${metaTitle.length} chars (recommended max 60).`);
  if (metaDescription.length > 155) warnings.push(`metaDescription is ${metaDescription.length} chars (recommended max 155).`);
  if (shortDescription.length > 400) warnings.push(`shortDescription is ${shortDescription.length} chars (recommended max 400).`);
  if (toStringArray(obj.secondaryKeywords).length === 0) warnings.push('No secondaryKeywords returned.');
  if (toStringArray(obj.lsiKeywords).length === 0) warnings.push('No lsiKeywords returned.');
  if (typeof obj.keyHighlights !== 'string' || obj.keyHighlights.trim() === '') warnings.push('No keyHighlights returned — the "Key Highlights" section will be hidden on the live page.');
  if (typeof obj.importantNotes !== 'string' || obj.importantNotes.trim() === '') warnings.push('No importantNotes returned — the "Important Notes" section will be hidden on the live page.');
  if (typeof obj.eligibilityDetails !== 'string' || obj.eligibilityDetails.trim() === '') warnings.push('No eligibilityDetails returned — eligibility section will fall back to the plain qualification text.');

  if (errors.length > 0) return { errors, warnings };

  const vacancyBreakdown: ParsedVacancyRow[] = Array.isArray(obj.vacancyBreakdown)
    ? obj.vacancyBreakdown.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          postName: typeof row.postName === 'string' ? row.postName : '',
          sc: toNumber(row.sc), st: toNumber(row.st), obc: toNumber(row.obc),
          ews: toNumber(row.ews), ur: toNumber(row.ur), total: toNumber(row.total),
        };
      })
    : [];

  const applicationFee: ParsedFeeRow[] = Array.isArray(obj.applicationFee)
    ? obj.applicationFee.map((r) => {
        const row = r as Record<string, unknown>;
        return { category: String(row.category ?? ''), fee: String(row.fee ?? '') };
      })
    : [];

  const examPattern: ParsedExamPatternRow[] = Array.isArray(obj.examPattern)
    ? obj.examPattern.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          paper: String(row.paper ?? ''),
          subject: typeof row.subject === 'string' ? row.subject : null,
          questions: toNumber(row.questions),
          marks: toNumber(row.marks),
          duration: typeof row.duration === 'string' ? row.duration : null,
          type: typeof row.type === 'string' ? row.type : null,
        };
      })
    : [];

  const categoryWiseVacancy: Record<string, number> = {};
  if (obj.categoryWiseVacancy && typeof obj.categoryWiseVacancy === 'object') {
    for (const [k, v] of Object.entries(obj.categoryWiseVacancy as Record<string, unknown>)) {
      categoryWiseVacancy[k] = toNumber(v);
    }
  }

  const data: ParsedAiJob = {
    title,
    slug: typeof obj.slug === 'string' ? obj.slug : null,
    department: String(obj.department ?? ''),
    categoryName: String(obj.categoryName ?? ''),
    focusKeyword: String(obj.focusKeyword ?? ''),
    secondaryKeywords: toStringArray(obj.secondaryKeywords),
    lsiKeywords: toStringArray(obj.lsiKeywords),
    totalPosts: obj.totalPosts !== undefined && obj.totalPosts !== null ? toNumber(obj.totalPosts) : null,
    salary: typeof obj.salary === 'string' ? obj.salary : null,
    ageLimit: typeof obj.ageLimit === 'string' ? obj.ageLimit : null,
    qualification: typeof obj.qualification === 'string' ? obj.qualification : null,
    location: typeof obj.location === 'string' ? obj.location : null,
    lastDate: obj.lastDate as string,
    applyLink: typeof obj.applyLink === 'string' ? obj.applyLink : null,
    shortDescription,
    overview: String(obj.overview ?? ''),
    keyHighlights: typeof obj.keyHighlights === 'string' ? obj.keyHighlights : null,
    eligibilityDetails: typeof obj.eligibilityDetails === 'string' ? obj.eligibilityDetails : null,
    howToApply: String(obj.howToApply ?? ''),
    importantNotes: typeof obj.importantNotes === 'string' ? obj.importantNotes : null,
    documentsRequired: typeof obj.documentsRequired === 'string' ? obj.documentsRequired : null,
    faqSchema: Array.isArray(obj.faqSchema)
      ? obj.faqSchema.map((f) => {
          const item = f as Record<string, unknown>;
          return { question: String(item.question ?? ''), answer: String(item.answer ?? '') };
        })
      : [],
    vacancyBreakdown,
    categoryWiseVacancy,
    applicationFee,
    selectionProcess: toStringArray(obj.selectionProcess),
    examPattern,
    salaryBreakdown: obj.salaryBreakdown && typeof obj.salaryBreakdown === 'object' ? obj.salaryBreakdown as ParsedSalaryBreakdown : null,
    importantDates: importantDates ?? null,
    metaTitle,
    metaDescription,
    metaKeywords: typeof obj.metaKeywords === 'string' ? obj.metaKeywords : null,
    ogTitle: typeof obj.ogTitle === 'string' ? obj.ogTitle : null,
    ogDescription: typeof obj.ogDescription === 'string' ? obj.ogDescription : null,
    internalLinkAnchors: toStringArray(obj.internalLinkAnchors),
    autoPublish: obj.autoPublish !== false,
  };

  return { errors, warnings, data };
}
