import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar, Rss, Send, Trash2, X, Loader2, ExternalLink, ChevronDown, ChevronUp, Plus, Globe2, MessageCircle, RefreshCw,
} from 'lucide-react';
import {
  searchJobDrafts, rejectJobDraft, deleteJobDraft, JOB_DRAFT_STATUS,
  ApiJobDraftListItem, ApiJobDraft, getJobDraft,
  getJobFeedSources, createJobFeedSource, updateJobFeedSource, deleteJobFeedSource,
  ApiJobFeedSource, UpsertJobFeedSourcePayload, syncWatcherNow,
} from '../../api/jobDrafts';
import { getCategories, ApiCategory } from '../../api/categories';
import { ApiError } from '../../api/client';

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <Radar className="w-5 h-5 text-indigo-600" /> Scraper Draft Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Postings found by the watcher agent on watched sites/Telegram channels, waiting for your review.
              Nothing here goes live until you click "Review &amp; Post" and publish it yourself.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncNow} disabled={syncing}
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-40">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync Now
            </button>
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {totalCount} {STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()}
            </span>
          </div>
        </div>

        {syncMessage && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl px-3 py-2.5 flex items-center justify-between">
            {syncMessage}
            <button onClick={() => setSyncMessage(null)} className="cursor-pointer shrink-0 ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="flex gap-2 text-xs font-bold">
          {STATUS_TABS.map((t) => (
            <button key={t.id} onClick={() => setStatus(t.id)}
              className={`px-3 py-1.5 rounded-xl cursor-pointer ${status === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading drafts…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">
            Nothing here yet. Once a watcher agent is set up (see "Watched Sources" below), new postings it finds will show up in this queue.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((draft) => (
              <div key={draft.id} className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{draft.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      {draft.organizationName && <span>{draft.organizationName}</span>}
                      {draft.totalPosts != null && <span>{draft.totalPosts} posts</span>}
                      {draft.lastDate && <span>Last date: {new Date(draft.lastDate).toLocaleDateString()}</span>}
                      {draft.state && <span>{draft.state}</span>}
                      {draft.suggestedCategoryName && <span>Suggested: {draft.suggestedCategoryName}</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      Source: {draft.sourceName}
                      {draft.sourceUrl && (
                        <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 inline-flex items-center gap-0.5 hover:underline">
                          <ExternalLink className="w-3 h-3" /> link
                        </a>
                      )}
                      · found {new Date(draft.createdDate).toLocaleString()}
                    </div>
                    {draft.shortDescription && <div className="text-xs text-slate-600">{draft.shortDescription}</div>}
                  </div>
                </div>

                <button onClick={() => toggleExpand(draft.id)} className="text-[11px] text-indigo-600 font-bold cursor-pointer flex items-center gap-1">
                  {expandedId === draft.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expandedId === draft.id ? 'Hide raw notification text' : 'Show raw notification text'}
                </button>
                {expandedId === draft.id && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 whitespace-pre-line max-h-64 overflow-y-auto">
                    {expandedDraft?.rawContent || 'Loading…'}
                  </div>
                )}

                {status === JOB_DRAFT_STATUS.Pending && (
                  rejectingId === draft.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        rows={2}
                        placeholder="Why is this being rejected? (optional, for your own records)…"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleReject(draft.id)} disabled={busyId === draft.id}
                          className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
                          {busyId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Confirm reject
                        </button>
                        <button onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                          className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleReviewAndPost(draft)}
                        disabled={busyId === draft.id}
                        className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
                        {busyId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Review &amp; Post
                      </button>
                      <button onClick={() => setRejectingId(draft.id)}
                        className="bg-white border border-slate-200 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )
                )}
                {status !== JOB_DRAFT_STATUS.Pending && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleDelete(draft.id)} disabled={busyId === draft.id}
                      className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Remove from queue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <button
          onClick={() => { setShowSources(!showSources); if (!sourcesLoaded) loadSources(); }}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h3 className="text-sm font-heading font-extrabold text-slate-900 flex items-center gap-2">
            <Rss className="w-4 h-4 text-indigo-600" /> Watched Sources ({sources.length})
          </h3>
          {showSources ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <p className="text-xs text-slate-500">
          Official websites and Telegram channels a scheduled watcher agent should poll for new postings.
          Adding a source here doesn't start watching it by itself — it's the config list the agent reads.
        </p>

        {showSources && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {s.sourceType === 1 ? <MessageCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" /> : <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{s.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{s.url}</div>
                    {s.lastFetchedAt && (
                      <div className="text-[10px] text-slate-400">
                        Last fetched {new Date(s.lastFetchedAt).toLocaleString()} · {s.lastFetchNewCount} new
                        · {s.lastFetchSkippedReviewedCount} already reviewed · {s.lastFetchSkippedPendingCount} already pending
                        {s.lastError && <span className="text-rose-500"> · {s.lastError}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-bold px-2.5 py-1 rounded-lg ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </span>
                  <button onClick={() => handleToggleSourceActive(s)} className="bg-white border border-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-lg cursor-pointer">
                    {s.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleDeleteSource(s.id)} className="bg-white border border-slate-200 text-rose-500 font-bold px-2.5 py-1 rounded-lg cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {sources.length === 0 && sourcesLoaded && (
              <div className="text-xs text-slate-400 font-semibold">No sources added yet.</div>
            )}

            {showAddSource ? (
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Name (e.g. GSSSB Notifications)" value={sourceForm.name}
                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                  <select value={sourceForm.sourceType}
                    onChange={(e) => setSourceForm({ ...sourceForm, sourceType: Number(e.target.value) })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <option value={0}>Official Website</option>
                    <option value={1}>Telegram Channel</option>
                  </select>
                  <input placeholder="URL (site page, or t.me/channelname)" value={sourceForm.url}
                    onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:col-span-2" />
                  <input placeholder="Organization hint (optional)" value={sourceForm.organizationHint || ''}
                    onChange={(e) => setSourceForm({ ...sourceForm, organizationHint: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                  <select value={sourceForm.defaultCategoryId ?? ''}
                    onChange={(e) => setSourceForm({ ...sourceForm, defaultCategoryId: e.target.value ? Number(e.target.value) : null })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <option value="">No default category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input placeholder="State hint (optional, e.g. Gujarat)" value={sourceForm.stateHint || ''}
                    onChange={(e) => setSourceForm({ ...sourceForm, stateHint: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:col-span-2" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleAddSource} disabled={savingSource}
                    className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40">
                    {savingSource ? 'Saving…' : 'Add source'}
                  </button>
                  <button onClick={() => { setShowAddSource(false); setSourceForm(emptySourceForm); }}
                    className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddSource(true)}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add a source
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
