import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { CompletionItem } from '../../api/aspirantProfile';

interface Props {
  score: number;
  checklist: CompletionItem[];
  onJump?: (key: string) => void;
}

export const ProfileCompletionMeter: React.FC<Props> = ({ score, checklist, onJump }) => {
  const missing = checklist.filter((c) => !c.done);
  const tone = score >= 100 ? 'emerald' : score >= 60 ? 'amber' : 'rose';
  const bar = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-heading font-extrabold text-slate-900">Profile Completion</h2>
        <span className={`text-lg font-black ${tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-rose-600'}`}>
          {score}%
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>

      {missing.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Finish these to get discovered by employers</p>
          <ul className="space-y-1">
            {missing.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => onJump?.(c.key)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  {c.label}
                  {c.required && <span className="text-[9px] font-bold text-rose-500 uppercase">required</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Your profile is complete.
        </p>
      )}
    </div>
  );
};
