import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Facebook, Instagram, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, RotateCcw, ExternalLink, Share2,
  ChevronLeft, ChevronRight, ImageIcon, Loader2, Save, ShieldAlert,
} from 'lucide-react';
import { ApiError } from '../../api/client';
import {
  ApiSocialShare, ApiSocialSetting, ApiSocialStatus, ApiSocialSummary, ShareCategory, ShareChannel, SHARE_CATEGORIES, SHARE_STATUS,
  approveSocialShare, fetchSocialPreviewImage, getSocialSettings, getSocialStatus, getSocialSummary, regenerateSocialShare,
  rejectSocialShare, retrySocialShare, searchSocialShares, sendTelegramTest, shareAgain, updateSocialSetting,
} from '../../api/socialShare';

const input = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
const btn = 'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl font-bold text-[13px] cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white`;
const btnGhost = `${btn} bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700`;
const btnDanger = `${btn} bg-white border border-rose-200 text-rose-600 hover:bg-rose-50`;

const CHANNEL_META: Record<ShareChannel, { label: string; icon: React.ElementType; tone: string }> = {
  telegram: { label: 'Telegram', icon: Send, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  facebook: { label: 'Facebook', icon: Facebook, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  instagram: { label: 'Instagram', icon: Instagram, tone: 'bg-pink-50 text-pink-700 border-pink-200' },
};

const STATUS_META: Record<number, { label: string; icon: React.ElementType; tone: string }> = {
  [SHARE_STATUS.AwaitingApproval]: { label: 'Needs approval', icon: ShieldAlert, tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  [SHARE_STATUS.Pending]: { label: 'Queued', icon: Clock, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  [SHARE_STATUS.Processing]: { label: 'Posting…', icon: Loader2, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  [SHARE_STATUS.Posted]: { label: 'Posted', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  [SHARE_STATUS.Failed]: { label: 'Failed', icon: XCircle, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  [SHARE_STATUS.Skipped]: { label: 'Skipped', icon: AlertTriangle, tone: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const catLabel = (c: string) => SHARE_CATEGORIES.find((x) => x.id === c)?.label ?? c;

/** The API returns UTC timestamps; SQL Server round-trips drop the "Z", so add it back before formatting. */
const fmt = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d : d + 'Z');
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const errText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

// ================================================================================================
// Status banner
// ================================================================================================

const StatusBanner: React.FC<{ status: ApiSocialStatus | null; onRecheck: () => void; busy: boolean }> = ({ status, onRecheck, busy }) => {
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  if (!status) return null;

  const chips: { label: string; ok: boolean; hint?: string | null }[] = [
    { label: 'Telegram', ok: status.telegram.configured, hint: status.telegram.hint },
    { label: 'Facebook', ok: status.facebook.configured, hint: status.facebook.hint },
    { label: 'Instagram', ok: status.instagram.configured, hint: status.instagram.hint },
    { label: `OpenAI (${status.openAiModel})`, ok: status.openAi.configured, hint: status.openAi.hint },
  ];

  const runTest = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      await sendTelegramTest();
      setTestMsg({ ok: true, text: 'Test message sent — check your Telegram channel.' });
    } catch (err) {
      setTestMsg({ ok: false, text: errText(err, 'Telegram test failed.') });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      {status.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 sm:p-4 space-y-1.5" role="alert">
          {status.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-[13px] font-semibold text-amber-900"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}</p>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c.label} title={c.hint ?? undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold ${c.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{c.label}{!c.ok && ' — not configured'}
            </span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[12.5px] text-slate-600 font-semibold">
          <span>AI images today: <b className="text-slate-900">{status.imagesToday}</b> / {status.dailyImageCap}</span>
          {status.metaToken.daysLeft != null && <span>Meta token: <b className="text-slate-900">{status.metaToken.daysLeft} day(s)</b> left</span>}
          <span className="sm:ml-auto flex flex-col sm:flex-row gap-2">
            <button type="button" className={btnGhost} onClick={onRecheck} disabled={busy}><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />Re-check token</button>
            <button type="button" className={btnGhost} onClick={runTest} disabled={testing || !status.telegram.configured}><Send className="w-4 h-4" />{testing ? 'Sending…' : 'Telegram test'}</button>
          </span>
        </div>
        {testMsg && <p className={`text-[12.5px] font-semibold ${testMsg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{testMsg.text}</p>}
      </div>
    </div>
  );
};

// ================================================================================================
// Activity log
// ================================================================================================

const ShareCard: React.FC<{ item: ApiSocialShare; onChanged: () => void }> = ({ item, onChanged }) => {
  const [open, setOpen] = useState(item.status === SHARE_STATUS.AwaitingApproval);
  const [draft, setDraft] = useState(item.message ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  // Keep the editor in step with a regenerated preview, unless the admin is mid-edit.
  const lastServerMessage = useRef(item.message ?? '');
  useEffect(() => {
    if ((item.message ?? '') !== lastServerMessage.current) {
      if (draft === lastServerMessage.current) setDraft(item.message ?? '');
      lastServerMessage.current = item.message ?? '';
    }
  }, [item.message, draft]);

  const ch = CHANNEL_META[item.channel];
  const st = STATUS_META[item.status] ?? STATUS_META[SHARE_STATUS.Pending];
  const ChIcon = ch.icon;
  const StIcon = st.icon;
  const awaiting = item.status === SHARE_STATUS.AwaitingApproval;
  const previewReady = !!item.message;
  const limit = item.channel === 'instagram' ? 2200 : 4096;

  const act = async (key: string, fn: () => Promise<unknown>, okText?: string) => {
    setBusy(key);
    setNote(null);
    try {
      await fn();
      if (okText) setNote({ ok: true, text: okText });
      onChanged();
    } catch (err) {
      setNote({ ok: false, text: errText(err, 'That did not work.') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`rounded-2xl border bg-white ${awaiting ? 'border-amber-300 ring-4 ring-amber-400/10' : 'border-slate-200'}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left p-3.5 sm:p-4 flex gap-3 cursor-pointer">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" loading="lazy" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-slate-100 shrink-0" />
          : <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 grid place-items-center text-slate-400 shrink-0"><ImageIcon className="w-5 h-5" /></div>}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-bold ${ch.tone}`}><ChIcon className="w-3 h-3" />{ch.label}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-bold ${st.tone}`}>
              <StIcon className={`w-3 h-3 ${item.status === SHARE_STATUS.Processing ? 'animate-spin' : ''}`} />{st.label}
            </span>
            <span className="text-[11.5px] font-semibold text-slate-500">{catLabel(item.category)}{item.generation > 0 ? ` · repost #${item.generation}` : ''}</span>
          </div>
          <div className="font-bold text-[14px] text-slate-900 leading-snug break-words line-clamp-2">{item.title}</div>
          <div className="text-[12px] text-slate-500 font-medium">
            {item.status === SHARE_STATUS.Posted ? `Posted ${fmt(item.postedAt)}` : `Updated ${fmt(item.updatedDate)}`}
            {item.attempts > 0 && item.status !== SHARE_STATUS.Posted && ` · ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}`}
            {item.status === SHARE_STATUS.Pending && item.nextAttemptAt && ` · next ${fmt(item.nextAttemptAt)}`}
          </div>
          {item.error && item.status !== SHARE_STATUS.Posted && <div className="text-[12px] text-rose-600 font-semibold break-words">{item.error}</div>}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-3.5 sm:p-4 space-y-3">
          {awaiting && !previewReady && (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600"><Loader2 className="w-4 h-4 animate-spin" />Building the preview… (the worker checks every 15 seconds)</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,360px)_1fr] gap-4">
            {item.imageUrl && (
              <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block">
                <img src={item.imageUrl} alt="Share image preview" className="w-full max-w-[360px] mx-auto md:mx-0 rounded-xl border border-slate-200 bg-slate-100" />
              </a>
            )}
            {(previewReady || !awaiting) && (
              <div className="space-y-1.5 min-w-0">
                <label className="text-[12px] font-bold text-slate-600" htmlFor={`msg-${item.id}`}>
                  {item.channel === 'telegram' ? 'Message' : 'Caption'}{awaiting && ' (you can edit before approving)'}
                </label>
                {awaiting ? (
                  <>
                    <textarea id={`msg-${item.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={9} className={`${input} font-mono text-[13px] leading-relaxed`} />
                    <div className={`text-[11.5px] font-semibold ${draft.length > limit ? 'text-rose-600' : 'text-slate-400'}`}>{draft.length} / {limit}</div>
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-sans max-h-72 overflow-auto">{item.message || '—'}</pre>
                )}
              </div>
            )}
          </div>

          <div className="text-[12px] text-slate-500 font-medium break-all space-y-0.5">
            <div>Post: <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{item.url}</a></div>
            {item.externalId && <div>{ch.label} id: <span className="font-mono text-slate-700">{item.externalId}</span></div>}
          </div>

          {note && <p className={`text-[13px] font-semibold ${note.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{note.text}</p>}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {awaiting && (
              <>
                <button type="button" className={btnPrimary} disabled={!previewReady || !!busy || draft.length > limit}
                  onClick={() => act('approve', () => approveSocialShare(item.id, draft && draft !== item.message ? draft : undefined), 'Approved — it will be posted within a few seconds.')}>
                  {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve &amp; post
                </button>
                <button type="button" className={btnGhost} disabled={!!busy} onClick={() => act('regen', () => regenerateSocialShare(item.id), 'Rebuilding the preview…')}>
                  <RefreshCw className={`w-4 h-4 ${busy === 'regen' ? 'animate-spin' : ''}`} />New image
                </button>
                <button type="button" className={btnDanger} disabled={!!busy} onClick={() => act('reject', () => rejectSocialShare(item.id))}><XCircle className="w-4 h-4" />Reject</button>
              </>
            )}
            {item.status === SHARE_STATUS.Failed && (
              <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => act('retry', () => retrySocialShare(item.id), 'Re-queued.')}>
                {busy === 'retry' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Retry
              </button>
            )}
            {(item.status === SHARE_STATUS.Posted || item.status === SHARE_STATUS.Failed || item.status === SHARE_STATUS.Skipped) && (
              <button type="button" className={btnGhost} disabled={!!busy}
                onClick={() => act('again', async () => { const r = await shareAgain(item.category, item.entityId); setNote({ ok: true, text: `Queued ${r.queued} new share(s).` }); })}>
                <Share2 className="w-4 h-4" />Share again
              </button>
            )}
            <a href={item.url} target="_blank" rel="noreferrer" className={btnGhost}><ExternalLink className="w-4 h-4" />Open post</a>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityLog: React.FC<{ summary: ApiSocialSummary | null; onChanged: () => void; initialStatus?: number }> = ({ summary, onChanged, initialStatus }) => {
  const [status, setStatus] = useState<string>(initialStatus != null ? String(initialStatus) : '');
  const [category, setCategory] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ApiSocialShare[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    searchSocialShares({
      status: status === '' ? undefined : Number(status),
      category: (category || undefined) as ShareCategory | undefined,
      channel: (channel || undefined) as ShareChannel | undefined,
      page, pageSize: 15,
    })
      .then((r) => { setItems(r.items); setTotal(r.totalCount); setPages(Math.max(1, r.totalPages)); setError(null); })
      .catch((err) => setError(errText(err, 'Could not load the activity log.')))
      .finally(() => setLoading(false));
  }, [status, category, channel, page]);

  useEffect(() => { load(); }, [load]);
  // The worker moves shares along in the background, so quietly refresh while the log is open.
  useEffect(() => { const t = setInterval(() => load(true), 20000); return () => clearInterval(t); }, [load]);

  const changed = () => { load(true); onChanged(); };

  const pills: { key: string; label: string; count?: number; tone: string }[] = [
    { key: '', label: 'All', tone: 'bg-slate-100 text-slate-700' },
    { key: String(SHARE_STATUS.AwaitingApproval), label: 'Needs approval', count: summary?.awaitingApproval, tone: 'bg-amber-100 text-amber-800' },
    { key: String(SHARE_STATUS.Pending), label: 'Queued', count: summary?.queued, tone: 'bg-slate-100 text-slate-700' },
    { key: String(SHARE_STATUS.Posted), label: 'Posted', count: summary?.posted, tone: 'bg-emerald-100 text-emerald-800' },
    { key: String(SHARE_STATUS.Failed), label: 'Failed', count: summary?.failed, tone: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {pills.map((p) => (
          <button key={p.key} type="button" onClick={() => { setStatus(p.key); setPage(1); }}
            className={`shrink-0 min-h-[44px] px-4 rounded-full text-[13px] font-bold cursor-pointer border transition-colors ${status === p.key ? `${p.tone} border-current ring-2 ring-offset-1 ring-current/30` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {p.label}{p.count != null && <span className="ml-1.5 opacity-80">{p.count}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={input}>
          <option value="">All categories</option>
          {SHARE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select aria-label="Channel" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} className={input}>
          <option value="">All channels</option>
          {(Object.keys(CHANNEL_META) as ShareChannel[]).map((c) => <option key={c} value={c}>{CHANNEL_META[c].label}</option>)}
        </select>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold">{error}</div>}

      {loading ? (
        <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
          Nothing here yet. Publish a post (or use “Share again” on one) and its shares will show up in this log.
        </div>
      ) : (
        <div className="space-y-2.5">{items.map((it) => <ShareCard key={`${it.id}-${it.updatedDate}`} item={it} onChanged={changed} />)}</div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" />Prev</button>
          <span className="text-[12.5px] font-semibold text-slate-500">Page {page} of {pages} · {total} total</span>
          <button type="button" className={btnGhost} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

// ================================================================================================
// Settings
// ================================================================================================

type Draft = Omit<ApiSocialSetting, 'category' | 'updatedDate' | 'defaultTelegramTemplate' | 'defaultCaptionTemplate' | 'defaultHashtags' | 'placeholders'>;

const toDraft = (s: ApiSocialSetting): Draft => ({
  telegramEnabled: s.telegramEnabled, instagramEnabled: s.instagramEnabled, facebookEnabled: s.facebookEnabled, requireApproval: s.requireApproval,
  telegramTemplate: s.telegramTemplate ?? '', captionTemplate: s.captionTemplate ?? '', hashtags: s.hashtags ?? '', imageStyle: s.imageStyle ?? '',
  imageSize: s.imageSize, brandColor: s.brandColor ?? '', accentColor: s.accentColor ?? '', logoUrl: s.logoUrl ?? '',
});

const Toggle: React.FC<{ label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 min-h-[52px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 cursor-pointer">
    <span className="min-w-0">
      <span className="block text-[13.5px] font-bold text-slate-800">{label}</span>
      {hint && <span className="block text-[12px] font-medium text-slate-500">{hint}</span>}
    </span>
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-6 h-6 shrink-0 cursor-pointer" />
  </label>
);

const ColorField: React.FC<{ label: string; value: string; fallback: string; onChange: (v: string) => void }> = ({ label, value, fallback, onChange }) => (
  <div>
    <label className="text-slate-700 block mb-1.5 text-[12.5px] font-bold">{label}</label>
    <div className="flex gap-2">
      <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback} onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-12 h-[46px] rounded-xl border border-slate-200 bg-white p-1 cursor-pointer shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={fallback} maxLength={7} className={input} />
    </div>
  </div>
);

const SettingsEditor: React.FC<{ setting: ApiSocialSetting; onSaved: (s: ApiSocialSetting) => void }> = ({ setting, onSaved }) => {
  const [d, setD] = useState<Draft>(() => toDraft(setting));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const tgRef = useRef<HTMLTextAreaElement>(null);
  const capRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setD(toDraft(setting)); setMsg(null); setPreview(null); }, [setting]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(toDraft(setting)), [d, setting]);

  const insert = (ref: React.RefObject<HTMLTextAreaElement | null>, key: 'telegramTemplate' | 'captionTemplate', token: string, fallback: string) => {
    const el = ref.current;
    const current = (d[key] ?? '') || fallback;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    set(key, current.slice(0, start) + token + current.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const saved = await updateSocialSetting(setting.category, {
        ...d,
        telegramTemplate: d.telegramTemplate?.trim() || null,
        captionTemplate: d.captionTemplate?.trim() || null,
        hashtags: d.hashtags?.trim() || null,
        imageStyle: d.imageStyle?.trim() || null,
        brandColor: d.brandColor?.trim() || null,
        accentColor: d.accentColor?.trim() || null,
        logoUrl: d.logoUrl?.trim() || null,
      });
      onSaved(saved);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: errText(err, 'Could not save these settings.') });
    } finally {
      setSaving(false);
    }
  };

  const showPreview = async () => {
    setPreviewing(true);
    setMsg(null);
    try {
      const url = await fetchSocialPreviewImage({ category: setting.category, size: d.imageSize, brand: d.brandColor || undefined, accent: d.accentColor || undefined });
      setPreview(url);
    } catch (err) {
      setMsg({ ok: false, text: errText(err, 'Could not render the preview.') });
    } finally {
      setPreviewing(false);
    }
  };

  const Chips = ({ target, k, fallback }: { target: React.RefObject<HTMLTextAreaElement | null>; k: 'telegramTemplate' | 'captionTemplate'; fallback: string }) => (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {[...setting.placeholders, ...(k === 'captionTemplate' ? ['hashtags'] : [])].map((p) => (
        <button key={p} type="button" onClick={() => insert(target, k, `{${p}}`, fallback)}
          className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[12px] font-mono font-semibold cursor-pointer">{`{${p}}`}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 text-[13px]">
      <section className="space-y-2">
        <h4 className="text-[14px] font-extrabold text-slate-900">Where to post</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Toggle label="Telegram" checked={d.telegramEnabled} onChange={(v) => set('telegramEnabled', v)} />
          <Toggle label="Instagram" checked={d.instagramEnabled} onChange={(v) => set('instagramEnabled', v)} />
          <Toggle label="Facebook" checked={d.facebookEnabled} onChange={(v) => set('facebookEnabled', v)} />
        </div>
        <Toggle label="Ask me to approve first" hint="Preview the image and caption in the Activity Log, then approve. Turn off to post automatically." checked={d.requireApproval} onChange={(v) => set('requireApproval', v)} />
      </section>

      <section className="space-y-3">
        <h4 className="text-[14px] font-extrabold text-slate-900">Image</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-700 block mb-1.5 text-[12.5px] font-bold" htmlFor="img-size">Size</label>
            <select id="img-size" value={d.imageSize} onChange={(e) => set('imageSize', e.target.value as Draft['imageSize'])} className={input}>
              <option value="square">Square 1080×1080</option>
              <option value="portrait">Portrait 1080×1350</option>
            </select>
          </div>
          <div>
            <label className="text-slate-700 block mb-1.5 text-[12.5px] font-bold" htmlFor="img-logo">Logo URL (optional)</label>
            <input id="img-logo" value={d.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} placeholder="/uploads/logo.png or https://…" className={input} />
          </div>
          <ColorField label="Brand colour" value={d.brandColor ?? ''} fallback="#1D4ED8" onChange={(v) => set('brandColor', v)} />
          <ColorField label="Accent colour" value={d.accentColor ?? ''} fallback="#F59E0B" onChange={(v) => set('accentColor', v)} />
          <div className="sm:col-span-2">
            <label className="text-slate-700 block mb-1.5 text-[12.5px] font-bold" htmlFor="img-style">Background style (sent to the AI image model)</label>
            <input id="img-style" value={d.imageStyle ?? ''} onChange={(e) => set('imageStyle', e.target.value)} maxLength={500}
              placeholder="e.g. clean blue gradient with soft geometric shapes" className={input} />
            <p className="text-[12px] text-slate-500 font-medium mt-1">The AI only draws the background. Titles and details are always added by the site, so spelling is exact.</p>
          </div>
        </div>
        <div className="space-y-2">
          <button type="button" className={btnGhost} onClick={showPreview} disabled={previewing}>
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}Preview with these colours
          </button>
          {preview && <img src={preview} alt="Sample share image" className="w-full max-w-[360px] rounded-xl border border-slate-200" />}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-[14px] font-extrabold text-slate-900">Telegram message</h4>
        <Chips target={tgRef} k="telegramTemplate" fallback={setting.defaultTelegramTemplate} />
        <textarea ref={tgRef} rows={8} value={d.telegramTemplate ?? ''} onChange={(e) => set('telegramTemplate', e.target.value)}
          placeholder={setting.defaultTelegramTemplate} className={`${input} font-mono text-[13px]`} aria-label="Telegram message template" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-slate-500 font-medium">Telegram HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;a&gt;, &lt;code&gt;. Empty = the default shown in grey. A line with no value is dropped.</p>
          <button type="button" className="text-[12.5px] font-bold text-blue-700 hover:underline cursor-pointer min-h-[36px] shrink-0" onClick={() => set('telegramTemplate', setting.defaultTelegramTemplate)}>Use default</button>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-[14px] font-extrabold text-slate-900">Instagram &amp; Facebook caption</h4>
        <Chips target={capRef} k="captionTemplate" fallback={setting.defaultCaptionTemplate} />
        <textarea ref={capRef} rows={8} value={d.captionTemplate ?? ''} onChange={(e) => set('captionTemplate', e.target.value)}
          placeholder={setting.defaultCaptionTemplate} className={`${input} text-[13px]`} aria-label="Caption template" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-slate-500 font-medium">Plain text. Hashtags are added after it unless you place {'{hashtags}'} yourself. Always trimmed to Instagram's 2,200 characters and 30 hashtags.</p>
          <button type="button" className="text-[12.5px] font-bold text-blue-700 hover:underline cursor-pointer min-h-[36px] shrink-0" onClick={() => set('captionTemplate', setting.defaultCaptionTemplate)}>Use default</button>
        </div>
        <label className="text-slate-700 block mb-1.5 text-[12.5px] font-bold" htmlFor="hashtags">Hashtags</label>
        <textarea id="hashtags" rows={2} value={d.hashtags ?? ''} onChange={(e) => set('hashtags', e.target.value)}
          placeholder={setting.defaultHashtags} className={input} />
      </section>

      {msg && <p className={`text-[13px] font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`} role="status">{msg.text}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-gradient-to-t from-white via-white to-white/70 flex flex-col sm:flex-row gap-2">
        <button type="button" className={`${btnPrimary} sm:min-w-[160px]`} onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving…' : 'Save settings'}
        </button>
        {dirty && <button type="button" className={btnGhost} onClick={() => { setD(toDraft(setting)); setMsg(null); }}>Discard changes</button>}
      </div>
    </div>
  );
};

const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<ApiSocialSetting[] | null>(null);
  const [category, setCategory] = useState<ShareCategory>('job');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getSocialSettings().then(setSettings).catch((err) => setError(errText(err, 'Could not load settings.'))); }, []);

  if (error) return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold">{error}</div>;
  if (!settings) return <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading…</div>;

  const current = settings.find((s) => s.category === category)!;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Category">
        {SHARE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)}
            className={`shrink-0 min-h-[44px] px-4 rounded-full text-[13px] font-bold cursor-pointer border transition-colors ${category === c.id ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5">
        <SettingsEditor key={category} setting={current} onSaved={(s) => setSettings((all) => all!.map((x) => (x.category === s.category ? s : x)))} />
      </div>
    </div>
  );
};

// ================================================================================================
// Panel
// ================================================================================================

export const AdminAutoSharePanel: React.FC = () => {
  const [tab, setTab] = useState<'log' | 'settings'>('log');
  const [status, setStatus] = useState<ApiSocialStatus | null>(null);
  const [summary, setSummary] = useState<ApiSocialSummary | null>(null);
  const [checking, setChecking] = useState(false);

  const loadSummary = useCallback(() => { getSocialSummary().then(setSummary).catch(() => {}); }, []);
  const loadStatus = useCallback((refresh = false) => {
    setChecking(refresh);
    getSocialStatus(refresh).then(setStatus).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => { loadStatus(); loadSummary(); }, [loadStatus, loadSummary]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Auto-share</h2>
        <p className="text-[13px] text-slate-500 font-medium">Every published job, result, admit card, scheme and news item is shared to Telegram, Facebook and Instagram.</p>
      </div>

      <StatusBanner status={status} onRecheck={() => loadStatus(true)} busy={checking} />

      <div className="flex gap-2" role="tablist">
        {([['log', 'Activity log'], ['settings', 'Settings']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex-1 sm:flex-none sm:min-w-[150px] min-h-[46px] px-5 rounded-xl text-[14px] font-extrabold cursor-pointer border transition-colors ${tab === id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {label}{id === 'log' && summary && summary.awaitingApproval > 0 && <span className="ml-2 inline-grid place-items-center min-w-[22px] h-[22px] px-1 rounded-full bg-amber-400 text-amber-950 text-[12px]">{summary.awaitingApproval}</span>}
          </button>
        ))}
      </div>

      {tab === 'log'
        ? <ActivityLog summary={summary} onChanged={loadSummary} />
        : <SettingsTab />}
    </div>
  );
};
