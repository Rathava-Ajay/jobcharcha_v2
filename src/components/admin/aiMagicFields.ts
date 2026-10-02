import { ContentCategory } from '../../api/contentDrafts';

export type FieldKind = 'text' | 'textarea' | 'date' | 'url' | 'number';

export interface DraftField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Short hint shown under the input. */
  hint?: string;
}

/**
 * The fields an admin is most likely to correct on an AI draft, per category. Anything not listed here (SEO keyword
 * lists, FAQ schema, cut-off tables ...) is still carried through untouched and can be changed via "Edit JSON".
 * Keys mirror each category's create-request JSON exactly.
 */
export const DRAFT_FIELDS: Record<ContentCategory, DraftField[]> = {
  result: [
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'examName', label: 'Exam name', kind: 'text' },
    { key: 'organizationName', label: 'Organization', kind: 'text', required: true },
    { key: 'resultDate', label: 'Result date', kind: 'date', required: true },
    { key: 'examDate', label: 'Exam date', kind: 'date' },
    { key: 'resultLink', label: 'Official result page', kind: 'url' },
    { key: 'resultPdf', label: 'Official result PDF', kind: 'url' },
    { key: 'cutOffMarks', label: 'Cut-off summary', kind: 'text' },
    { key: 'selectedCandidates', label: 'Selected candidates', kind: 'text' },
    { key: 'shortDescription', label: 'Short description', kind: 'textarea', required: true, hint: 'Max 400 characters. The first sentence should stand alone as a search snippet.' },
    { key: 'description', label: 'Full description', kind: 'textarea', required: true },
    { key: 'metaTitle', label: 'SEO title', kind: 'text', required: true, hint: 'Max 60 characters.' },
    { key: 'metaDescription', label: 'SEO description', kind: 'textarea', required: true, hint: 'Max 155 characters.' },
  ],
  admitcard: [
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'examName', label: 'Exam name', kind: 'text' },
    { key: 'organizationName', label: 'Organization', kind: 'text', required: true },
    { key: 'postName', label: 'Post name', kind: 'text' },
    { key: 'admitCardReleaseDate', label: 'Release date', kind: 'date', required: true },
    { key: 'examDate', label: 'Exam date', kind: 'date' },
    { key: 'downloadLink', label: 'Official download page', kind: 'url' },
    { key: 'year', label: 'Year', kind: 'number' },
    { key: 'shortDescription', label: 'Short description', kind: 'textarea', required: true, hint: 'Max 400 characters.' },
    { key: 'description', label: 'Full description', kind: 'textarea', required: true },
    { key: 'howToDownload', label: 'How to download', kind: 'textarea' },
    { key: 'metaTitle', label: 'SEO title', kind: 'text', required: true, hint: 'Max 60 characters.' },
    { key: 'metaDescription', label: 'SEO description', kind: 'textarea', required: true, hint: 'Max 155 characters.' },
  ],
  oldpaper: [
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'examName', label: 'Exam name', kind: 'text', required: true },
    { key: 'year', label: 'Year', kind: 'number', required: true },
    { key: 'subject', label: 'Subject', kind: 'text' },
    { key: 'paperType', label: 'Paper type', kind: 'text', hint: 'e.g. Prelims, Mains, Answer Key' },
    { key: 'paperPdfLink', label: 'Question paper PDF', kind: 'url', required: true },
    { key: 'solutionPdfLink', label: 'Answer key / solution PDF', kind: 'url', hint: 'Must be a different file from the question paper.' },
    { key: 'totalQuestions', label: 'Total questions', kind: 'number' },
    { key: 'totalMarks', label: 'Total marks', kind: 'number' },
    { key: 'duration', label: 'Duration (minutes)', kind: 'number' },
    { key: 'description', label: 'Description', kind: 'textarea' },
  ],
  news: [
    { key: 'title', label: 'Headline', kind: 'text', required: true },
    { key: 'summary', label: 'Summary', kind: 'textarea', required: true },
    { key: 'content', label: 'Article (HTML)', kind: 'textarea', required: true, hint: 'Simple HTML: <p>, <h2>, <ul><li>, <strong>.' },
    { key: 'source', label: 'Source name', kind: 'text' },
    { key: 'sourceLink', label: 'Source link', kind: 'url' },
    { key: 'publishedDate', label: 'Published date', kind: 'date' },
    { key: 'metaTitle', label: 'SEO title', kind: 'text', hint: 'Max 60 characters.' },
    { key: 'metaDescription', label: 'SEO description', kind: 'textarea', hint: 'Max 155 characters.' },
  ],
  scheme: [
    { key: 'title', label: 'Scheme name', kind: 'text', required: true },
    { key: 'ministry', label: 'Ministry / department', kind: 'text', required: true },
    { key: 'category', label: 'Scheme category', kind: 'text', required: true, hint: 'e.g. Education, Employment, Skill Development' },
    { key: 'eligibility', label: 'Eligibility', kind: 'textarea', required: true },
    { key: 'benefits', label: 'Benefits', kind: 'textarea', required: true },
    { key: 'description', label: 'Description (HTML)', kind: 'textarea' },
    { key: 'applyLink', label: 'Official apply / info page', kind: 'url', required: true },
    { key: 'officialNotificationUrl', label: 'Official notification PDF', kind: 'url' },
  ],
  study: [
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'materialType', label: 'Material type', kind: 'text', required: true, hint: 'Notes, EBook, Video or Syllabus' },
    { key: 'description', label: 'Notes', kind: 'textarea', required: true },
    { key: 'filePath', label: 'Primary source link', kind: 'url', required: true },
  ],
};

/**
 * Turns what an input holds into the JSON value to store: blanks become null, numbers become numbers.
 * Text is deliberately NOT trimmed here: this runs on every keystroke, and trimming would swallow each space as
 * it is typed. Values are trimmed once, when the draft is approved (see trimStrings).
 */
export function parseFieldValue(kind: FieldKind, raw: string): string | number | null {
  if (raw.trim() === '') return null;
  if (kind === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

/** Trims every top-level string in a payload; applied right before publishing an edited draft. */
export function trimStrings(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
}

/** What to show in an input for a stored JSON value (dates trimmed to YYYY-MM-DD for <input type="date">). */
export function displayFieldValue(kind: FieldKind, value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return kind === 'date' ? s.slice(0, 10) : s;
}
