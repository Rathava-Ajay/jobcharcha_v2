import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, Bell, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getSavedJobs, unsaveJob, SavedJob } from '../api/savedJobs';
import { useSavedGovtJobs, useReminders } from '../utils/localPrefs';
import { fmtDate, daysUntil } from '../utils/dates';
import { PageHeader, Card, OrgAvatar, DeadlinePill, EmptyState, Chip, Pill, btn, cx } from '../components/ui/kit';

type Tab = 'govt' | 'private';

/**
 * Bookmarks in one place. Government jobs are saved on this device (the backend's saved-jobs API
 * only covers employer postings); private jobs come from the account when an aspirant is logged in.
 */
export default function SavedJobsPage() {
  const { user } = useAuth();
  const { saved, remove } = useSavedGovtJobs();
  const { hasReminder } = useReminders();
  const [tab, setTab] = useState<Tab>('govt');
  const [privateJobs, setPrivateJobs] = useState<SavedJob[] | null>(null);
  const isAspirant = user?.role === 'aspirant';

  useEffect(() => {
    if (!isAspirant) { setPrivateJobs(null); return; }
    getSavedJobs().then(setPrivateJobs).catch(() => setPrivateJobs([]));
  }, [isAspirant]);

  // Soonest deadline first; closed jobs sink to the bottom.
  const govt = [...saved].sort((a, b) => {
    const da = daysUntil(a.lastDate) ?? 9999, db = daysUntil(b.lastDate) ?? 9999;
    return (da < 0 ? 10000 + da : da) - (db < 0 ? 10000 + db : db);
  });

  const removePrivate = async (id: number) => {
    setPrivateJobs((list) => list?.filter((j) => j.employerJobId !== id) ?? null);
    await unsaveJob(id).catch(() => getSavedJobs().then(setPrivateJobs).catch(() => {}));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead title="Saved Jobs | JobCharcha" description="Your bookmarked government and private jobs." path="/saved-jobs" />
      <Navbar user={user} />
      <PageHeader
        title="Saved jobs"
        subtitle="Jobs you bookmarked, with the closest last date first."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Saved jobs' }]}
      >
        <div className="flex gap-2">
          <Chip active={tab === 'govt'} onClick={() => setTab('govt')} count={saved.length}>Government</Chip>
          <Chip active={tab === 'private'} onClick={() => setTab('private')} count={privateJobs?.length}>Private</Chip>
        </div>
      </PageHeader>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {tab === 'govt' ? (
          <>
            <p className="text-[13px] text-slate-500 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Government jobs are saved on this device.
            </p>
            <Card>
              {govt.length === 0 ? (
                <EmptyState
                  title="No saved government jobs yet"
                  body="Tap the bookmark on any job to keep it here and see its last date at a glance."
                  action={<Link to="/jobs" className={btn.primary}>Browse jobs</Link>}
                />
              ) : govt.map((j) => (
                <div key={j.slug} className="relative flex items-center gap-3.5 p-4 border-t border-slate-100 first:border-t-0">
                  <OrgAvatar name={j.org} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <DeadlinePill date={j.lastDate} />
                      {hasReminder(j.slug) && <Pill tone="blue" icon={Bell}>Reminder on</Pill>}
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                      <Link to={`/jobs/${j.slug}`} className="after:absolute after:inset-0 hover:text-emerald-800">{j.title}</Link>
                    </h3>
                    <p className="text-[13px] text-slate-500 truncate">{j.org} · Last date {fmtDate(j.lastDate)}</p>
                  </div>
                  <button type="button" onClick={() => remove(j.slug)} aria-label={`Remove ${j.title}`}
                    className="relative z-10 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </Card>
          </>
        ) : !isAspirant ? (
          <Card>
            <EmptyState
              title="Log in to see saved private jobs"
              body="Private job bookmarks are kept in your JobCharcha account so they follow you across devices."
              action={<Link to="/login" state={{ from: '/saved-jobs' }} className={btn.primary}>Login / Register</Link>}
            />
          </Card>
        ) : (
          <Card>
            {privateJobs === null ? (
              <p className="p-6 text-sm text-slate-500">Loading…</p>
            ) : privateJobs.length === 0 ? (
              <EmptyState title="No saved private jobs" action={<Link to="/private-jobs" className={btn.primary}>Browse private jobs</Link>} />
            ) : privateJobs.map((j) => (
              <div key={j.employerJobId} className="relative flex items-center gap-3.5 p-4 border-t border-slate-100 first:border-t-0">
                <OrgAvatar name={j.companyName} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {j.lastDate && <DeadlinePill date={j.lastDate} />}
                    {j.hasApplied && <Pill tone="green">Applied</Pill>}
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                    <Link to={`/private-jobs/${j.slug}`} className="after:absolute after:inset-0 hover:text-indigo-800">{j.title}</Link>
                  </h3>
                  <p className="text-[13px] text-slate-500 truncate">{j.companyName} · {j.jobType} · {j.city}</p>
                </div>
                <button type="button" onClick={() => removePrivate(j.employerJobId)} aria-label={`Remove ${j.title}`}
                  className={cx('relative z-10 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer')}>
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </Card>
        )}
        <p className="text-center text-[13px] text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <Bookmark className="w-4 h-4" /> Tip: turn on job alerts so new jobs for your qualification reach you first.
          <Link to="/job-alerts" className="font-bold text-emerald-700">Set alerts</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
