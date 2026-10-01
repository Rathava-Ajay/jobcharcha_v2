export interface VacancyBreakdownTable {
  columns: string[];
  rows: Record<string, string | number>[];
}

const PREFERRED_COLUMN_ORDER = ['Post Name', 'Post', 'General', 'UR', 'EWS', 'OBC', 'SC', 'ST', 'PwBD', 'PwD (OH)', 'PwD (VH)', 'Ex-Servicemen', 'Total'];

/** AI-imported rows are serialized from C# DTOs (PostName/Ur/Ews/…) or camelCase keys
 * (general/pwdOh/exServicemen); map them onto the labels a reader expects. */
const COLUMN_LABELS: Record<string, string> = {
  postname: 'Post Name', post: 'Post', general: 'General', ur: 'UR', gen: 'General', ews: 'EWS', obc: 'OBC',
  sc: 'SC', st: 'ST', pwd: 'PwBD', pwbd: 'PwBD', pwdoh: 'PwD (OH)', pwdvh: 'PwD (VH)',
  exservicemen: 'Ex-Servicemen', esm: 'Ex-Servicemen', total: 'Total',
};

const labelFor = (key: string) => COLUMN_LABELS[key.replace(/[^a-z]/gi, '').toLowerCase()] ?? key;

function sortColumns(columns: string[]): string[] {
  return [...columns].sort((a, b) => {
    const ia = PREFERRED_COLUMN_ORDER.indexOf(a);
    const ib = PREFERRED_COLUMN_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

const isBlank = (v: unknown) => v === null || v === undefined || v === '' || v === 0 || v === '0';

export function parseVacancyBreakdown(json?: string | null): VacancyBreakdownTable | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const rows = raw.map((row: Record<string, string | number>) => {
      const out: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(row)) out[labelFor(k)] = v;
      return out;
    });
    const columnSet = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((k) => columnSet.add(k)));
    // The AI prompt fills 0 for categories the notification doesn't break out; a column of
    // zeros is noise, so keep only text columns, Total, and categories with a real count.
    const columns = sortColumns([...columnSet]).filter((c) =>
      c === 'Total' || rows.some((r) => typeof r[c] === 'string' ? r[c] !== '' : !isBlank(r[c])));
    const hasData = columns.some((c) => c !== 'Post Name' && c !== 'Post' && rows.some((r) => !isBlank(r[c])));
    if (!hasData) return null;
    return { columns, rows };
  } catch {
    return null;
  }
}

export function parseCategoryWiseVacancy(json?: string | null): { label: string; value: string | number }[] | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null;
    const entries = (Object.entries(obj) as [string, string | number][])
      .map(([k, v]) => [labelFor(k), v] as [string, string | number])
      .filter(([, v]) => !isBlank(v));
    if (entries.length === 0 || entries.every(([label]) => label === 'Total')) return null;
    return entries.sort(([a], [b]) => {
      const ia = PREFERRED_COLUMN_ORDER.indexOf(a);
      const ib = PREFERRED_COLUMN_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }).map(([label, value]) => ({ label, value }));
  } catch {
    return null;
  }
}

export function parseSelectionSteps(json?: string | null): string[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((v) => String(v));
  } catch {
    return null;
  }
}

export function parseFeeTable(json?: string | null): { category: string; fee: string }[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((row: Record<string, unknown>) => ({
      category: String(row.Category ?? row.category ?? ''),
      fee: String(row.Fee ?? row.fee ?? ''),
    }));
  } catch {
    return null;
  }
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function parseFaqSchema(json?: string | null): FaqEntry[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr
      .map((row: Record<string, unknown>) => ({
        question: String(row.Question ?? row.question ?? ''),
        answer: String(row.Answer ?? row.answer ?? ''),
      }))
      .filter((f) => f.question && f.answer);
  } catch {
    return null;
  }
}

export interface ExamPatternRow {
  paper: string;
  subject?: string;
  questions?: number | string;
  marks?: number | string;
  duration?: string;
  type?: string;
}

export function parseExamPattern(json?: string | null): ExamPatternRow[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((row: Record<string, unknown>) => ({
      paper: String(row.Paper ?? row.paper ?? ''),
      subject: (row.Subject ?? row.subject) as string | undefined,
      questions: (row.Questions ?? row.questions) as number | string | undefined,
      marks: (row.Marks ?? row.marks) as number | string | undefined,
      duration: (row.Duration ?? row.duration) as string | undefined,
      type: (row.Type ?? row.type) as string | undefined,
    }));
  } catch {
    return null;
  }
}

export interface SalaryBreakdownData {
  basicPay?: string;
  da?: string;
  hra?: string;
  grossSalary?: string;
  netSalary?: string;
}

export function parseSalaryBreakdown(json?: string | null): SalaryBreakdownData | null {
  if (!json) return null;
  try {
    const row = JSON.parse(json);
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return null;
    const data: SalaryBreakdownData = {
      basicPay: row.BasicPay ?? row.basicPay,
      da: row.Da ?? row.da ?? row.DA,
      hra: row.Hra ?? row.hra ?? row.HRA,
      grossSalary: row.GrossSalary ?? row.grossSalary,
      netSalary: row.NetSalary ?? row.netSalary,
    };
    return Object.values(data).some(Boolean) ? data : null;
  } catch {
    return null;
  }
}

/** Splits highlight/notes blobs (often \r\n or emoji-bulleted) into clean lines. */
export function splitLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Some imported/scraped job records store keyHighlights/importantNotes as raw HTML
 * (e.g. "<ul><li>...</li></ul>") rather than plain bullet-per-line text. Detect that
 * case so callers can render via SafeHtml instead of the plain-line bullet list —
 * otherwise splitLines() treats each HTML fragment as its own "line". */
export function looksLikeHtml(text?: string | null): boolean {
  if (!text) return false;
  return /<\/?[a-z][\s\S]*>/i.test(text);
}
