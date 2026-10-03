import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { shareAgain, ShareCategory } from '../../api/socialShare';

/** "Skip social posting" — shown wherever an admin can publish one of the five auto-shared categories. */
export const SkipSocialCheckbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; className?: string }> = ({ checked, onChange, className }) => (
  <label className={`flex items-start gap-2.5 min-h-[44px] py-1 cursor-pointer select-none ${className ?? ''}`}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 cursor-pointer" />
    <span className="text-[13px] leading-snug">
      <span className="font-bold text-slate-800">Skip social posting</span>
      <span className="block text-[12px] font-medium text-slate-500">Don't auto-share this one to Telegram, Facebook and Instagram.</span>
    </span>
  </label>
);

/** Manual re-post of a live post to every enabled channel (new entry in the Activity Log). */
export const ShareAgainButton: React.FC<{ category: ShareCategory; entityId: number; className?: string; compact?: boolean }> = ({ category, entityId, className, compact }) => {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    try {
      const { queued } = await shareAgain(category, entityId);
      setNote({ ok: true, text: `Queued ${queued} share${queued === 1 ? '' : 's'} — see Auto-share.` });
    } catch (err) {
      setNote({ ok: false, text: err instanceof ApiError ? err.message : 'Could not queue the share.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={run} disabled={busy}
        className={className ?? 'bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60'}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
        {compact ? 'Share' : 'Share again'}
      </button>
      {note && <span className={`text-[11.5px] font-semibold ${note.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{note.text}</span>}
    </span>
  );
};
