import React from 'react';

/**
 * Building blocks for the classic govt-portal style job detail pages: bordered
 * boxes with a solid title bar, key/value tables and "Click Here" link tables.
 * Shared by JobDetailsPage (govt) and PrivateJobDetailsPage (employer jobs).
 */

export type PortalTone = 'emerald' | 'indigo' | 'red';

const TITLE_BAR: Record<PortalTone, string> = {
  emerald: 'bg-emerald-700',
  indigo: 'bg-indigo-700',
  red: 'bg-red-700',
};

const BORDER: Record<PortalTone, string> = {
  emerald: 'border-emerald-700/40',
  indigo: 'border-indigo-700/40',
  red: 'border-red-700/40',
};

export const PortalBox: React.FC<{
  title: string;
  tone?: PortalTone;
  /** Anchor id for the quick-jump section nav. */
  id?: string;
  /** Drop the body padding so a full-bleed table can sit flush against the border. */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, tone = 'emerald', id, flush = false, className = '', children }) => (
  <section id={id} className={`bg-white border sm:border-2 ${BORDER[tone]} scroll-mt-32 min-w-0 ${className}`}>
    <h2 className={`${TITLE_BAR[tone]} text-white text-center font-heading font-extrabold text-[13px] sm:text-base tracking-wide px-3 py-1.5 sm:py-2`}>
      {title}
    </h2>
    <div className={`${flush ? '' : 'p-3 sm:p-4'} text-[13px] sm:text-sm text-slate-700 leading-relaxed`}>{children}</div>
  </section>
);

export interface StatTile {
  label: string;
  value: React.ReactNode;
  /** Small line under the value, e.g. "12 days left". */
  note?: React.ReactNode;
  tone?: 'default' | 'alert' | 'muted';
}

/** Headline numbers under the title block: 2 columns on phones, 4 on wider screens. */
export const StatsStrip: React.FC<{ stats: StatTile[] }> = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-300 gap-px border border-slate-300">
    {stats.map((s) => (
      <div key={s.label} className="bg-white px-3 py-2.5 text-center min-w-0">
        <span className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{s.label}</span>
        <span className={`block font-heading font-black text-base sm:text-xl leading-tight break-words ${s.tone === 'alert' ? 'text-red-700' : 'text-slate-900'}`}>
          {s.value}
        </span>
        {s.note && (
          <span className={`block text-[11px] font-bold mt-0.5 ${s.tone === 'alert' ? 'text-red-600' : s.tone === 'muted' ? 'text-slate-400' : 'text-emerald-700'}`}>
            {s.note}
          </span>
        )}
      </div>
    ))}
  </div>
);

/** Horizontally scrolling "jump to section" chips; sticks under the navbar. */
export const SectionNav: React.FC<{ items: { id: string; label: string }[] }> = ({ items }) => (
  <nav aria-label="Page sections" className="sticky top-16 z-20 -mx-3 sm:mx-0 bg-slate-100/95 backdrop-blur py-2 px-3 sm:px-0">
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className="shrink-0 bg-white border border-slate-300 hover:border-emerald-700 hover:text-emerald-800 text-slate-700 text-xs font-bold px-3 py-1.5"
        >
          {it.label}
        </a>
      ))}
    </div>
  </nav>
);

/** Fixed bottom action bar for phones — primary CTA always in thumb reach. Hidden from sm up. */
export const MobileActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t-2 border-slate-300 px-3 py-2 flex gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    {children}
  </div>
);

export interface KeyValueRow {
  label: string;
  value: React.ReactNode;
  /** Emphasise the value, e.g. the last date to apply. */
  highlight?: boolean;
}

export const KeyValueTable: React.FC<{ rows: KeyValueRow[] }> = ({ rows }) => (
  <table className="w-full border-collapse text-[13px] sm:text-sm">
    <tbody>
      {rows.map((r) => (
        <tr key={r.label}>
          <th scope="row" className="w-[38%] sm:w-1/3 text-left align-top font-bold text-slate-800 bg-slate-50 border border-slate-300 px-2.5 sm:px-3 py-2">
            {r.label}
          </th>
          <td className={`align-top border border-slate-300 px-2.5 sm:px-3 py-2 break-words ${r.highlight ? 'font-extrabold text-red-700' : 'font-semibold text-slate-700'}`}>
            {r.value}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** A plain bordered data table with a grey header row. Scrolls sideways on narrow screens;
 * only the first column may wrap so numbers stay on one line. */
export const DataTable: React.FC<{
  columns: string[];
  rows: React.ReactNode[][];
  /** Column index rendered in bold emerald (e.g. a "Total" column). */
  emphasiseColumn?: number;
}> = ({ columns, rows, emphasiseColumn }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] sm:text-sm">
      <thead>
        <tr className="bg-slate-100">
          {columns.map((c) => (
            <th key={c} className="text-left font-bold text-slate-800 border border-slate-300 px-2.5 sm:px-3 py-2 whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="even:bg-slate-50">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`border border-slate-300 px-2.5 sm:px-3 py-2 ${j === 0 ? 'min-w-[9rem]' : 'whitespace-nowrap'} ${j === emphasiseColumn ? 'font-extrabold text-emerald-800' : 'font-semibold text-slate-700'}`}
              >
                {cell ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Bulleted list in the portal style: square markers, tight rows. */
export const PortalList: React.FC<{ items: React.ReactNode[]; highlightIndex?: (i: number) => boolean }> = ({ items, highlightIndex }) => (
  <ul className="space-y-1.5">
    {items.map((item, i) => (
      <li key={i} className={`flex items-start gap-2 ${highlightIndex?.(i) ? 'font-extrabold text-red-700' : 'font-semibold'}`}>
        <span className="mt-[0.45em] w-1.5 h-1.5 bg-current shrink-0" aria-hidden />
        <span className="min-w-0 break-words">{item}</span>
      </li>
    ))}
  </ul>
);

export interface PortalLink {
  label: string;
  href: string;
  /** Link text in the right column; defaults to "Click Here". */
  cta?: string;
}

/** The classic "Some Useful Important Links" table: label on the left, Click Here on the right. */
export const LinksTable: React.FC<{ links: PortalLink[] }> = ({ links }) => (
  <table className="w-full border-collapse text-[13px] sm:text-sm">
    <tbody>
      {links.map((l) => (
        <tr key={l.label + l.href} className="even:bg-slate-50">
          <th scope="row" className="text-left font-bold text-slate-800 border border-slate-300 px-2.5 sm:px-3 py-2.5">{l.label}</th>
          <td className="w-[34%] sm:w-1/3 text-center border border-slate-300 px-2 sm:px-3 py-2.5">
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-blue-700 hover:text-red-700 underline underline-offset-2"
            >
              {l.cta ?? 'Click Here'}
            </a>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-24" → "24 Oct 2026". Anything that isn't an ISO date (e.g. "Dec 2026 (tentative)") passes through. */
export function fmtPortalDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
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

export function deadlineNote(value?: string | null): { note: string; tone: 'default' | 'alert' | 'muted' } | null {
  const d = daysUntil(value);
  if (d === null) return null;
  if (d < 0) return { note: 'Closed', tone: 'muted' };
  if (d === 0) return { note: 'Last day today', tone: 'alert' };
  return { note: `${d} day${d === 1 ? '' : 's'} left`, tone: d <= 7 ? 'alert' : 'default' };
}
