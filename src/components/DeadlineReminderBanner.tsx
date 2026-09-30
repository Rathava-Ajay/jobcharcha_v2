import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { useReminders } from '../utils/localPrefs';
import { daysUntil } from '../utils/dates';

/**
 * Fires the "Remind me before the last date" promise: when a job the visitor asked to be
 * reminded about is 3 days or less from closing, a slim banner appears on whatever page they
 * open. Dismissing hides it for the rest of the browser session; the reminder itself stays.
 */
export const DeadlineReminderBanner: React.FC = () => {
  const { reminders } = useReminders();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('jc_dismissed_reminders') || '[]'); } catch { return []; }
  });

  const due = reminders
    .map((r) => ({ ...r, left: daysUntil(r.lastDate) }))
    .filter((r) => r.left !== null && r.left >= 0 && r.left <= 3 && !dismissed.includes(r.slug))
    .sort((a, b) => (a.left ?? 0) - (b.left ?? 0));

  // Don't nag on the job's own page, or inside dashboards/admin flows.
  if (!due.length || pathname === `/jobs/${due[0].slug}` || /^\/(admin|dashboard|login|join)/.test(pathname)) return null;
  const r = due[0];

  const dismiss = () => {
    const next = [...dismissed, r.slug];
    setDismissed(next);
    try { sessionStorage.setItem('jc_dismissed_reminders', JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <div role="status" className="fixed z-50 left-3 right-3 bottom-20 md:bottom-5 md:left-auto md:right-5 md:max-w-sm bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex gap-3">
      <BellRing className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-bold">{r.left === 0 ? 'Last day today!' : r.left === 1 ? 'Last date is tomorrow' : `Last date in ${r.left} days`}</p>
        <p className="text-slate-300 truncate">{r.title}</p>
        <Link to={`/jobs/${r.slug}`} onClick={dismiss} className="inline-block mt-2 text-emerald-300 font-bold">Open & apply →</Link>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss reminder" className="p-1 -m-1 text-slate-400 hover:text-white cursor-pointer self-start"><X className="w-4 h-4" /></button>
    </div>
  );
};
