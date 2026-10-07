import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}

/** Small chip/tag input — type + Enter (or comma) to add, × to remove. Used for skills & preferred locations. */
export const TagInput: React.FC<Props> = ({ values, onChange, placeholder = 'Type and press Enter', max = 40 }) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    for (const p of parts) {
      if (next.length >= max) break;
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-2 py-2 flex flex-wrap gap-1.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-800 text-[12.5px] font-bold px-2.5 py-1 rounded-full">
          {v}
          <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="hover:text-blue-950 cursor-pointer" aria-label={`Remove ${v}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && draft === '' && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[8rem] bg-transparent text-xs text-slate-800 px-1.5 py-1 focus:outline-none font-medium"
      />
    </div>
  );
};
