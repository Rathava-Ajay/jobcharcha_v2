import { stripCodeFences } from './aiJobImportValidation';

export interface ParsedResultFaqItem {
  question: string;
  answer: string;
}

export interface ParsedCutOffRow {
  postName: string;
  general?: string | null;
  sc?: string | null;
  st?: string | null;
  obc?: string | null;
  ews?: string | null;
}

export interface ParsedAiResult {
  title: string;
  slug?: string | null;
  examName?: string | null;
  organizationName: string;
  categoryName: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  resultDate: string;
  examDate?: string | null;
  resultLink?: string | null;
  resultPdf?: string | null;
  cutOffMarks?: string | null;
  selectedCandidates?: string | null;
  location?: string | null;
  shortDescription: string;
  description: string;
  faqSchema: ParsedResultFaqItem[];
  cutOffBreakdown: ParsedCutOffRow[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  internalLinkAnchors: string[];
  autoPublish: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export interface ResultValidationResult {
  errors: string[];
  warnings: string[];
  data?: ParsedAiResult;
}

/** Parses + validates the AI-returned JSON against the schema `aiPrompts.ts`'s Result extraction prompt requests. */
export function validateAiResultImport(rawText: string): ResultValidationResult {
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

  const requiredStrings: (keyof ParsedAiResult)[] = [
    'title', 'organizationName', 'categoryName', 'focusKeyword',
    'shortDescription', 'description', 'metaTitle', 'metaDescription',
  ];
  for (const field of requiredStrings) {
    const v = obj[field];
    if (typeof v !== 'string' || v.trim() === '') {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  if (typeof obj.resultDate !== 'string' || !DATE_RE.test(obj.resultDate)) {
    errors.push('"resultDate" must be in YYYY-MM-DD format.');
  }
  if (obj.examDate !== undefined && obj.examDate !== null && obj.examDate !== '' && !(typeof obj.examDate === 'string' && DATE_RE.test(obj.examDate))) {
    errors.push('"examDate" must be YYYY-MM-DD or null.');
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

  const metaTitle = typeof obj.metaTitle === 'string' ? obj.metaTitle : '';
  const metaDescription = typeof obj.metaDescription === 'string' ? obj.metaDescription : '';
  const shortDescription = typeof obj.shortDescription === 'string' ? obj.shortDescription : '';
  if (metaTitle.length > 60) warnings.push(`metaTitle is ${metaTitle.length} chars (recommended max 60).`);
  if (metaDescription.length > 155) warnings.push(`metaDescription is ${metaDescription.length} chars (recommended max 155).`);
  if (shortDescription.length > 400) warnings.push(`shortDescription is ${shortDescription.length} chars (recommended max 400).`);
  if (toStringArray(obj.secondaryKeywords).length === 0) warnings.push('No secondaryKeywords returned.');
  if (toStringArray(obj.lsiKeywords).length === 0) warnings.push('No lsiKeywords returned.');

  if (errors.length > 0) return { errors, warnings };

  const cutOffBreakdown: ParsedCutOffRow[] = Array.isArray(obj.cutOffBreakdown)
    ? obj.cutOffBreakdown.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          postName: String(row.postName ?? ''),
          general: typeof row.general === 'string' ? row.general : null,
          sc: typeof row.sc === 'string' ? row.sc : null,
          st: typeof row.st === 'string' ? row.st : null,
          obc: typeof row.obc === 'string' ? row.obc : null,
          ews: typeof row.ews === 'string' ? row.ews : null,
        };
      })
    : [];

  const data: ParsedAiResult = {
    title: obj.title as string,
    slug: typeof obj.slug === 'string' ? obj.slug : null,
    examName: typeof obj.examName === 'string' ? obj.examName : null,
    organizationName: String(obj.organizationName ?? ''),
    categoryName: String(obj.categoryName ?? ''),
    focusKeyword: String(obj.focusKeyword ?? ''),
    secondaryKeywords: toStringArray(obj.secondaryKeywords),
    lsiKeywords: toStringArray(obj.lsiKeywords),
    resultDate: obj.resultDate as string,
    examDate: typeof obj.examDate === 'string' ? obj.examDate : null,
    resultLink: typeof obj.resultLink === 'string' ? obj.resultLink : null,
    resultPdf: typeof obj.resultPdf === 'string' ? obj.resultPdf : null,
    cutOffMarks: typeof obj.cutOffMarks === 'string' ? obj.cutOffMarks : null,
    selectedCandidates: typeof obj.selectedCandidates === 'string' ? obj.selectedCandidates : null,
    location: typeof obj.location === 'string' ? obj.location : null,
    shortDescription,
    description: String(obj.description ?? ''),
    faqSchema: Array.isArray(obj.faqSchema)
      ? obj.faqSchema.map((f) => {
          const item = f as Record<string, unknown>;
          return { question: String(item.question ?? ''), answer: String(item.answer ?? '') };
        })
      : [],
    cutOffBreakdown,
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
