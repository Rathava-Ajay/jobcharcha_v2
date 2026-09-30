import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, SearchX } from 'lucide-react';
import { daysUntil } from '../../utils/dates';

/**
 * Shared building blocks for the public site redesign: calm white surfaces, one emerald accent,
 * red/amber reserved for deadlines. Pages compose these instead of hand-rolling cards so the
 * whole site reads as one product.
 */

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---- Organisation avatar -----------------------------------------------------------------------

const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-orange-100 text-orange-800',
  'bg-violet-100 text-violet-800', 'bg-teal-100 text-teal-800', 'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800', 'bg-sky-100 text-sky-800',
];

/** Initials from an org name: "Gujarat Public Service Commission (GPSC)" → "GPSC"-style short codes. */
export function orgInitials(name: string): string {
  const paren = /\(([A-Z0-9]{2,5})\)/.exec(name);
  if (paren) return paren[1].slice(0, 4);
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !/^(of|and|the|&|for)$/i.test(w));
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

export const OrgAvatar: React.FC<{ name: string; logo?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ name, logo, size = 'md', className }) => {
  const dim = size === 'sm' ? 'w-9 h-9 text-[11px] rounded-lg' : size === 'lg' ? 'w-14 h-14 text-base rounded-2xl' : 'w-11 h-11 text-xs rounded-xl';
  if (logo) {
    return <img src={logo} alt="" loading="lazy" className={cx(dim, 'object-contain bg-white border border-slate-200 p-1 shrink-0', className)} />;
  }
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span aria-hidden className={cx(dim, AVATAR_TONES[h % AVATAR_TONES.length], 'grid place-items-center font-extrabold shrink-0 tracking-tight', className)}>
      {orgInitials(name)}
    </span>
  );
};

// ---- Pills -------------------------------------------------------------------------------------

type PillTone = 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'grey' | 'dark';
const PILL: Record<PillTone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  grey: 'bg-slate-100 text-slate-600',
  dark: 'bg-slate-900 text-white',
};

export const Pill: React.FC<{ tone?: PillTone; icon?: React.ElementType; className?: string; children: React.ReactNode }> = ({ tone = 'grey', icon: Icon, className, children }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', PILL[tone], className)}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

/** "3 days left" pill — red within 3 days, amber within 10, grey after, muted once closed. */
export const DeadlinePill: React.FC<{ date?: string | null; className?: string }> = ({ date, className }) => {
  const d = daysUntil(date);
  if (d === null) return null;
  if (d < 0) return <Pill tone="grey" className={className}>Closed</Pill>;
  const text = d === 0 ? 'Last day today' : d === 1 ? 'Ends tomorrow' : `${d} days left`;
  const tone: PillTone = d <= 3 ? 'red' : d <= 10 ? 'amber' : 'grey';
  return <Pill tone={tone} icon={Clock} className={className}>{text}</Pill>;
};

// ---- Section header -----------------------------------------------------------------------------

export const SectionHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: { label: string; to: string };
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cx('flex items-end justify-between gap-3 mb-3', className)}>
    <div className="min-w-0">
      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</h2>
      {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && (
      <Link to={action.to} className="shrink-0 inline-flex items-center gap-0.5 text-[13px] font-bold text-emerald-700 hover:text-emerald-800">
        {action.label} <ChevronRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);

// ---- Page header band ---------------------------------------------------------------------------

export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  crumbs?: { label: string; to?: string }[];
  children?: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ title, subtitle, crumbs, children, aside }) => (
  <section className="bg-white border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-[13px] text-slate-400 mb-1.5">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              {c.to ? <Link to={c.to} className="hover:text-slate-700">{c.label}</Link> : <span className="text-slate-500">{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-[28px] font-extrabold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  </section>
);

// ---- Surfaces -----------------------------------------------------------------------------------

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cx('bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)} {...rest} />
);

export const Chip: React.FC<{
  active?: boolean;
  onClick?: () => void;
  count?: number;
  children: React.ReactNode;
  className?: string;
}> = ({ active, onClick, count, children, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors',
      active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400',
      className,
    )}
  >
    {children}
    {count !== undefined && <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>}
  </button>
);

export const EmptyState: React.FC<{ title: string; body?: string; action?: React.ReactNode }> = ({ title, body, action }) => (
  <div className="text-center py-14 px-6">
    <SearchX className="w-10 h-10 text-slate-300 mx-auto" />
    <p className="font-bold text-slate-800 mt-3">{title}</p>
    {body && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const RowSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3.5 p-4 border-t border-slate-100 first:border-t-0 animate-pulse">
        <div className="w-11 h-11 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3.5 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

/** Primary / secondary buttons as class strings so they work on <Link>, <a> and <button>. */
export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-60',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-60',
  dark: 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-60',
  small: 'px-3 py-1.5 text-[13px] rounded-lg',
};
