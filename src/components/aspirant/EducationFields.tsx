import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EducationEntry } from '../../api/aspirantProfile';
import { fieldClass, labelClass } from './SectionCard';
import { Select } from '../ui/Select';

interface Props {
  value: EducationEntry[];
  onChange: (next: EducationEntry[]) => void;
}

const QUALIFICATIONS = ['10th', '12th', 'Diploma', 'Graduation', 'Post Graduation', 'Doctorate', 'Other'];

const blank = (): EducationEntry => ({
  qualification: '', courseDegree: '', specialization: '', passingYear: '', universityBoard: '', percentageCgpa: '',
});

export const EducationFields: React.FC<Props> = ({ value, onChange }) => {
  const rows = value.length ? value : [blank()];
  const update = (i: number, patch: Partial<EducationEntry>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Qualification {i + 1}</span>
            {rows.length > 1 && (
              <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Level</label>
              <Select className={fieldClass} value={row.qualification || ''} onChange={(e) => update(i, { qualification: e.target.value })}>
                <option value="">Select…</option>
                {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
              </Select>
            </div>
            <div>
              <label className={labelClass}>Course / Degree</label>
              <input className={fieldClass} value={row.courseDegree || ''} onChange={(e) => update(i, { courseDegree: e.target.value })} placeholder="e.g. B.Tech, B.Com" />
            </div>
            <div>
              <label className={labelClass}>Specialization</label>
              <input className={fieldClass} value={row.specialization || ''} onChange={(e) => update(i, { specialization: e.target.value })} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className={labelClass}>Passing year</label>
              <input className={fieldClass} value={row.passingYear || ''} onChange={(e) => update(i, { passingYear: e.target.value })} placeholder="e.g. 2025" />
            </div>
            <div>
              <label className={labelClass}>University / Board</label>
              <input className={fieldClass} value={row.universityBoard || ''} onChange={(e) => update(i, { universityBoard: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Percentage / CGPA</label>
              <input className={fieldClass} value={row.percentageCgpa || ''} onChange={(e) => update(i, { percentageCgpa: e.target.value })} placeholder="e.g. 78% or 8.4" />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, blank()])}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add another qualification
      </button>
    </div>
  );
};
