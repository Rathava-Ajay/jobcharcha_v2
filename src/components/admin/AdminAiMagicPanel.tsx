import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles, RefreshCw, Loader2, Briefcase, Trophy, Award, FileText, Newspaper, Landmark, GraduationCap,
  CheckCircle2, XCircle, AlertTriangle, Info, X, ExternalLink, ChevronDown, ChevronUp, Trash2, Send, Rss, Clock3,
  Plus, Globe2, MessageCircle, Settings2, Code2, Radar, History, Ban, Pencil, Eye, Search,
} from 'lucide-react';
import { AdminJobDraftsPanel } from './AdminJobDraftsPanel';
import { DRAFT_FIELDS, parseFieldValue, displayFieldValue, trimStrings } from './aiMagicFields';
import { searchJobDrafts, JOB_DRAFT_STATUS } from '../../api/jobDrafts';
import {
  ContentCategory, CONTENT_DRAFT_STATUS, SYNC_STATUS,
  ApiContentCategorySummary, ApiContentDraftListItem, ApiContentDraft, ApiContentSyncRun, ApiContentSource,
  getContentSummary, searchContentDrafts, getContentDraft, approveContentDraft, rejectContentDraft, deleteContentDraft,
  startContentSync, cancelContentSync, getContentSyncRuns, getContentSources, createContentSource, updateContentSource, deleteContentSource,
  getContentSettings, updateContentSetting, ApiContentCategorySetting, SyncScope,
} from '../../api/contentDrafts';
import { getCategories, ApiCategory } from '../../api/categories';
import { SHARE_CATEGORIES } from '../../api/socialShare';
import { ApiError } from '../../api/client';

type TabId = 'jobs' | ContentCategory;

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }[] = [
  { id: 'job', label: 'Jobs', icon: Briefcase, blurb: 'Open recruitments from your registered websites and Telegram channels, plus the latest official notifications the AI agent finds by searching the web.' },
  { id: 'jobs', label: 'Scraper queue', icon: Search, blurb: 'Raw recruitment posts picked up automatically from your watched websites and Telegram channels.' },
  { id: 'result', label: 'Results', icon: Trophy, blurb: 'Freshly declared results and merit lists, written up ready to publish.' },
  { id: 'admitcard', label: 'Admit cards', icon: Award, blurb: 'Released hall tickets and call letters for upcoming exams.' },
  { id: 'oldpaper', label: 'Old papers', icon: FileText, blurb: 'Official previous-year papers and answer keys (links to official PDFs only).' },
  { id: 'news', label: 'News', icon: Newspaper, blurb: 'Exam, recruitment and education news that matters to aspirants.' },
  { id: 'scheme', label: 'Gov schemes', icon: Landmark, blurb: 'New and updated central and Gujarat government schemes.' },
  { id: 'study', label: 'Study notes', icon: GraduationCap, blurb: 'Original revision notes on current and high-yield topics.' },
];

const STATUS_TABS = [
  { id: CONTENT_DRAFT_STATUS.Pending, label: 'Pending review' },
  { id: CONTENT_DRAFT_STATUS.Approved, label: 'Published' },
  { id: CONTENT_DRAFT_STATUS.Rejected, label: 'Rejected' },
];

const RUN_ACTIVE = (r?: ApiContentSyncRun | null) => !!r && (r.status === SYNC_STATUS.Queued || r.status === SYNC_STATUS.Running);

/** Categories that auto-share to Telegram / Facebook / Instagram when published. */
const SHAREABLE = new Set<string>(SHARE_CATEGORIES.map((c) => c.id));

const SKIP_KEYS = new Set(['description', 'content', 'faqSchema', 'cutOffBreakdown', 'secondaryKeywords', 'lsiKeywords', 'internalLinkAnchors', 'metaKeywords', 'ogTitle', 'ogDescription', 'autoPublish', 'isActive', 'overview', 'howToApply', 'keyHighlights', 'eligibilityDetails', 'importantNotes', 'documentsRequired', 'vacancyBreakdown', 'applicationFee', 'selectionProcess', 'importantDates']);

/** Preview-only: keeps paragraph / heading / bullet breaks instead of flattening the HTML into one blob. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|h[1-6]|li|ul|ol|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function runLine(r?: ApiContentSyncRun | null): string {
  if (!r) return 'Never synced';
  if (r.status === SYNC_STATUS.Queued) return 'Queued…';
  if (r.status === SYNC_STATUS.Running) return `Running… ${r.newCount} new so far`;
  if (r.status === SYNC_STATUS.Failed) return `Failed ${r.finishedAt ? when(r.finishedAt) : ''}`;
  if (r.status === SYNC_STATUS.Cancelled) return `Cancelled ${r.finishedAt ? when(r.finishedAt) : ''}`;
  return `${r.newCount} new · ${r.skippedCount} skipped${r.invalidCount ? ` · ${r.invalidCount} invalid` : ''} · ${r.finishedAt ? when(r.finishedAt) : ''}`;
}

function duration(r: ApiContentSyncRun): string {
  if (!r.finishedAt) return '';
  const secs = Math.max(0, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000));
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
}

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  [SYNC_STATUS.Queued]: { text: 'Queued', cls: 'bg-slate-100 text-slate-600' },
  [SYNC_STATUS.Running]: { text: 'Running', cls: 'bg-indigo-100 text-indigo-700' },
  [SYNC_STATUS.Completed]: { text: 'Done', cls: 'bg-emerald-100 text-emerald-800' },
  [SYNC_STATUS.Failed]: { text: 'Failed', cls: 'bg-rose-100 text-rose-700' },
  [SYNC_STATUS.Cancelled]: { text: 'Cancelled', cls: 'bg-amber-100 text-amber-800' },
};

export const AdminAiMagicPanel: React.FC = () => {
  const [tab, setTab] = useState<TabId>('job');
  const [summary, setSummary] = useState<ApiContentCategorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [scope, setScope] = useState<SyncScope>('all');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [jobsPending, setJobsPending] = useState(0);

  const loadSummary = useCallback(() => {
    getContentSummary().then(setSummary).catch(() => { /* keep the last good summary */ });
    searchJobDrafts(JOB_DRAFT_STATUS.Pending, 1, 1).then((r) => setJobsPending(r.totalCount)).catch(() => { /* keep the last count */ });
  }, []);

  useEffect(() => { loadSummary(); getCategories().then(setCategories).catch(() => setCategories([])); }, [loadSummary]);

  const anyRunning = summary.some((s) => RUN_ACTIVE(s.lastRun));

  // Poll quickly while an agent run is in flight so counts and statuses update live, and slowly otherwise so a
  // sync started from another tab or by another admin still shows up (with its Cancel button) without a reload.
  useEffect(() => {
    const t = setInterval(loadSummary, anyRunning ? 8000 : 20000);
    return () => clearInterval(t);
  }, [anyRunning, loadSummary]);

  const bySummary = useMemo(() => new Map(summary.map((s) => [s.category, s])), [summary]);

  const sync = async (category?: ContentCategory) => {
    setStarting(true); setError(null); setNotice(null);
    try {
      await startContentSync(category, scope);
      setNotice(category
        ? `AI agent started${scope === 'gujarat' ? ' (Gujarat only)' : ''}. It usually takes a few minutes; drafts appear below as it finds them.`
        : `AI agent started for all categories${scope === 'gujarat' ? ' (Gujarat only)' : ''}, one after another. This can take 15–30 minutes; drafts appear as each category finishes.`);
      loadSummary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the sync.');
    } finally {
      setStarting(false);
    }
  };

  const cancel = async () => {
    setCancelling(true); setError(null); setNotice(null);
    try {
      const r = await cancelContentSync();
      setNotice(r.cancelled > 1 ? `Cancelled ${r.cancelled} runs. Drafts already collected stay in the queues.` : 'Sync cancelled. Drafts already collected stay in the queues.');
      loadSummary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel the sync.');
      loadSummary();
    } finally {
      setCancelling(false);
    }
  };

  const active = TABS.find((t) => t.id === tab)!;
  const activeSummary = tab === 'jobs' ? null : bySummary.get(tab);

  return (
    <div className="space-y-5 max-sm:[&_button]:min-h-[44px] max-sm:[&_input[type=checkbox]]:w-5 max-sm:[&_input[type=checkbox]]:h-5">
      <section className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 bg-[radial-gradient(420px_220px_at_100%_0%,rgba(167,139,250,0.4),transparent_60%),linear-gradient(135deg,#1e1b4b,#4338ca_60%,#7c3aed)]">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center shrink-0"><Sparkles className="w-6 h-6 text-amber-300" /></span>
            <div className="min-w-0">
              <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-tight">AI Magic</h2>
              <p className="text-[13px] text-indigo-100/85 max-w-2xl">One click collects the latest jobs, results, admit cards, old papers, news, schemes and study notes, already written in post format. You review each draft and publish with one click — nothing goes live on its own.</p>
            </div>
          </div>
          <div className="shrink-0 flex flex-wrap gap-2">
            <button onClick={() => setShowHistory((v) => !v)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border text-white font-bold text-[13px] px-3.5 py-2.5 cursor-pointer whitespace-nowrap ${showHistory ? 'border-white/60 bg-white/20' : 'border-white/25 bg-white/10 hover:bg-white/20'}`}>
              <History className="w-4 h-4" /> Run history
            </button>
            <div role="group" aria-label="Sync scope" className="inline-flex rounded-xl border border-white/25 bg-white/10 p-0.5">
              {([['all', 'All India'], ['gujarat', 'Gujarat only']] as const).map(([id, text]) => (
                <button key={id} onClick={() => setScope(id)} disabled={anyRunning} aria-pressed={scope === id}
                  className={`rounded-[10px] px-3 py-2 text-[13px] font-bold cursor-pointer whitespace-nowrap disabled:cursor-not-allowed ${scope === id ? 'bg-white text-indigo-900' : 'text-white hover:bg-white/15'}`}>
                  {text}
                </button>
              ))}
            </div>
            {anyRunning && (
              <button onClick={cancel} disabled={cancelling}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300/60 bg-rose-500/90 hover:bg-rose-500 text-white font-extrabold text-[13px] px-3.5 py-2.5 cursor-pointer disabled:opacity-60 whitespace-nowrap">
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Cancel sync
              </button>
            )}
            <button onClick={() => sync()} disabled={starting || anyRunning}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[13px] px-4 py-2.5 cursor-pointer disabled:opacity-60 whitespace-nowrap">
              {starting || anyRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {anyRunning ? 'Sync running…' : 'Sync all categories'}
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 text-[13px] font-semibold text-indigo-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" /><span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 w-6 h-6 rounded-md grid place-items-center hover:bg-indigo-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 w-6 h-6 rounded-md grid place-items-center hover:bg-rose-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {showHistory && <RunHistory anyRunning={anyRunning} />}

      <div role="tablist" aria-label="AI Magic categories" className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((t) => {
          const on = tab === t.id;
          const s = t.id === 'jobs' ? null : bySummary.get(t.id);
          const pc = t.id === 'jobs' ? jobsPending : (s?.pendingCount ?? 0);
          const Icon = t.icon;
          return (
            <button key={t.id} role="tab" aria-selected={on} onClick={() => setTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-bold cursor-pointer whitespace-nowrap transition ${on ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
              <Icon className="w-4 h-4" /> {t.label}
              {pc > 0 && <span className={`rounded-full px-1.5 text-[11px] font-extrabold ${on ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>{pc}</span>}
              {s && !s.isEnabled && <span className={`rounded-full px-1.5 text-[10.5px] font-extrabold ${on ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>Off</span>}
              {s && RUN_ACTIVE(s.lastRun) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </button>
          );
        })}
      </div>

      {tab === 'jobs' ? (
        <AdminJobDraftsPanel />
      ) : (
        <CategoryPane
          key={tab}
          category={tab}
          label={active.label}
          blurb={active.blurb}
          summary={activeSummary}
          categories={categories}
          syncDisabled={starting || anyRunning}
          onSync={() => sync(tab)}
          onChanged={loadSummary}
          onError={setError}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

const PAGE_SIZE = 30;

interface CategoryPaneProps {
  category: ContentCategory;
  label: string;
  blurb: string;
  summary?: ApiContentCategorySummary;
  categories: ApiCategory[];
  syncDisabled: boolean;
  onSync: () => void;
  onChanged: () => void;
  onError: (msg: string | null) => void;
}

const CategoryPane: React.FC<CategoryPaneProps> = ({ category, label, blurb, summary, categories, syncDisabled, onSync, onChanged, onError }) => {
  const [status, setStatus] = useState<number>(CONTENT_DRAFT_STATUS.Pending);
  const [items, setItems] = useState<ApiContentDraftListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStep, setBulkStep] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkSkipSocial, setBulkSkipSocial] = useState(false);
  const [bulkResult, setBulkResult] = useState<string[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    searchContentDrafts(category, status, 1, PAGE_SIZE)
      .then((r) => {
        setItems(r.items); setTotal(r.totalCount); setPage(1);
        setSelected((prev) => new Set(Array.from(prev).filter((id) => r.items.some((i) => i.id === id))));
      })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [category, status]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await searchContentDrafts(category, status, page + 1, PAGE_SIZE);
      setItems((prev) => { const seen = new Set(prev.map((i) => i.id)); return [...prev, ...r.items.filter((i) => !seen.has(i.id))]; });
      setTotal(r.totalCount);
      setPage((p) => p + 1);
    } catch { onError('Could not load more drafts.'); }
    finally { setLoadingMore(false); }
  };

  useEffect(() => { load(); }, [load]);

  // Refresh the list when a run for this category finishes (or new items arrive mid-run).
  const lastRun = summary?.lastRun;
  const runKey = lastRun ? `${lastRun.id}:${lastRun.status}:${lastRun.newCount}` : '';
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    load();
  }, [runKey, load]);

  const changed = () => { load(); onChanged(); };
  const running = RUN_ACTIVE(lastRun);
  const enabled = summary?.isEnabled !== false;

  // Bulk review. Drafts with link warnings are never bulk-published: they need a human look first.
  const pendingList = status === CONTENT_DRAFT_STATUS.Pending;
  const selectedItems = items.filter((i) => selected.has(i.id));
  const eligible = selectedItems.filter((i) => !(i.warnings?.length));
  const skippedForWarnings = selectedItems.length - eligible.length;
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const toggleOne = (id: number, on: boolean) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const runBulk = async (kind: 'approve' | 'reject') => {
    setBulkBusy(true); onError(null); setBulkResult(null);
    const targets = kind === 'approve' ? eligible : selectedItems;
    const skipped = kind === 'approve' ? skippedForWarnings : 0;
    const failures: string[] = [];
    let done = 0;
    for (const it of targets) {
      try {
        if (kind === 'approve') await approveContentDraft(it.id, undefined, bulkSkipSocial); else await rejectContentDraft(it.id);
        done += 1;
      } catch (e) {
        failures.push(`${it.title}: ${e instanceof ApiError ? e.message : 'failed'}`);
      }
    }
    setBulkStep('idle'); setSelected(new Set());
    setBulkResult([
      `${kind === 'approve' ? 'Published' : 'Rejected'} ${done} of ${targets.length}.`,
      ...(skipped ? [`${skipped} skipped because they have link warnings — open them to check.`] : []),
      ...failures,
    ]);
    setBulkBusy(false);
    changed();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-[17px] text-slate-900">{label}{!enabled && <span className="ml-2 align-middle rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[11px] font-extrabold">Sync off</span>}</h3>
          <p className="text-[13px] text-slate-500">{blurb}</p>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold ${lastRun?.status === SYNC_STATUS.Failed ? 'text-rose-600' : 'text-slate-500'}`}>
            <Clock3 className="w-3.5 h-3.5" /> {runLine(lastRun)}
          </p>
          {lastRun?.status === SYNC_STATUS.Failed && lastRun.errorMessage && (
            <p className="mt-1 text-[12px] text-rose-600 break-words">{lastRun.errorMessage}</p>
          )}
          {lastRun?.status === SYNC_STATUS.Completed && lastRun.note && (
            <p className="mt-1 text-[12px] text-slate-500 break-words"><span className="font-bold">AI note:</span> {lastRun.note}</p>
          )}
          {lastRun?.status === SYNC_STATUS.Completed && lastRun.errorMessage && (
            <p className="mt-1 text-[12px] text-amber-700 break-words">{lastRun.errorMessage}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setShowSources((v) => !v); setShowSettings(false); }}
            className={`inline-flex items-center gap-1.5 rounded-xl border text-slate-700 text-[13px] font-bold px-3.5 py-2.5 cursor-pointer ${showSources ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
            <Globe2 className="w-4 h-4" /> Sources
          </button>
          <button onClick={() => { setShowSettings((v) => !v); setShowSources(false); }}
            className={`inline-flex items-center gap-1.5 rounded-xl border text-slate-700 text-[13px] font-bold px-3.5 py-2.5 cursor-pointer ${showSettings ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
            <Settings2 className="w-4 h-4" /> Settings
          </button>
          <button onClick={onSync} disabled={syncDisabled || !enabled} title={!enabled ? 'Sync is switched off in Settings' : undefined}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-extrabold px-4 py-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {running ? 'Syncing…' : `Sync ${label.toLowerCase()}`}
          </button>
        </div>
      </div>

      {showSources && <SourcesManager category={category} onError={onError} />}
      {showSettings && <SettingsManager category={category} label={label} onSaved={onChanged} onError={onError} />}

      <div role="tablist" aria-label="Draft status" className="flex gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto sm:inline-flex overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((t) => {
          const on = status === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={on} onClick={() => setStatus(t.id)}
              className={`shrink-0 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-bold cursor-pointer ${on ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
              {on && !loading && <span className="rounded-full bg-indigo-50 text-indigo-700 px-1.5 text-[11px] font-extrabold">{total}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
          <Radar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-[14px] font-bold text-slate-700">Nothing here yet</p>
          <p className="text-[13px] text-slate-500">{status === CONTENT_DRAFT_STATUS.Pending ? `Click “Sync ${label.toLowerCase()}” to let the AI collect the latest.` : 'Nothing in this list.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingList && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
              <label className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-indigo-600" /> Select all
              </label>
              {selected.size > 0 && bulkStep === 'idle' && (
                <>
                  <span className="text-[12.5px] text-slate-500">
                    {selected.size} selected{skippedForWarnings > 0 ? ` · ${skippedForWarnings} with link warnings won’t be bulk-published` : ''}
                  </span>
                  <button onClick={() => setBulkStep('approve')} disabled={eligible.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-extrabold px-3.5 py-1.5 cursor-pointer disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Approve selected ({eligible.length})
                  </button>
                  <button onClick={() => setBulkStep('reject')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[12.5px] font-bold px-3.5 py-1.5 cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" /> Reject selected ({selected.size})
                  </button>
                </>
              )}
              {bulkStep === 'approve' && (
                <>
                  <span className="text-[13px] font-bold text-emerald-800">Publish {eligible.length} draft{eligible.length === 1 ? '' : 's'} to the live site?</span>
                  {selectedItems.some((i) => SHAREABLE.has(i.category)) && (
                    <label className="inline-flex items-center gap-2 min-h-[36px] text-[12.5px] font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={bulkSkipSocial} onChange={(e) => setBulkSkipSocial(e.target.checked)} className="w-4 h-4" /> Skip social posting
                    </label>
                  )}
                  <button onClick={() => runBulk('approve')} disabled={bulkBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-extrabold px-3.5 py-1.5 cursor-pointer disabled:opacity-60">
                    {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Yes, publish
                  </button>
                  <button onClick={() => setBulkStep('idle')} disabled={bulkBusy} className="rounded-lg border border-slate-200 text-slate-600 text-[12.5px] font-bold px-3 py-1.5 cursor-pointer">Back</button>
                </>
              )}
              {bulkStep === 'reject' && (
                <>
                  <span className="text-[13px] font-bold text-rose-700">Reject {selected.size} draft{selected.size === 1 ? '' : 's'}?</span>
                  <button onClick={() => runBulk('reject')} disabled={bulkBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-extrabold px-3.5 py-1.5 cursor-pointer disabled:opacity-60">
                    {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Yes, reject
                  </button>
                  <button onClick={() => setBulkStep('idle')} disabled={bulkBusy} className="rounded-lg border border-slate-200 text-slate-600 text-[12.5px] font-bold px-3 py-1.5 cursor-pointer">Back</button>
                </>
              )}
            </div>
          )}
          {bulkResult && (
            <div role="status" className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 text-[13px] text-indigo-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <ul className="flex-1 space-y-0.5 font-semibold">{bulkResult.map((l, i) => <li key={i} className="break-words">{l}</li>)}</ul>
              <button onClick={() => setBulkResult(null)} aria-label="Dismiss" className="shrink-0 w-6 h-6 rounded-md grid place-items-center hover:bg-indigo-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {items.map((d) => (
            <DraftCard key={d.id} draft={d} categories={categories} onChanged={changed} onError={onError}
              selectable={pendingList} selected={selected.has(d.id)} onSelect={(on) => toggleOne(d.id, on)} />
          ))}
          {items.length < total && (
            <button onClick={loadMore} disabled={loadingMore}
              className="w-full rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-700 text-[13px] font-bold px-4 py-2.5 cursor-pointer disabled:opacity-60">
              {loadingMore ? 'Loading…' : `Load more (${total - items.length} more)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

const DraftCard: React.FC<{
  draft: ApiContentDraftListItem;
  categories: ApiCategory[];
  onChanged: () => void;
  onError: (msg: string | null) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (on: boolean) => void;
}> = ({ draft, categories, onChanged, onError, selectable, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<ApiContentDraft | null>(null);
  const [mode, setMode] = useState<'view' | 'fields' | 'json'>('view');
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const pending = draft.status === CONTENT_DRAFT_STATUS.Pending;
  const tone = pending ? 'bg-amber-400' : draft.status === CONTENT_DRAFT_STATUS.Approved ? 'bg-emerald-500' : 'bg-rose-500';

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!full) {
      try {
        const d = await getContentDraft(draft.id);
        setFull(d);
        setJson(JSON.stringify(d.payload, null, 2));
      } catch { onError('Could not load this draft.'); }
    }
  };

  const setPayloadField = (key: string, value: unknown) => {
    if (!full) return;
    const next = { ...full.payload, [key]: value };
    setFull({ ...full, payload: next });
    setJson(JSON.stringify(next, null, 2));
  };

  /** Leaving the JSON editor applies what was typed, so the form and preview always show the edited values. */
  const switchMode = (next: 'view' | 'fields' | 'json') => {
    if (mode === 'json' && next !== 'json' && full) {
      try { setFull({ ...full, payload: JSON.parse(json) }); }
      catch { onError('The edited JSON isn\u2019t valid \u2014 fix it first.'); return; }
    }
    onError(null);
    setMode(next);
  };

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true); onError(null);
    try { await fn(); onChanged(); }
    catch (e) { onError(e instanceof ApiError ? e.message : fallback); }
    finally { setBusy(false); }
  };

  const [skipSocial, setSkipSocial] = useState(false);

  const approve = () => {
    let payload: Record<string, unknown> | undefined;
    if (mode === 'json') {
      try { payload = JSON.parse(json); } catch { onError('The edited JSON isn’t valid — fix it or switch back to the preview.'); return; }
    } else if (full) {
      payload = trimStrings(full.payload);
    }
    return run(() => approveContentDraft(draft.id, payload, skipSocial), 'Could not publish this draft.');
  };

  const payload = full?.payload ?? {};
  const hasCategoryId = 'categoryId' in payload;
  const scalarRows = Object.entries(payload).filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== '' && typeof v !== 'object');
  const body = (payload.description ?? payload.content) as string | undefined;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white pl-5 pr-4 py-4 sm:pr-5 hover:border-indigo-300 transition">
      <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${tone}`} />
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2.5">
            {selectable && (
              <input type="checkbox" checked={!!selected} onChange={(e) => onSelect?.(e.target.checked)} aria-label={`Select ${draft.title}`}
                className="mt-1 w-4 h-4 accent-indigo-600 shrink-0 cursor-pointer" />
            )}
            <h4 className="font-extrabold text-[15px] leading-snug text-slate-900 break-words min-w-0">{draft.title}</h4>
          </div>
          {draft.autoPublished && (
            <span className="inline-block rounded-md bg-violet-100 text-violet-800 text-[11.5px] font-extrabold px-2 py-0.5">Auto-published by AI — no review</span>
          )}
          {draft.summary && <p className="text-[13px] text-slate-600 leading-relaxed">{draft.summary}</p>}
          {pending && draft.warnings?.length > 0 && (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-0.5" aria-label="Check before publishing">
              {draft.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-[12.5px] font-semibold text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" /> <span>Check this link: <span className="font-mono">{w}</span></span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-500"><Rss className="w-3.5 h-3.5" />{draft.sourceName}</span>
            {draft.sourceUrl && (
              <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Open source
              </a>
            )}
            <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />Found {when(draft.createdDate)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={toggle} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-700 text-[13px] font-bold px-3.5 py-2 cursor-pointer">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {open ? 'Hide' : 'Preview'}
          </button>
          {pending && !rejecting && (
            <>
              {SHAREABLE.has(draft.category) && (
                <label className="inline-flex items-center gap-2 min-h-[40px] px-1 text-[12.5px] font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={skipSocial} onChange={(e) => setSkipSocial(e.target.checked)} className="w-4 h-4" /> Skip social posting
                </label>
              )}
              <button onClick={approve} disabled={busy || !full}
                title={!full ? 'Open the preview first to check what will be published' : undefined}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[13px] font-extrabold px-4 py-2 cursor-pointer disabled:opacity-50 whitespace-nowrap">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Approve &amp; publish
              </button>
              <button onClick={() => setRejecting(true)} disabled={busy}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-bold px-3.5 py-2 cursor-pointer disabled:opacity-50">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {!pending && (
            <button onClick={() => run(() => deleteContentDraft(draft.id), 'Could not remove this draft.')} disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 text-[13px] font-bold px-3.5 py-2 cursor-pointer disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Reason (optional)"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:border-rose-400" />
          <button onClick={() => run(() => rejectContentDraft(draft.id, notes || undefined), 'Could not reject this draft.')} disabled={busy}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-extrabold px-4 py-2 cursor-pointer disabled:opacity-50">Confirm reject</button>
          <button onClick={() => setRejecting(false)} className="rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold px-3.5 py-2 cursor-pointer">Cancel</button>
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
          {!full ? (
            <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ) : (
            <>
              {pending && (
                <div className="flex flex-wrap items-center gap-3">
                  {hasCategoryId && (
                    <label className="inline-flex items-center gap-2 text-[12.5px] font-bold text-slate-600">
                      Site category
                      <select value={String(payload.categoryId ?? '')} onChange={(e) => setPayloadField('categoryId', e.target.value ? Number(e.target.value) : null)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-800">
                        <option value="">— none —</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                  )}
                  <div role="group" aria-label="Draft view" className="inline-flex rounded-lg bg-slate-100 p-0.5">
                    {([['view', 'Preview', Eye], ['fields', 'Edit fields', Pencil], ['json', 'Edit JSON', Code2]] as const).map(([m, text, Icon]) => (
                      <button key={m} onClick={() => switchMode(m)} aria-pressed={mode === m}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-bold cursor-pointer ${mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        <Icon className="w-3.5 h-3.5" /> {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'json' ? (
                <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={18}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[12px] leading-relaxed focus:outline-none focus:border-indigo-400" />
              ) : mode === 'fields' ? (
                <FieldsEditor category={draft.category} payload={payload} onChange={setPayloadField} />
              ) : (
                <>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                    {scalarRows.map(([k, v]) => (
                      <div key={k} className="flex gap-2 min-w-0">
                        <dt className="shrink-0 font-bold text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</dt>
                        <dd className="min-w-0 break-words text-slate-800">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  {body && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 max-h-80 overflow-auto text-[13px] text-slate-700 whitespace-pre-wrap break-words">
                      {/<\/?[a-z][\s\S]*>/i.test(body) ? htmlToPlainText(body) : body}
                    </div>
                  )}
                </>
              )}
              {full.reviewNotes && <p className="text-[12.5px] text-slate-500"><span className="font-bold">Review note:</span> {full.reviewNotes}</p>}
              {full.createdEntityId != null && <p className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Published as record #{full.createdEntityId}</p>}
            </>
          )}
        </div>
      )}
    </article>
  );
};

// ---------------------------------------------------------------------------------------------

const SourcesManager: React.FC<{ category: ContentCategory; onError: (msg: string | null) => void }> = ({ category, onError }) => {
  const [sources, setSources] = useState<ApiContentSource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getContentSources(category).then(setSources).catch(() => setSources([])).finally(() => setLoaded(true));
  }, [category]);
  useEffect(() => { load(); }, [load]);

  const guard = async (fn: () => Promise<unknown>, fallback: string) => {
    onError(null);
    try { await fn(); load(); } catch (e) { onError(e instanceof ApiError ? e.message : fallback); }
  };

  const add = async () => {
    if (!name.trim() || !url.trim()) { onError('Source name and URL are required.'); return; }
    setSaving(true);
    await guard(async () => {
      await createContentSource({ category, name: name.trim(), sourceType, url: url.trim(), isActive: true });
      setName(''); setUrl('');
    }, 'Could not add this source.');
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
      <p className="text-[12.5px] text-slate-600">The AI always searches the web on its own. Sources you add here are checked <strong>first</strong> on every sync (a website page or a public Telegram channel).</p>
      {!loaded ? <div className="h-10 rounded-lg bg-slate-100 animate-pulse" /> : sources.length === 0 ? (
        <p className="text-[12.5px] text-slate-400">No custom sources for this category yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-[13px]">
              {s.sourceType === 1 ? <MessageCircle className="w-4 h-4 text-sky-500 shrink-0" /> : <Globe2 className="w-4 h-4 text-indigo-500 shrink-0" />}
              <span className="font-bold text-slate-800 truncate">{s.name}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate flex-1 min-w-0">{s.url}</a>
              <button onClick={() => guard(() => updateContentSource(s.id, { category, name: s.name, sourceType: s.sourceType, url: s.url, isActive: !s.isActive }), 'Could not update this source.')}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold cursor-pointer ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                {s.isActive ? 'Active' : 'Paused'}
              </button>
              <button onClick={() => guard(() => deleteContentSource(s.id), 'Could not delete this source.')} aria-label={`Delete ${s.name}`}
                className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={sourceType} onChange={(e) => setSourceType(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-semibold">
          <option value={0}>Website</option>
          <option value={1}>Telegram channel</option>
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={150}
          className="sm:w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-400" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={sourceType === 1 ? 'https://t.me/channelname' : 'https://…'} maxLength={1000}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-400" />
        <button onClick={add} disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-extrabold px-4 py-2 cursor-pointer disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

const SettingsManager: React.FC<{
  category: ContentCategory;
  label: string;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}> = ({ category, label, onSaved, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<ApiContentCategorySetting | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [maxItems, setMaxItems] = useState(10);
  const [freshDays, setFreshDays] = useState(7);
  const [extra, setExtra] = useState('');
  const [autoPublish, setAutoPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const apply = (s: ApiContentCategorySetting) => {
    setSaved(s); setIsEnabled(s.isEnabled); setMaxItems(s.maxItemsPerRun); setFreshDays(s.freshnessDays); setExtra(s.extraInstructions ?? ''); setAutoPublish(s.autoPublish);
  };

  useEffect(() => {
    getContentSettings()
      .then((all) => { const s = all.find((x) => x.category === category); if (s) apply(s); })
      .catch(() => onError('Could not load the settings.'))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const invalid = !(maxItems >= 1 && maxItems <= 30) || !(freshDays >= 1 && freshDays <= 365);
  const dirty = !!saved && (saved.isEnabled !== isEnabled || saved.maxItemsPerRun !== maxItems || saved.freshnessDays !== freshDays || (saved.extraInstructions ?? '') !== extra.trim() || saved.autoPublish !== autoPublish);

  const save = async () => {
    setSaving(true); onError(null); setJustSaved(false);
    try {
      apply(await updateContentSetting(category, { isEnabled, maxItemsPerRun: maxItems, freshnessDays: freshDays, extraInstructions: extra.trim() || null, autoPublish }));
      setJustSaved(true);
      onSaved();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />;

  const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-400';
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3.5">
      <p className="text-[12.5px] text-slate-600">
        These apply to every <strong>{label.toLowerCase()}</strong> sync. {saved && !saved.isCustomized && 'Nothing changed yet, so the server defaults are shown.'}
      </p>

      <label className="flex flex-wrap items-center gap-x-2.5 gap-y-1 cursor-pointer w-fit">
        <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
        <span className="text-[13px] font-bold text-slate-800">Include in syncs</span>
        <span className="text-[12px] text-slate-500">Off means “Sync all” skips it and its own Sync button is disabled.</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[12.5px] font-bold text-slate-600">Max items per sync (1–30)</span>
          <input type="number" min={1} max={30} value={maxItems} onChange={(e) => setMaxItems(Number(e.target.value))} className={field} />
        </label>
        <label className="block">
          <span className="text-[12.5px] font-bold text-slate-600">Only items from the last … days (1–365)</span>
          <input type="number" min={1} max={365} value={freshDays} onChange={(e) => setFreshDays(Number(e.target.value))} className={field} />
        </label>
      </div>

      <label className="block">
        <span className="text-[12.5px] font-bold text-slate-600">Extra instructions for the AI <span className="font-medium text-slate-400">(optional)</span></span>
        <textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={1000} rows={3}
          placeholder="e.g. Gujarat government only. Skip private-sector and coaching-institute news."
          className={field} />
        <span className="text-[11.5px] text-slate-400">{extra.length}/1000 · The AI still has to follow the accuracy and copyright rules.</span>
      </label>

      {saved?.autoPublishAllowed ? (
        <label className="flex flex-wrap items-center gap-x-2.5 gap-y-1 cursor-pointer w-fit">
          <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} className="w-4 h-4 accent-violet-600" />
          <span className="text-[13px] font-bold text-slate-800">Auto-publish without review</span>
          <span className="text-[12px] text-slate-500">Off by default. Only drafts whose links all check out are published; the rest still wait for you. Turn on once you trust the output.</span>
        </label>
      ) : (
        <p className="text-[12px] text-slate-500">Every draft here waits for your approval. Auto-publish is only available for News and Study Notes.</p>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || invalid || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-extrabold px-4 py-2 cursor-pointer disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save settings
        </button>
        {invalid && <span className="text-[12px] font-semibold text-rose-600">Check the number ranges.</span>}
        {justSaved && !dirty && <span className="text-[12px] font-semibold text-emerald-700">Saved. Used from the next sync.</span>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

const RunHistory: React.FC<{ anyRunning: boolean }> = ({ anyRunning }) => {
  const [runs, setRuns] = useState<ApiContentSyncRun[] | null>(null);

  const load = useCallback(() => {
    getContentSyncRuns().then(setRuns).catch(() => setRuns((prev) => prev ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!anyRunning) { load(); return; }
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [anyRunning, load]);

  const labelOf = (c: string) => TABS.find((t) => t.id === c)?.label ?? c;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h3 className="font-extrabold text-[16px] text-slate-900 flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> Recent sync runs</h3>
      {runs === null ? (
        <div className="mt-3 h-20 rounded-xl bg-slate-100 animate-pulse" />
      ) : runs.length === 0 ? (
        <p className="mt-2 text-[13px] text-slate-500">No syncs have run yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {runs.map((r) => {
            const st = STATUS_LABEL[r.status] ?? STATUS_LABEL[SYNC_STATUS.Failed];
            return (
              <li key={r.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start gap-x-4 gap-y-1">
                <div className="sm:w-44 shrink-0 flex items-center gap-2">
                  <span className="font-bold text-[13px] text-slate-800">{labelOf(r.category)}</span>
                  {r.scope === 'gujarat' && <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-[11px] font-extrabold">Gujarat</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${st.cls}`}>{st.text}</span>
                </div>
                <div className="flex-1 min-w-0 text-[12.5px] text-slate-600">
                  <p>
                    <span className="font-semibold">{r.newCount} new</span> · {r.skippedCount} skipped{r.invalidCount ? ` · ${r.invalidCount} invalid` : ''}
                    <span className="text-slate-400"> · {when(r.startedAt)}{duration(r) ? ` · took ${duration(r)}` : ''}</span>
                  </p>
                  {r.note && <p className="mt-0.5 text-slate-500 break-words"><span className="font-bold">AI note:</span> {r.note}</p>}
                  {r.errorMessage && <p className={`mt-0.5 break-words ${r.status === SYNC_STATUS.Failed ? 'text-rose-600' : 'text-amber-700'}`}>{r.errorMessage}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------

const FieldsEditor: React.FC<{
  category: ContentCategory;
  payload: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ category, payload, onChange }) => {
  const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-400';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {DRAFT_FIELDS[category].map((f) => {
        const value = displayFieldValue(f.kind, payload[f.key]);
        const missing = f.required && value.trim() === '';
        const wide = f.kind === 'textarea' || f.kind === 'url';
        const common = {
          id: `fld-${f.key}`,
          value,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(f.key, parseFieldValue(f.kind, e.target.value)),
          className: `${field} ${missing ? 'border-rose-300 bg-rose-50/40' : ''}`,
        };
        return (
          <label key={f.key} htmlFor={common.id} className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
            <span className="text-[12.5px] font-bold text-slate-600">{f.label}{f.required && <span className="text-rose-500"> *</span>}</span>
            {f.kind === 'textarea'
              ? <textarea {...common} rows={f.key === 'content' || f.key === 'description' ? 8 : 3} />
              : <input {...common} type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : f.kind === 'url' ? 'url' : 'text'} />}
            {missing ? <span className="text-[11.5px] font-semibold text-rose-600">Required</span>
              : f.hint ? <span className="text-[11.5px] text-slate-400">{f.hint}</span> : null}
          </label>
        );
      })}
      <p className="sm:col-span-2 text-[11.5px] text-slate-400">SEO keyword lists, FAQs and other advanced fields are kept as they are. Use “Edit JSON” to change them.</p>
    </div>
  );
};
