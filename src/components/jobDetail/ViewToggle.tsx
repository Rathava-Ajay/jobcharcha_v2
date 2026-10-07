import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Table2, ArrowLeft } from 'lucide-react';
import { cx } from '../ui/kit';

/** Lets each reader pick the layout they find easiest: the modern cards or the classic portal tables. */
export const ViewToggle: React.FC<{ view: 'modern' | 'classic'; onChange: (v: 'modern' | 'classic') => void; backTo?: string; backLabel?: string }> = ({ view, onChange, backTo = '/jobs', backLabel = 'All jobs' }) => (
  <div className="bg-slate-50 border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <div role="tablist" aria-label="Page layout" className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
        <span className="hidden sm:inline text-xs font-semibold text-slate-400 px-2">View:</span>
        {([['modern', 'Modern', LayoutGrid], ['classic', 'Classic portal', Table2]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => onChange(key)}
            className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold cursor-pointer transition-colors',
              view === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
    </div>
  </div>
);
