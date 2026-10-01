import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, CalendarClock, Flame, UserCircle, ChevronRight, Bell, PenLine, FileText } from 'lucide-react';
import { UserProfile, Job } from '../../types';
import { searchJobs } from '../../api/jobs';
import { getMyApplications } from '../../api/jobApplications';
import { getSavedJobIds } from '../../api/savedJobs';
import { useSavedGovtJobs } from '../../utils/localPrefs';
import { QUALIFICATION_OPTIONS } from '../../utils/jobFilters';
import { daysUntil, fmtDate } from '../../utils/dates';
import { JobRow } from '../ui/JobRow';
import { Card, DeadlinePill, RowSkeleton, EmptyState, btn, cx } from '../ui/kit';

/** Best-effort mapping from the free-text education on the profile to a job-search qualification stem. */
function qualificationFor(education?: string): string | undefined {
  if (!education) return undefined;
  const e = education.toLowerCase();
  if (/post\s?grad|master|m\.?(sc|com|a|tech)|mba|mca/.test(e)) return 'Graduat';
  if (/grad|bachelor|b\.?(sc|com|a|tech|e)\b|degree|bca|bba/.test(e)) return 'Graduat';
  if (/diploma|polytechnic/.test(e)) return 'Diploma';
  if (/\biti\b/.test(e)) return 'ITI';
  if (/12|hsc|higher secondary/.test(e)) return '12th';
  if (/10|ssc|matric/.test(e)) return '10th';
  return undefined;
}

/**
 * Landing tab of the job-seeker dashboard: what needs attention today (deadlines on saved jobs),
 * jobs matching the profile, and quick progress numbers — each linking to the full tab.
 */
export const DashboardOverview: React.FC<{ user: UserProfile; onOpenTab: (tab: 'career' | 'applications' | 'saved' | 'mock-tests') => void }> = ({ user, onOpenTab }) => {
  const { saved } = useSavedGovtJobs();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [applications, setApplications] = useState<number | null>(null);
  const [savedPrivate, setSavedPrivate] = useState<number | null>(null);

  const qual = qualificationFor(user.education);
  const qualLabel = QUALIFICATION_OPTIONS.find((o) => o.value === qual)?.label;

  useEffect(() => {
    searchJobs({ qualification: qual, openOnly: true, pageSize: 5 }).then((r) => setJobs(r.items)).catch(() => setJobs([]));
    getMyApplications().then((a) => setApplications(a.length)).catch(() => setApplications(null));
    getSavedJobIds().then((ids) => setSavedPrivate(ids.length)).catch(() => setSavedPrivate(null));
  }, [qual]);

  const upcoming = useMemo(() => saved
    .map((s) => ({ ...s, left: daysUntil(s.lastDate) }))
    .filter((s) => s.left !== null && s.left >= 0)
    .sort((a, b) => (a.left ?? 0) - (b.left ?? 0)), [saved]);
  const closingThisWeek = upcoming.filter((s) => (s.left ?? 99) <= 7).length;
  const score = user.profileScore ?? 0;

  const tiles = [
    { label: 'Saved jobs', value: saved.length + (savedPrivate ?? 0), icon: Bookmark, tone: 'text-emerald-700', onClick: () => onOpenTab('saved') },
    { label: 'Applications', value: applications ?? '—', icon: Briefcase, tone: 'text-blue-700', onClick: () => onOpenTab('applications') },
    { label: 'Closing this week', value: closingThisWeek, icon: CalendarClock, tone: closingThisWeek ? 'text-red-700' : 'text-slate-900', to: '/saved-jobs' },
    { label: 'Mock tests', value: <PenLine className="w-5 h-5 inline" />, icon: FileText, tone: 'text-violet-700', onClick: () => onOpenTab('mock-tests') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Namaste, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {upcoming.length ? `${upcoming.length} saved job${upcoming.length === 1 ? '' : 's'} still open — the nearest closes ${fmtDate(upcoming[0].lastDate)}.` : 'Here is what is new for you today.'}
        </p>
      </div>

      {score < 100 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"><UserCircle className="w-6 h-6" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px]">Your profile is {score}% complete</p>
            <p className="text-[13px] text-slate-500">Add education, skills and a résumé so employers can find you and we can match better jobs.</p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, score)}%` }} /></div>
          </div>
          <button type="button" onClick={() => onOpenTab('career')} className={cx(btn.secondary, btn.small, 'shrink-0')}>Complete profile</button>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {tiles.map((t) => {
          const inner = (
            <>
              <t.icon className="w-4 h-4 text-slate-400" />
              <span className={cx('block text-2xl font-extrabold mt-1', t.tone)}>{t.value}</span>
              <span className="block text-xs font-semibold text-slate-500">{t.label}</span>
            </>
          );
          return t.to
            ? <Link key={t.label} to={t.to} className="card-3d rounded-2xl p-3.5 sm:p-4 text-left">{inner}</Link>
            : <button key={t.label} type="button" onClick={t.onClick} className="card-3d rounded-2xl p-3.5 sm:p-4 text-left cursor-pointer">{inner}</button>;
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg font-extrabold">Jobs for you</h2>
              <p className="text-[13px] text-slate-500">{qualLabel ? `Open jobs for ${qualLabel}` : 'Latest open government jobs'} — <button type="button" onClick={() => onOpenTab('career')} className="font-semibold text-emerald-700 cursor-pointer">update education</button></p>
            </div>
            <Link to={qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs'} className="text-[13px] font-bold text-emerald-700 inline-flex items-center">See all <ChevronRight className="w-4 h-4" /></Link>
          </div>
          <Card>
            {jobs === null ? <RowSkeleton rows={3} /> : jobs.length === 0
              ? <EmptyState title="No matching jobs right now" body="We add new jobs every day — turn on alerts to hear first." />
              : jobs.map((j) => <JobRow key={j.id} job={j} showCta={false} />)}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <p className="font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-red-600" /> Upcoming last dates</p>
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-slate-500 mt-2">Save jobs with the bookmark icon and their deadlines will show up here.</p>
            ) : (
              <ul className="mt-2">
                {upcoming.slice(0, 5).map((s) => (
                  <li key={s.slug} className="border-t border-slate-100 first:border-t-0">
                    <Link to={`/jobs/${s.slug}`} className="flex items-center gap-2 py-2.5 group">
                      <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-slate-800 truncate group-hover:text-emerald-800">{s.title}</span>
                      <DeadlinePill date={s.lastDate} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5 space-y-2.5">
            <p className="font-bold">Keep going</p>
            <Link to="/daily-quiz" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><Flame className="w-4 h-4 text-amber-600" /> Today's daily quiz</Link>
            <Link to="/job-alerts" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><Bell className="w-4 h-4 text-blue-600" /> Manage job alerts</Link>
            <Link to="/mock-tests" className="flex items-center gap-2.5 text-[13.5px] font-semibold text-slate-700 hover:text-emerald-800"><PenLine className="w-4 h-4 text-violet-600" /> Take a mock test</Link>
          </Card>
        </aside>
      </div>
    </div>
  );
};
