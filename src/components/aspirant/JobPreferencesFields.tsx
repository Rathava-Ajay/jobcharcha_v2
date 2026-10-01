import React from 'react';
import { JobPreferences } from '../../api/aspirantProfile';
import { TagInput } from './TagInput';
import { fieldClass, labelClass } from './SectionCard';
import { Select } from '../ui/Select';

interface Props {
  value: JobPreferences;
  onChange: (next: JobPreferences) => void;
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Freelance'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

export const JobPreferencesFields: React.FC<Props> = ({ value, onChange }) => {
  const set = <K extends keyof JobPreferences>(k: K, v: JobPreferences[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Preferred job type *</label>
          <Select className={fieldClass} value={value.preferredJobType || ''} onChange={(e) => set('preferredJobType', e.target.value)}>
            <option value="">Select…</option>
            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div>
          <label className={labelClass}>Work mode *</label>
          <Select className={fieldClass} value={value.workMode || ''} onChange={(e) => set('workMode', e.target.value)}>
            <option value="">Select…</option>
            {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <label className={labelClass}>Expected salary (monthly)</label>
          <input className={fieldClass} value={value.expectedSalary || ''} onChange={(e) => set('expectedSalary', e.target.value)} placeholder="e.g. 35000" />
        </div>
        <div>
          <label className={labelClass}>Preferred industry</label>
          <input className={fieldClass} value={value.preferredIndustry || ''} onChange={(e) => set('preferredIndustry', e.target.value)} placeholder="e.g. Banking, IT, Manufacturing" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Preferred locations</label>
        <TagInput values={value.preferredLocations} onChange={(next) => set('preferredLocations', next)} placeholder="e.g. Ahmedabad, Vadodara, Remote" />
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
        <input type="checkbox" checked={value.willingToRelocate} onChange={(e) => set('willingToRelocate', e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        I'm willing to relocate
      </label>
    </div>
  );
};
