import React from 'react';
import { SkillsBlock } from '../../api/aspirantProfile';
import { TagInput } from './TagInput';
import { labelClass } from './SectionCard';

interface Props {
  value: SkillsBlock;
  onChange: (next: SkillsBlock) => void;
}

const GROUPS: { key: keyof SkillsBlock; label: string; placeholder: string }[] = [
  { key: 'technical', label: 'Technical skills', placeholder: 'e.g. Python, Accounting, AutoCAD' },
  { key: 'computer', label: 'Computer skills', placeholder: 'e.g. MS Excel, Tally, Photoshop' },
  { key: 'languages', label: 'Languages known', placeholder: 'e.g. English, Hindi, Gujarati' },
  { key: 'other', label: 'Other skills', placeholder: 'e.g. Communication, Team leadership' },
];

export const SkillsFields: React.FC<Props> = ({ value, onChange }) => (
  <div className="space-y-4">
    <p className="text-[11px] text-slate-500 font-medium">Add at least 3 skills across any group. Type and press Enter.</p>
    {GROUPS.map((g) => (
      <div key={g.key}>
        <label className={labelClass}>{g.label}</label>
        <TagInput
          values={value[g.key]}
          onChange={(next) => onChange({ ...value, [g.key]: next })}
          placeholder={g.placeholder}
        />
      </div>
    ))}
  </div>
);
