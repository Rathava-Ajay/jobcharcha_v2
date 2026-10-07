import React, { useCallback, useEffect, useState } from 'react';
import { Bot, ImageIcon, RefreshCw, Coins, Info } from 'lucide-react';
import { ApiError } from '../../api/client';
import { ApiAiUsageDay, ApiAiUsageEntry, ApiAiUsageReport, ApiProviderTotals, getAiUsage } from '../../api/aiUsage';

/** 12,345 -> 12.3K, 1,234,567 -> 1.23M. Exact figures stay available in the tooltip. */
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('en-IN');
const exact = (n: number) => n.toLocaleString('en-IN');
const usd = (n?: number | null) => (n == null ? '—' : `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`);
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const when = (d: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d : d + 'Z')
  .toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const catName = (c?: string | null) => ({ job: 'Jobs', result: 'Results', admitcard: 'Admit cards', scheme: 'Schemes', news: 'News', oldpaper: 'Old papers', study: 'Study' } as Record<string, string>)[c ?? ''] ?? (c || '—');

const RANGES = [{ days: 1, label: 'Today' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }] as const;

const Stat: React.FC<{ label: string; value: string; title?: string; strong?: boolean }> = ({ label, value, title, strong }) => (
  <div className="min-w-0" title={title}>
    <div className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`${strong ? 'text-[22px] sm:text-[26px]' : 'text-[16px]'} font-extrabold text-slate-900 leading-tight tabular-nums truncate`}>{value}</div>
  </div>
);

const ProviderCard: React.FC<{
  title: string; subtitle: string; icon: React.ElementType; tone: string; totals: ApiProviderTotals;
  unitLabel: string; costLabel: string; extra?: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, tone, totals, unitLabel, costLabel, extra }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
    <div className="flex items-center gap-3">
      <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-extrabold text-slate-900">{title}</h3>
        <p className="text-[12.5px] text-slate-500 font-medium">{subtitle}</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Stat strong label="Total tokens" value={compact(totals.totalTokens)} title={`${exact(totals.totalTokens)} tokens`} />
      <Stat strong label={costLabel} value={usd(totals.costUsd)} />
      <Stat label={unitLabel} value={exact(totals.units)} />
      <Stat label="API calls" value={exact(totals.calls)} />
      <Stat label="Input" value={compact(totals.inputTokens)} title={`${exact(totals.inputTokens)} input tokens`} />
      <Stat label="Output" value={compact(totals.outputTokens)} title={`${exact(totals.outputTokens)} output tokens`} />
      {(totals.cacheReadTokens > 0 || totals.cacheWriteTokens > 0) && (
        <>
          <Stat label="Cache read" value={compact(totals.cacheReadTokens)} title={`${exact(totals.cacheReadTokens)} tokens read from the prompt cache`} />
          <Stat label="Cache write" value={compact(totals.cacheWriteTokens)} title={`${exact(totals.cacheWriteTokens)} tokens written to the prompt cache`} />
        </>
      )}
    </div>
    {extra}
  </section>
);

const DayRow: React.FC<{ day: ApiAiUsageDay; maxClaude: number; maxOpenAi: number; isToday: boolean }> = ({ day, maxClaude, maxOpenAi, isToday }) => {
  const c = day.claude;
  const o = day.openAi;
  // Each provider is scaled to its own busiest day, since Claude cache tokens are orders of magnitude larger.
  const pct = (n: number, max: number) => (max > 0 ? Math.max(n > 0 ? 3 : 0, Math.round((n / max) * 100)) : 0);
  const empty = c.calls + o.calls === 0;
  return (
    <div className={`rounded-xl border p-3 ${isToday ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-extrabold text-slate-900">{dayLabel(day.date)}{isToday && <span className="ml-2 text-[11px] font-bold text-blue-700">today</span>}</span>
        <span className="text-[12px] font-bold text-slate-600 tabular-nums">{usd(c.costUsd + o.costUsd)}</span>
      </div>
      {empty ? (
        <p className="mt-1 text-[12px] text-slate-400 font-medium">No AI calls</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11.5px] font-bold text-indigo-700">Claude</span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct(c.totalTokens, maxClaude)}%` }} /></div>
            <span className="w-28 shrink-0 text-right text-[11.5px] font-semibold text-slate-600 tabular-nums">{compact(c.totalTokens)} · {c.calls} run{c.calls === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11.5px] font-bold text-emerald-700">OpenAI</span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(o.totalTokens, maxOpenAi)}%` }} /></div>
            <span className="w-28 shrink-0 text-right text-[11.5px] font-semibold text-slate-600 tabular-nums">{compact(o.totalTokens)} · {o.units} img</span>
          </div>
        </div>
      )}
    </div>
  );
};

const RecentRow: React.FC<{ e: ApiAiUsageEntry }> = ({ e }) => {
  const claude = e.provider === 'claude';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex gap-3">
      <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${claude ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {claude ? <Bot className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[13px] font-bold text-slate-900">
            {claude ? 'AI Magic sync' : 'Share image'} · {catName(e.category)}{e.referenceId != null && <span className="text-slate-400 font-semibold"> #{e.referenceId}</span>}
          </span>
          <span className="text-[12px] text-slate-500 font-medium">{when(e.occurredAt)}</span>
        </div>
        <div className="text-[12px] text-slate-600 font-medium tabular-nums">
          {exact(e.totalTokens)} tokens (in {compact(e.inputTokens)} / out {compact(e.outputTokens)}
          {(e.cacheReadTokens > 0 || e.cacheWriteTokens > 0) && ` / cache ${compact(e.cacheReadTokens + e.cacheWriteTokens)}`})
          {' · '}{usd(e.costUsd)}{e.durationMs != null && ` · ${Math.round(e.durationMs / 1000)}s`}
        </div>
        {e.model && <div className="text-[11.5px] text-slate-400 font-mono truncate">{e.model}</div>}
      </div>
    </div>
  );
};

export const AdminAiUsagePanel: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [report, setReport] = useState<ApiAiUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    getAiUsage(days)
      .then((r) => { setReport(r); setError(null); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load AI usage.'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [load]);

  const ranged = report && days === 1 ? report.today : report?.total;
  const maxClaude = Math.max(1, ...(report?.perDay ?? []).map((d) => d.claude.totalTokens));
  const maxOpenAi = Math.max(1, ...(report?.perDay ?? []).map((d) => d.openAi.totalTokens));
  const combinedToday = report ? report.today.claude.costUsd + report.today.openAi.costUsd : 0;

  return (
    <div className="space-y-4 max-sm:[&_button]:min-h-[44px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">AI usage</h2>
          <p className="text-[13px] text-slate-500 font-medium">Token consumption of the AI Magic sync (Claude) and the share images (ChatGPT / OpenAI). Days follow India time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 flex-1 sm:flex-none" role="tablist" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r.days} type="button" role="tab" aria-selected={days === r.days} onClick={() => setDays(r.days)}
                className={`flex-1 sm:flex-none px-3.5 min-h-[40px] rounded-lg text-[13px] font-bold cursor-pointer transition-colors ${days === r.days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{r.label}</button>
            ))}
          </div>
          <button type="button" onClick={() => load()} aria-label="Refresh" className="w-11 h-11 rounded-xl border border-slate-200 bg-white hover:border-blue-400 text-slate-600 grid place-items-center cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold">{error}</div>}

      {!report || !ranged ? (
        !error && <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">Loading…</div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 text-white p-4 sm:p-5 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2"><Coins className="w-5 h-5 text-amber-300" /><span className="text-[13px] font-bold text-slate-200">Spent today</span></div>
            <div className="text-[26px] font-extrabold tabular-nums">{usd(combinedToday)}</div>
            <div className="text-[12.5px] text-slate-300 font-medium">
              Claude {usd(report.today.claude.costUsd)} · OpenAI {usd(report.today.openAi.costUsd)}
              {days > 1 && <> · last {days} days: <b className="text-white">{usd(report.total.claude.costUsd + report.total.openAi.costUsd)}</b></>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProviderCard
              title="Claude — AI Magic sync" subtitle={`${days === 1 ? 'Today' : `Last ${days} days`} · research agent runs`}
              icon={Bot} tone="bg-indigo-100 text-indigo-700" totals={ranged.claude} unitLabel="Sync runs" costLabel="Cost (API-equivalent)" />
            <ProviderCard
              title="OpenAI — share images (retired)" subtitle={`${days === 1 ? 'Today' : `Last ${days} days`} · past usage only`}
              icon={ImageIcon} tone="bg-emerald-100 text-emerald-700" totals={ranged.openAi} unitLabel="Images generated" costLabel="Cost (estimated)" />
          </div>

          {days > 1 && (
            <section className="space-y-2">
              <h3 className="text-[14px] font-extrabold text-slate-900">Per day</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[...report.perDay].reverse().map((d, i) => <DayRow key={d.date} day={d} maxClaude={maxClaude} maxOpenAi={maxOpenAi} isToday={i === 0} />)}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-[14px] font-extrabold text-slate-900">By category</h3>
            {report.breakdown.length === 0 ? (
              <p className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">No AI calls in this period yet.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_.6fr_1fr_.8fr] gap-3 px-4 py-2.5 bg-slate-50 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                  <span>What</span><span>Category</span><span className="text-right">Calls</span><span className="text-right">Tokens</span><span className="text-right">Cost</span>
                </div>
                {report.breakdown.map((b) => (
                  <div key={`${b.provider}-${b.operation}-${b.category}`} className="px-4 py-3 border-t border-slate-100 first:border-t-0 sm:grid sm:grid-cols-[1.4fr_1fr_.6fr_1fr_.8fr] sm:gap-3 sm:items-center text-[13px]">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${b.provider === 'claude' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                      {b.provider === 'claude' ? 'Claude · AI Magic sync' : 'OpenAI · share image'}
                    </div>
                    <div className="text-slate-600 font-medium max-sm:mt-0.5">{catName(b.category)}</div>
                    <div className="sm:text-right text-slate-600 font-medium tabular-nums max-sm:inline max-sm:mr-3">{b.totals.calls} call{b.totals.calls === 1 ? '' : 's'}</div>
                    <div className="sm:text-right text-slate-800 font-semibold tabular-nums max-sm:inline max-sm:mr-3" title={`${exact(b.totals.totalTokens)} tokens`}>{compact(b.totals.totalTokens)} tokens</div>
                    <div className="sm:text-right font-bold text-slate-900 tabular-nums max-sm:inline">{usd(b.totals.costUsd)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[14px] font-extrabold text-slate-900">Recent calls</h3>
            {report.recent.length === 0
              ? <p className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">Nothing recorded yet. Run an AI Magic sync or publish a post to see usage here.</p>
              : <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{report.recent.map((e) => <RecentRow key={e.id} e={e} />)}</div>}
          </section>

          <p className="flex items-start gap-2 text-[12px] text-slate-500 font-medium leading-relaxed">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Claude cost is the figure the agent reports for each run (what the same usage would cost on the API); if the server runs on a Claude subscription you are not billed per token.
              Cache tokens are counted in the Claude totals.
            </span>
          </p>
        </>
      )}
    </div>
  );
};
