import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WorkExperienceEntry } from '../../api/aspirantProfile';
import { fieldClass, labelClass } from './SectionCard';

interface Props {
  value: WorkExperienceEntry[];
  onChange: (next: WorkExperienceEntry[]) => void;
}

const blank = (): WorkExperienceEntry => ({
  isCurrent: false, company: '', jobTitle: '', startDate: '', endDate: '', description: '',
});

export const WorkExperienceFields: React.FC<Props> = ({ value, onChange }) => {
  const rows = value;
  const update = (i: number, patch: Partial<WorkExperienceEntry>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500 font-medium">Optional — leave empty if you're a fresher.</p>
      {rows.map((row, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Experience {i + 1}</span>
            <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600 cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Job title</label>
              <input className={fieldClass} value={row.jobTitle || ''} onChange={(e) => update(i, { jobTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={fieldClass} value={row.company || ''} onChange={(e) => update(i, { company: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Start (YYYY-MM)</label>
              <input className={fieldClass} value={row.startDate || ''} onChange={(e) => update(i, { startDate: e.target.value })} placeholder="2023-06" />
            </div>
            <div>
              <label className={labelClass}>End (YYYY-MM)</label>
              <input
                className={`${fieldClass} ${row.isCurrent ? 'opacity-50' : ''}`}
                value={row.isCurrent ? '' : row.endDate || ''}
                onChange={(e) => update(i, { endDate: e.target.value })}
                placeholder={row.isCurrent ? 'Present' : '2024-08'}
                disabled={row.isCurrent}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={row.isCurrent} onChange={(e) => update(i, { isCurrent: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            I currently work here
          </label>
          <div>
            <label className={labelClass}>What you did</label>
            <textarea rows={2} className={fieldClass} value={row.description || ''} onChange={(e) => update(i, { description: e.target.value })} />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, blank()])}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add work experience
      </button>
    </div>
  );
};
