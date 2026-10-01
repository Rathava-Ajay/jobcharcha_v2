import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { CompletionItem } from '../../api/aspirantProfile';

interface Props {
  score: number;
  checklist: CompletionItem[];
  onJump?: (key: string) => void;
}

/** Completion ring + the items still missing (each jumps to its section when `onJump` is set). */
export const ProfileCompletionMeter: React.FC<Props> = ({ score, checklist, onJump }) => {
  const missing = checklist.filter((c) => !c.done);
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';
  const done = checklist.length - missing.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="relative w-[72px] h-[72px] rounded-full grid place-items-center shrink-0" style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #eef2f7 0)` }} role="img" aria-label={`Profile ${pct}% complete`}>
          <span className="w-[56px] h-[56px] rounded-full bg-white grid place-items-center text-[17px] font-black text-slate-900">{pct}%</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-extrabold text-[15px] text-slate-900">Profile strength</h2>
          <p className="text-[12.5px] text-slate-500">{done} of {checklist.length} done{missing.length ? ' — finish the rest to get discovered' : ''}</p>
        </div>
      </div>

      {missing.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {missing.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onJump?.(c.key)}
                disabled={!onJump}
                className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 enabled:cursor-pointer disabled:cursor-default"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.required ? 'bg-rose-500' : 'bg-slate-300'}`} />
                <span className="flex-1 min-w-0 truncate">{c.label}</span>
                {c.required && <span className="shrink-0 rounded-full bg-rose-50 text-rose-600 text-[10.5px] font-extrabold uppercase px-2 py-0.5">Required</span>}
                {onJump && <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Your profile is complete.
        </p>
      )}
    </div>
  );
};
