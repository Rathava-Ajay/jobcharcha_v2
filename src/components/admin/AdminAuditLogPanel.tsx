import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, ScrollText } from 'lucide-react';
import {
  adminGetAuditEvents, adminGetAuditCategories, adminGetSignupSources,
  AuditEvent, AuditCategoryFacet, SignupSourceStat,
} from '../../api/adminAudit';
import { Select } from '../ui/Select';

const CATEGORY_STYLES: Record<string, string> = {
  Auth: 'bg-indigo-50 text-indigo-700',
  Billing: 'bg-emerald-50 text-emerald-700',
  Contact: 'bg-amber-50 text-amber-700',
  Alerts: 'bg-sky-50 text-sky-700',
  Store: 'bg-fuchsia-50 text-fuchsia-700',
  Employer: 'bg-slate-200 text-slate-700',
};

const PAGE_SIZE = 25;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.round(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function prettyJson(raw?: string | null): string | null {
  if (!raw) return null;
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

export const AdminAuditLogPanel: React.FC = () => {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [facets, setFacets] = useState<AuditCategoryFacet[]>([]);
  const [sources, setSources] = useState<SignupSourceStat[]>([]);
  const [category, setCategory] = useState('');
  const [eventType, setEventType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    adminGetAuditCategories().then(setFacets).catch(() => {});
    adminGetSignupSources().then(setSources).catch(() => {});
  }, []);

  const eventTypeOptions = useMemo(() => {
    if (category) return facets.find((f) => f.category === category)?.eventTypes ?? [];
    return facets.flatMap((f) => f.eventTypes);
  }, [facets, category]);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAuditEvents({
      category: category || undefined,
      eventType: eventType || undefined,
      search: appliedSearch || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.items);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => { setItems([]); setTotalCount(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [category, eventType, appliedSearch, from, to, page]);

  useEffect(() => { load(); }, [load]);

  // Any filter change resets to page 1.
  useEffect(() => { setPage(1); }, [category, eventType, appliedSearch, from, to]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const reset = () => {
    setCategory(''); setEventType(''); setFrom(''); setTo('');
    setSearchInput(''); setAppliedSearch(''); setPage(1);
  };

  const hasFilters = category || eventType || from || to || appliedSearch;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-indigo-600" /> Activity Audit
        </h2>
        <span className="text-xs font-bold text-slate-500">{totalCount} event{totalCount === 1 ? '' : 's'}</span>
      </div>

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] font-bold text-slate-400 self-center">Signups by source:</span>
          {sources.map((s) => (
            <span key={s.source} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600">
              <span className="font-extrabold text-slate-900 capitalize">{s.source}</span>
              {s.total}
              <span className="text-slate-400">({s.aspirants} aspirant / {s.employers} employer)</span>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setEventType(''); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        >
          <option value="">All categories</option>
          {facets.map((f) => <option key={f.category} value={f.category}>{f.category}</option>)}
        </Select>

        <Select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        >
          <option value="">All events</option>
          {eventTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>

        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-500">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="flex-1 bg-transparent focus:outline-none text-slate-800" />
        </label>
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-500">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="flex-1 bg-transparent focus:outline-none text-slate-800" />
        </label>
      </div>

      <form onSubmit={applySearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search summary, actor name or email…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
          Search
        </button>
        {hasFilters && (
          <button type="button" onClick={reset}
            className="bg-white border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </form>

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading activity…</div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">No activity matches these filters yet.</div>
        ) : items.map((ev) => {
          const meta = prettyJson(ev.metadataJson);
          const isOpen = expandedId === ev.id;
          const actorLabel = ev.actorName || ev.actorEmail || '—';
          return (
            <div key={ev.id} className="bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <button
                onClick={() => setExpandedId(isOpen ? null : ev.id)}
                className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
              >
                <span
                  className="text-slate-400 font-semibold whitespace-nowrap pt-0.5 w-16 shrink-0"
                  title={new Date(ev.createdDate).toLocaleString()}
                >
                  {relativeTime(ev.createdDate)}
                </span>
                <span className={`font-bold px-2 py-0.5 rounded uppercase text-[10px] shrink-0 ${CATEGORY_STYLES[ev.category] ?? 'bg-slate-200 text-slate-600'}`}>
                  {ev.category}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-slate-900 font-semibold">{ev.summary}</span>
                  <span className="block text-slate-400 mt-0.5">
                    {ev.eventType}
                    {actorLabel !== '—' && <> · {actorLabel}{ev.actorRole ? ` (${ev.actorRole})` : ''}</>}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-500 pt-2">
                    <div><span className="text-slate-400">Event ID</span><br />{ev.id}</div>
                    <div><span className="text-slate-400">Target</span><br />{ev.targetType ?? '—'}{ev.targetId ? ` #${ev.targetId}` : ''}</div>
                    <div><span className="text-slate-400">Actor email</span><br />{ev.actorEmail ?? '—'}</div>
                    <div><span className="text-slate-400">IP</span><br />{ev.ipAddress ?? '—'}</div>
                  </div>
                  {meta && (
                    <pre className="bg-white border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 overflow-x-auto">{meta}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Page {page} of {totalPages} · {totalCount} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
