import React, { useEffect, useState } from 'react';
import { Share2, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { fetchPostPreview, shareAgain, ShareCategory } from '../../api/socialShare';

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

const rowButton = 'bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60';

/** Shows the share image a published post gets, straight away: no social credentials or background worker needed. */
const PreviewDialog: React.FC<{ category: ShareCategory; entityId: number; onClose: () => void }> = ({ category, entityId, onClose }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetchPostPreview(category, entityId)
      .then((u) => { if (cancelled) URL.revokeObjectURL(u); else { revoked = u; setUrl(u); } })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not reach the API. Is it running, and does VITE_API_BASE_URL point at it?'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
  }, [category, entityId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Share image preview" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-auto p-4 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">Share image preview</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg grid place-items-center text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="aspect-square w-full rounded-xl bg-slate-100 overflow-hidden grid place-items-center">
          {busy && <Loader2 className="w-7 h-7 animate-spin text-slate-400" />}
          {!busy && url && <img src={url} alt="Share image preview" className="w-full h-full object-contain" />}
          {!busy && error && <p className="p-4 text-center text-[13px] font-semibold text-rose-600">{error}</p>}
        </div>
        <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
          The poster exactly as it will be shared.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-slate-900 text-white font-bold text-[13px] cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
};

/** Per-post auto-share actions for the admin list rows: preview the share image, and manually re-share. */
export const ShareAgainButton: React.FC<{ category: ShareCategory; entityId: number; className?: string; compact?: boolean }> = ({ category, entityId, className, compact }) => {
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
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
      <span className="inline-flex items-center gap-2">
        <button type="button" onClick={() => setPreviewing(true)} className={className ?? rowButton} title="See the share image for this post">
          <ImageIcon className="w-3.5 h-3.5" /> {compact ? 'Image' : 'Preview image'}
        </button>
        <button type="button" onClick={run} disabled={busy} className={className ?? rowButton}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
          {compact ? 'Share' : 'Share again'}
        </button>
      </span>
      {note && <span className={`text-[11.5px] font-semibold ${note.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{note.text}</span>}
      {previewing && <PreviewDialog category={category} entityId={entityId} onClose={() => setPreviewing(false)} />}
    </span>
  );
};
