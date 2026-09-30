export interface VacancyBreakdownTable {
  columns: string[];
  rows: Record<string, string | number>[];
}

const PREFERRED_COLUMN_ORDER = ['PostName', 'Post', 'General', 'UR', 'EWS', 'OBC', 'SC', 'ST', 'PwBD', 'Total'];

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

export function parseVacancyBreakdown(json?: string | null): VacancyBreakdownTable | null {
  if (!json) return null;
  try {
    const rows = JSON.parse(json);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const columnSet = new Set<string>();
    rows.forEach((row: Record<string, unknown>) => Object.keys(row).forEach((k) => columnSet.add(k)));
    return { columns: sortColumns([...columnSet]), rows };
  } catch {
    return null;
  }
}

export function parseCategoryWiseVacancy(json?: string | null): { label: string; value: string | number }[] | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null;
    const entries = Object.entries(obj) as [string, string | number][];
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
