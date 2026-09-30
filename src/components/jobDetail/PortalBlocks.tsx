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
  /** Drop the body padding so a full-bleed table can sit flush against the border. */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, tone = 'emerald', flush = false, className = '', children }) => (
  <section className={`bg-white border-2 ${BORDER[tone]} ${className}`}>
    <h2 className={`${TITLE_BAR[tone]} text-white text-center font-heading font-extrabold text-sm sm:text-base tracking-wide px-3 py-2`}>
      {title}
    </h2>
    <div className={`${flush ? '' : 'p-4'} text-[13px] sm:text-sm text-slate-700 leading-relaxed`}>{children}</div>
  </section>
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
        <tr key={r.label} className="even:bg-slate-50">
          <th scope="row" className="w-2/5 sm:w-1/3 text-left align-top font-bold text-slate-800 border border-slate-300 px-3 py-2">
            {r.label}
          </th>
          <td className={`align-top border border-slate-300 px-3 py-2 break-words ${r.highlight ? 'font-extrabold text-red-700' : 'font-semibold text-slate-700'}`}>
            {r.value}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** A plain bordered data table with a grey header row. */
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
            <th key={c} className="text-left font-bold text-slate-800 border border-slate-300 px-3 py-2 whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="even:bg-slate-50">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`border border-slate-300 px-3 py-2 ${j === emphasiseColumn ? 'font-extrabold text-emerald-800' : 'font-semibold text-slate-700'}`}
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
          <th scope="row" className="text-left font-bold text-slate-800 border border-slate-300 px-3 py-2.5">{l.label}</th>
          <td className="w-2/5 sm:w-1/3 text-center border border-slate-300 px-3 py-2.5">
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
