import React from 'react';
import { Check, X } from 'lucide-react';

const STEPS = [
  { key: 'Applied', label: 'Applied' },
  { key: 'UnderReview', label: 'Under Review' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Interview', label: 'Interview' },
  { key: 'Selected', label: 'Selected' },
];

interface Props {
  status: string;
}

/** Horizontal 5-node hiring pipeline. "Rejected" is shown as a terminal red state instead of the row. */
export const ApplicationStatusStepper: React.FC<Props> = ({ status }) => {
  if (status === 'Rejected') {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
          <X className="w-3 h-3" />
        </span>
        Not selected for this role
      </div>
    );
  }

  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                  done ? 'bg-emerald-600 text-white'
                    : active ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className={`text-[9px] font-bold text-center leading-tight ${active ? 'text-emerald-700' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${i < currentIdx ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
