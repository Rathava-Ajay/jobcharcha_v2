import { useBodyClass } from '../../hooks/useBodyClass';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { SafeHtml } from '../SafeHtml';
import { Card, OrgAvatar, cx } from './kit';

/**
 * Shared chrome for content detail pages (results, admit cards, schemes, news, old papers):
 * a white summary band with the key facts, readable section cards, and a sticky side panel.
 */

export const DetailHeader: React.FC<{
  back: { to: string; label: string };
  org?: string;
  logo?: string | null;
  pills?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  facts?: { label: string; value: React.ReactNode; icon?: React.ElementType; alert?: boolean }[];
  actions?: React.ReactNode;
}> = ({ back, org, logo, pills, title, subtitle, facts, actions }) => (
  <section className="bg-white border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-5 sm:pb-6">
      <Link to={back.to} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> {back.label}
      </Link>
      <div className="flex gap-3.5 sm:gap-4 items-start mt-3">
        {org && <OrgAvatar name={org} logo={logo} size="lg" className="max-sm:w-11 max-sm:h-11 max-sm:text-xs" />}
        <div className="flex-1 min-w-0">
          {pills && <div className="flex flex-wrap gap-1.5 mb-2">{pills}</div>}
          <h1 className="text-[21px] sm:text-[28px] font-extrabold leading-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-[13px] sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="hidden md:flex gap-2 shrink-0">{actions}</div>}
      </div>
      {facts && facts.length > 0 && (
        <div className={cx('grid mt-4 sm:mt-5 rounded-2xl border border-slate-200 overflow-hidden bg-slate-200 gap-px', facts.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : facts.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2')}>
          {facts.map((f) => (
            <div key={f.label} className="bg-white px-3.5 py-3 min-w-0">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">{f.icon && <f.icon className="w-3.5 h-3.5" />}{f.label}</span>
              <span className={cx('block mt-0.5 font-bold text-[15px] leading-snug break-words', f.alert ? 'text-red-700' : 'text-slate-900')}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

export const DetailSection: React.FC<{
  icon: React.ElementType;
  title: string;
  html?: string | null;
  children?: React.ReactNode;
  id?: string;
  tone?: 'default' | 'warning';
  flush?: boolean;
}> = ({ icon: Icon, title, html, children, id, tone = 'default', flush }) => {
  if (!html && !children) return null;
  return (
    <Card id={id} className={cx('scroll-mt-24', flush ? 'py-4 sm:py-5' : 'p-4 sm:p-5', tone === 'warning' && 'bg-amber-50/70 border-amber-200')}>
      <h2 className={cx('flex items-center gap-2 text-[16px] sm:text-[17px] font-extrabold mb-3', tone === 'warning' ? 'text-amber-900' : 'text-slate-900', flush && 'px-4 sm:px-5')}>
        <Icon className={cx('w-5 h-5', tone === 'warning' ? 'text-amber-700' : 'text-blue-700')} /> {title}
      </h2>
      <div className="text-[14.5px] leading-relaxed text-slate-700">
        {html ? <SafeHtml html={html} /> : children}
      </div>
    </Card>
  );
};

/** Two-column body: main content + sticky aside on desktop; aside stacks after content on phones. */
export const DetailBody: React.FC<{ aside?: React.ReactNode; children: React.ReactNode }> = ({ aside, children }) => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 grid lg:grid-cols-[1fr_330px] gap-6 items-start">
    <div className="space-y-4 min-w-0">{children}</div>
    {aside && <aside className="space-y-4 lg:sticky lg:top-20">{aside}</aside>}
  </div>
);

export const DataGrid: React.FC<{ columns: string[]; rows: React.ReactNode[][]; emphasise?: string }> = ({ columns, rows, emphasise }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[13.5px] border-collapse">
      <thead>
        <tr>{columns.map((c, i) => (
          <th key={c} className={cx('text-left bg-slate-50 text-[11.5px] uppercase tracking-wide font-bold text-slate-500 py-2.5 px-3 whitespace-nowrap border-b border-slate-100', i === 0 && 'pl-4 sm:pl-5')}>{c}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            {r.map((cell, j) => (
              <td key={j} className={cx('py-2.5 px-3 whitespace-nowrap', j === 0 && 'pl-4 sm:pl-5', columns[j] === emphasise ? 'font-bold text-emerald-700' : 'text-slate-800')}>{cell ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FaqList: React.FC<{ items: { question: string; answer: string }[] }> = ({ items }) => (
  <div className="divide-y divide-slate-100 -my-2">
    {items.map((f, i) => (
      <details key={i} className="group py-3" open={i === 0}>
        <summary className="flex items-start justify-between gap-3 font-bold text-slate-900 cursor-pointer list-none">
          {f.question}
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform group-open:rotate-90" />
        </summary>
        <p className="text-slate-600 mt-1.5 text-[14px]">{f.answer}</p>
      </details>
    ))}
  </div>
);

/** Fixed bottom bar for the page's one primary action on phones. */
export const MobileCta: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Room for the bar is reserved at the end of <body> (after the footer), not mid-page.
  useBodyClass('has-mobile-cta');
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
      {children}
    </div>
  );
};

export const DetailLoading: React.FC = () => (
  <div className="flex-1 flex items-center justify-center py-24">
    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" role="status" aria-label="Loading" />
  </div>
);

export const DetailNotFound: React.FC<{ title: string; back: { to: string; label: string } }> = ({ title, back }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
    <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
    <p className="text-sm text-slate-500">It may have been removed or the link is incorrect.</p>
    <Link to={back.to} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2.5 text-sm">{back.label}</Link>
  </div>
);
