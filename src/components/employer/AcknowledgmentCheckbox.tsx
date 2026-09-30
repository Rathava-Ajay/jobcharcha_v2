import React from 'react';

interface AcknowledgmentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CLAUSES = [
  'I will not resell or scrape candidate data.',
  "I will not share unlocked candidate contact info with third parties.",
  'I will keep my company and billing details accurate and current.',
  'I understand credits and subscription periods are non-transferable and expire per plan terms.',
  'I will use candidate contact information only for genuine hiring purposes.',
];

export const AcknowledgmentCheckbox: React.FC<AcknowledgmentCheckboxProps> = ({ checked, onChange }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase block">Employer Responsibilities</span>
    <ul className="text-[11px] text-slate-600 font-medium space-y-1 list-disc pl-4">
      {CLAUSES.map((c, i) => <li key={i}>{c}</li>)}
    </ul>
    <label className="flex items-start gap-2 pt-1 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-emerald-600 cursor-pointer"
      />
      <span className="text-[11px] font-bold text-slate-800">I have read and accept these terms.</span>
    </label>
  </div>
);
