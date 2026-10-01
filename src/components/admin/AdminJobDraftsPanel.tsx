import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar, Rss, Send, Trash2, X, Loader2, ExternalLink, ChevronDown, ChevronUp, Plus, Globe2, MessageCircle, RefreshCw,
  Building2, Users, CalendarClock, MapPin, Tag, Clock3, Info, AlertTriangle, Pause, Play,
} from 'lucide-react';
import { DeadlinePill } from '../ui/kit';
import {
  searchJobDrafts, rejectJobDraft, deleteJobDraft, JOB_DRAFT_STATUS,
  ApiJobDraftListItem, ApiJobDraft, getJobDraft,
  getJobFeedSources, createJobFeedSource, updateJobFeedSource, deleteJobFeedSource,
  ApiJobFeedSource, UpsertJobFeedSourcePayload, syncWatcherNow,
} from '../../api/jobDrafts';
import { getCategories, ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';
import { Select } from '../ui/Select';

const STATUS_TABS: { id: number; label: string }[] = [
  { id: JOB_DRAFT_STATUS.Pending, label: 'Pending Review' },
  { id: JOB_DRAFT_STATUS.Approved, label: 'Approved' },
  { id: JOB_DRAFT_STATUS.Rejected, label: 'Rejected' },
];

const emptySourceForm: UpsertJobFeedSourcePayload = {
  name: '', organizationHint: '', sourceType: 0, url: '', defaultCategoryId: null, stateHint: '', isActive: true,
};

export const AdminJobDraftsPanel: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<number>(JOB_DRAFT_STATUS.Pending);
  const [items, setItems] = useState<ApiJobDraftListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<ApiJobDraft | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [sources, setSources] = useState<ApiJobFeedSource[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [sourceForm, setSourceForm] = useState<UpsertJobFeedSourcePayload>(emptySourceForm);
  const [showAddSource, setShowAddSource] = useState(false);
  const [savingSource, setSavingSource] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    searchJobDrafts(status, 1, 50)
      .then((r) => { setItems(r.items); setTotalCount(r.totalCount); })
      .catch(() => { setItems([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      // Snapshot each source's last report so we can tell which ones this run has reported on —
      // comparing the raw values sidesteps client/server clock and timezone differences.
      const before = await getJobFeedSources().catch(() => [] as ApiJobFeedSource[]);
      const activeIds = before.filter((s) => s.isActive).map((s) => s.id);
      const previousFetch = new Map(before.map((s) => [s.id, s.lastFetchedAt ?? null]));

      await syncWatcherNow();
      setSyncMessage('Sync started — checking watched sources now. This usually takes a few minutes; a summary will appear here when it finishes.');

      let checks = 0;
      const interval = setInterval(async () => {
        checks += 1;
        load();
        const now = await getJobFeedSources().catch(() => null);
        if (!now) return;
        setSources(now);
        const reported = now.filter((s) => activeIds.includes(s.id) && (s.lastFetchedAt ?? null) !== previousFetch.get(s.id));
        const done = reported.length === activeIds.length;
        if (!done && checks < 30) return;

        clearInterval(interval);
        if (reported.length === 0) {
          setSyncMessage('Sync is taking longer than expected — no source has reported back yet. Check back later.');
          return;
        }
        const sum = (f: (s: ApiJobFeedSource) => number) => reported.reduce((n, s) => n + f(s), 0);
        const failed = reported.filter((s) => s.lastError).length;
        setSyncMessage(
          `${sum((s) => s.lastFetchNewCount)} new posts added, `
          + `${sum((s) => s.lastFetchSkippedReviewedCount)} skipped (already approved/rejected), `
          + `${sum((s) => s.lastFetchSkippedPendingCount)} skipped (already pending)`
          + (failed ? ` · ${failed} source${failed > 1 ? 's' : ''} failed to fetch` : '')
          + (done ? '' : ` · ${activeIds.length - reported.length} source(s) still hadn't reported`),
        );
      }, 20000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start a sync.');
    } finally {
      setSyncing(false);
    }
  };

  const loadSources = useCallback(() => {
    getJobFeedSources().then(setSources).catch(() => setSources([])).finally(() => setSourcesLoaded(true));
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setExpandedDraft(null); return; }
    setExpandedId(id);
    setExpandedDraft(null);
    try {
      const full = await getJobDraft(id);
      setExpandedDraft(full);
    } catch { /* keep collapsed content minimal on failure */ }
  };

  const handleReviewAndPost = async (draft: ApiJobDraftListItem) => {
    setBusyId(draft.id);
    try {
      const rawContent = expandedDraft?.id === draft.id ? expandedDraft.rawContent : (await getJobDraft(draft.id)).rawContent;
      navigate('/admin/mobile-post', {
        state: { draftId: draft.id, notificationText: rawContent || '' },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this draft.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: number) => {
    setBusyId(id); setError(null);
    try {
      await rejectJobDraft(id, rejectNotes.trim() || undefined);
      setRejectingId(null);
      setRejectNotes('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reject this draft.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setBusyId(id); setError(null);
    try {
      await deleteJobDraft(id);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete this draft.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddSource = async () => {
    if (!sourceForm.name.trim() || !sourceForm.url.trim()) {
      setError('Source name and URL are required.');
      return;
    }
    setSavingSource(true); setError(null);
    try {
      await createJobFeedSource(sourceForm);
      setSourceForm(emptySourceForm);
      setShowAddSource(false);
      loadSources();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this source.');
    } finally {
      setSavingSource(false);
    }
  };

  const handleToggleSourceActive = async (source: ApiJobFeedSource) => {
    try {
      await updateJobFeedSource(source.id, {
        name: source.name, organizationHint: source.organizationHint, sourceType: source.sourceType,
        url: source.url, defaultCategoryId: source.defaultCategoryId, stateHint: source.stateHint,
        isActive: !source.isActive,
      });
      loadSources();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this source.');
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      await deleteJobFeedSource(id);
      loadSources();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete this source.');
    }
  };

  const tone = status === JOB_DRAFT_STATUS.Pending ? 'bg-amber-400' : status === JOB_DRAFT_STATUS.Approved ? 'bg-emerald-500' : 'bg-rose-500';
  const activeSources = sources.filter((x) => x.isActive).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 bg-[radial-gradient(420px_220px_at_100%_0%,rgba(34,211,238,0.35),transparent_60%),linear-gradient(135deg,#0b1a3f,#1e3a8a_60%,#0e7490)]">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 grid place-items-center shrink-0"><Radar className="w-6 h-6 text-cyan-300" /></span>
            <div className="min-w-0">
              <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-tight">Scraper queue</h2>
              <p className="text-[13px] text-blue-100/80 max-w-2xl">Postings the watcher found on watched sites and Telegram channels. Nothing goes live until you open it with “Review &amp; post” and publish it yourself.</p>
            </div>
          </div>
          <button onClick={handleSyncNow} disabled={syncing}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[13px] px-4 py-2.5 cursor-pointer disabled:opacity-60 whitespace-nowrap">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {syncing ? 'Starting…' : 'Sync now'}
          </button>
        </div>
      </section>

      {syncMessage && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-3 text-[13px] font-semibold text-cyan-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600" />
          <span className="flex-1">{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} aria-label="Dismiss" className="shrink-0 w-6 h-6 rounded-md grid place-items-center hover:bg-cyan-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 w-6 h-6 rounded-md grid place-items-center hover:bg-rose-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div role="tablist" aria-label="Draft status" className="flex gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto sm:inline-flex overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((t) => {
            const on = status === t.id;
            return (
              <button key={t.id} role="tab" aria-selected={on} onClick={() => setStatus(t.id)}
                className={`shrink-0 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 sm:px-3.5 py-2 text-[13px] font-bold cursor-pointer ${on ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {t.label}
                {on && !loading && <span className="rounded-full bg-blue-50 text-blue-700 px-1.5 text-[11px] font-extrabold">{totalCount}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <Radar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="mt-2 text-[14px] font-bold text-slate-700">Queue is empty</p>
            <p className="text-[13px] text-slate-500">New postings from your watched sources will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((draft) => (
              <article key={draft.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white pl-5 pr-4 py-4 sm:pr-5 hover:border-blue-300 transition">
                <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${tone}`} />
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-extrabold text-[15.5px] leading-snug text-slate-900 break-words">{draft.title}</h3>
                    <div className="flex flex-wrap gap-1.5 text-[12px] font-semibold text-slate-600">
                      {draft.organizationName && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 max-w-full"><Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate">{draft.organizationName}</span></span>}
                      {draft.totalPosts != null && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1"><Users className="w-3.5 h-3.5 text-slate-400" />{draft.totalPosts.toLocaleString('en-IN')} posts</span>}
                      {draft.state && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{draft.state}</span>}
                      {draft.suggestedCategoryName && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 px-2 py-1"><Tag className="w-3.5 h-3.5" />{draft.suggestedCategoryName}</span>}
                      {draft.lastDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1"><CalendarClock className="w-3.5 h-3.5 text-slate-400" />Last date {new Date(draft.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {status === JOB_DRAFT_STATUS.Pending && <DeadlinePill date={draft.lastDate} />}
                        </span>
                      )}
                    </div>
                    {draft.shortDescription && <p className="text-[13px] text-slate-600 leading-relaxed">{draft.shortDescription}</p>}
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-500"><Rss className="w-3.5 h-3.5" />{draft.sourceName}</span>
                      {draft.sourceUrl && (
                        <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-blue-600 hover:underline">
                          <ExternalLink className="w-3 h-3" /> Open source
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />Found {new Date(draft.createdDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  {status === JOB_DRAFT_STATUS.Pending && rejectingId !== draft.id && (
                    <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 lg:w-40">
                      <button onClick={() => handleReviewAndPost(draft)} disabled={busyId === draft.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-[13px] font-extrabold px-4 py-2.5 cursor-pointer disabled:opacity-50 whitespace-nowrap">
                        {busyId === draft.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Review &amp; post
                      </button>
                      <button onClick={() => setRejectingId(draft.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[13px] font-bold px-4 py-2.5 cursor-pointer whitespace-nowrap">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                  {status !== JOB_DRAFT_STATUS.Pending && (
                    <button onClick={() => handleDelete(draft.id)} disabled={busyId === draft.id}
                      className="shrink-0 self-start inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:text-red-600 bg-white text-slate-600 text-[13px] font-bold px-3.5 py-2 cursor-pointer disabled:opacity-50">
                      {busyId === draft.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Remove from queue
                    </button>
                  )}
                </div>

                {status === JOB_DRAFT_STATUS.Pending && rejectingId === draft.id && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50/60 p-3 space-y-2.5">
                    <label className="block text-[12.5px] font-bold text-red-800">Reason for rejecting (optional, for your records)</label>
                    <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={2}
                      placeholder="e.g. Duplicate of an existing post, or not a government job"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleReject(draft.id)} disabled={busyId === draft.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-extrabold px-4 py-2.5 cursor-pointer disabled:opacity-50">
                        {busyId === draft.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Confirm reject
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                        className="rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-bold px-4 py-2.5 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => toggleExpand(draft.id)} className="mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 -ml-2 text-[12.5px] font-bold text-slate-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer">
                  {expandedId === draft.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expandedId === draft.id ? 'Hide raw notification text' : 'Show raw notification text'}
                </button>
                {expandedId === draft.id && (
                  <pre className="mt-2 rounded-xl bg-slate-950 text-slate-200 p-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words font-mono max-h-72 overflow-y-auto">
                    {expandedDraft?.rawContent || 'Loading…'}
                  </pre>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => { setShowSources(!showSources); if (!sourcesLoaded) loadSources(); }}
          aria-expanded={showSources}
          className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-slate-50"
        >
          <span className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 grid place-items-center shrink-0"><Rss className="w-[18px] h-[18px]" /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold text-[16px] text-slate-900">Watched sources</span>
            <span className="block text-[12.5px] text-slate-500">
              {sourcesLoaded ? `${sources.length} source${sources.length === 1 ? '' : 's'} · ${activeSources} active` : 'Official websites and Telegram channels the watcher polls'}
            </span>
          </span>
          <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-500">{showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>

        {showSources && (
          <div className="border-t border-slate-100 p-4 sm:p-5 space-y-3">
            <p className="text-[12.5px] text-slate-500">Adding a source here doesn't start watching it by itself — it's the list the scheduled watcher agent reads.</p>
            {sources.map((s) => (
              <div key={s.id} className={`flex flex-col md:flex-row md:items-center gap-3 rounded-xl border px-3.5 py-3 ${s.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${s.sourceType === 1 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                    {s.sourceType === 1 ? <MessageCircle className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-slate-900 truncate">{s.name}</p>
                    <p className="text-[12px] text-slate-400 truncate">{s.url}</p>
                    {s.lastFetchedAt ? (
                      <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-bold">
                        <span className="rounded-md bg-slate-100 text-slate-500 px-1.5 py-0.5">Fetched {new Date(s.lastFetchedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5">{s.lastFetchNewCount} new</span>
                        <span className="rounded-md bg-slate-100 text-slate-500 px-1.5 py-0.5">{s.lastFetchSkippedReviewedCount} already reviewed</span>
                        <span className="rounded-md bg-slate-100 text-slate-500 px-1.5 py-0.5">{s.lastFetchSkippedPendingCount} already pending</span>
                        {s.lastError && <span className="rounded-md bg-rose-50 text-rose-600 px-1.5 py-0.5 break-all">{s.lastError}</span>}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11.5px] text-slate-400">Not fetched yet</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 md:pl-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />{s.isActive ? 'Active' : 'Paused'}
                  </span>
                  <button onClick={() => handleToggleSourceActive(s)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-blue-400 hover:text-blue-700 bg-white text-slate-600 text-[12.5px] font-bold px-2.5 py-1.5 cursor-pointer">
                    {s.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{s.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleDeleteSource(s.id)} aria-label={`Delete ${s.name}`} className="w-8 h-8 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 grid place-items-center cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {sources.length === 0 && sourcesLoaded && (
              <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No sources added yet.</div>
            )}

            {showAddSource ? (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white ring-4 ring-blue-500/5 p-4 sm:p-5 space-y-3">
                <p className="font-extrabold text-[15px] text-slate-900">Add a watched source</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] font-bold text-slate-700">
                  <label className="block">Name *
                    <input placeholder="e.g. GSSSB Notifications" value={sourceForm.name}
                      onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </label>
                  <label className="block">Type
                    <Select value={sourceForm.sourceType} aria-label="Source type"
                      onChange={(e) => setSourceForm({ ...sourceForm, sourceType: Number(e.target.value) })}
                      className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                      <option value={0}>Official website</option>
                      <option value={1}>Telegram channel</option>
                    </Select>
                  </label>
                  <label className="block sm:col-span-2">URL *
                    <input placeholder="Site page, or t.me/channelname" value={sourceForm.url}
                      onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </label>
                  <label className="block">Organisation hint
                    <input placeholder="Optional" value={sourceForm.organizationHint || ''}
                      onChange={(e) => setSourceForm({ ...sourceForm, organizationHint: e.target.value })} className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </label>
                  <label className="block">Default category
                    <Select value={sourceForm.defaultCategoryId ?? ''} aria-label="Default category"
                      onChange={(e) => setSourceForm({ ...sourceForm, defaultCategoryId: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                      <option value="">No default category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </label>
                  <label className="block sm:col-span-2">State hint
                    <input placeholder="Optional, e.g. Gujarat" value={sourceForm.stateHint || ''}
                      onChange={(e) => setSourceForm({ ...sourceForm, stateHint: e.target.value })} className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleAddSource} disabled={savingSource}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-[13px] font-extrabold px-5 py-2.5 cursor-pointer disabled:opacity-50">
                    {savingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {savingSource ? 'Saving…' : 'Add source'}
                  </button>
                  <button onClick={() => { setShowAddSource(false); setSourceForm(emptySourceForm); }}
                    className="rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-bold px-4 py-2.5 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddSource(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/40 px-4 py-3 text-[13.5px] font-bold text-slate-600 cursor-pointer">
                <Plus className="w-4 h-4" /> Add a source
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
