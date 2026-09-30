import { stripCodeFences } from './aiJobImportValidation';

export interface ParsedAdmitCardFaqItem {
  question: string;
  answer: string;
}

export interface ParsedAiAdmitCard {
  title: string;
  slug?: string | null;
  examName?: string | null;
  organizationName: string;
  categoryName: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  admitCardReleaseDate: string;
  examDate?: string | null;
  downloadLink?: string | null;
  postName?: string | null;
  year?: number | null;
  location?: string | null;
  shortDescription: string;
  description: string;
  howToDownload?: string | null;
  instructionsForExam: string[];
  documentsToCarryForExam: string[];
  faqSchema: ParsedAdmitCardFaqItem[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  internalLinkAnchors: string[];
  autoPublish: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  return fallback;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export interface AdmitCardValidationResult {
  errors: string[];
  warnings: string[];
  data?: ParsedAiAdmitCard;
}

/** Parses + validates the AI-returned JSON against the schema `aiPrompts.ts`'s Admit Card extraction prompt requests. */
export function validateAiAdmitCardImport(rawText: string): AdmitCardValidationResult {
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

  const requiredStrings: (keyof ParsedAiAdmitCard)[] = [
    'title', 'organizationName', 'categoryName', 'focusKeyword',
    'shortDescription', 'description', 'metaTitle', 'metaDescription',
  ];
  for (const field of requiredStrings) {
    const v = obj[field];
    if (typeof v !== 'string' || v.trim() === '') {
      errors.push(`Missing or empty required field: "${field}"`);
    }
  }

  if (typeof obj.admitCardReleaseDate !== 'string' || !DATE_RE.test(obj.admitCardReleaseDate)) {
    errors.push('"admitCardReleaseDate" must be in YYYY-MM-DD format.');
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

  const data: ParsedAiAdmitCard = {
    title: obj.title as string,
    slug: typeof obj.slug === 'string' ? obj.slug : null,
    examName: typeof obj.examName === 'string' ? obj.examName : null,
    organizationName: String(obj.organizationName ?? ''),
    categoryName: String(obj.categoryName ?? ''),
    focusKeyword: String(obj.focusKeyword ?? ''),
    secondaryKeywords: toStringArray(obj.secondaryKeywords),
    lsiKeywords: toStringArray(obj.lsiKeywords),
    admitCardReleaseDate: obj.admitCardReleaseDate as string,
    examDate: typeof obj.examDate === 'string' ? obj.examDate : null,
    downloadLink: typeof obj.downloadLink === 'string' ? obj.downloadLink : null,
    postName: typeof obj.postName === 'string' ? obj.postName : null,
    year: obj.year !== undefined && obj.year !== null ? toNumber(obj.year) : null,
    location: typeof obj.location === 'string' ? obj.location : null,
    shortDescription,
    description: String(obj.description ?? ''),
    howToDownload: typeof obj.howToDownload === 'string' ? obj.howToDownload : null,
    instructionsForExam: toStringArray(obj.instructionsForExam),
    documentsToCarryForExam: toStringArray(obj.documentsToCarryForExam),
    faqSchema: Array.isArray(obj.faqSchema)
      ? obj.faqSchema.map((f) => {
          const item = f as Record<string, unknown>;
          return { question: String(item.question ?? ''), answer: String(item.answer ?? '') };
        })
      : [],
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
