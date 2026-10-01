const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-24" (or an ISO timestamp) → "24 Oct 2026". Anything else (e.g. "Dec 2026 (tentative)") passes through. */
export function fmtDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-10-24" → "24 Oct" — for dense lists where the year is obvious. */
export function fmtShortDate(value?: string | null): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : (value ?? '');
}

/** Whole days from today (local) until an ISO date; negative once it has passed, null if unparsable. */
export function daysUntil(value?: string | null): number | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Whole days since an ISO date (0 = today). */
export function daysSince(value?: string | null): number | null {
  const d = daysUntil(value);
  return d === null ? null : -d;
}
