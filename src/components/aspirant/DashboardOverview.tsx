import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, CalendarClock, Flame, ChevronRight, Bell, PenLine, FileText, Search, ArrowRight, Sparkles } from 'lucide-react';
import { UserProfile, Job } from '../../types';
import { searchJobs } from '../../api/jobs';
import { getMyApplications } from '../../api/jobApplications';
import { getSavedJobIds } from '../../api/savedJobs';
import { useSavedGovtJobs } from '../../utils/localPrefs';
import { QUALIFICATION_OPTIONS } from '../../utils/jobFilters';
import { daysUntil, fmtDate } from '../../utils/dates';
import { JobRow } from '../ui/JobRow';
import { Card, DeadlinePill, RowSkeleton, EmptyState } from '../ui/kit';
import { StatTile } from '../dashboard/DashboardLayout';

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

  const first = user.name.split(' ')[0];
  const ring = Math.max(0, Math.min(100, score));

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 max-w-[1280px]">
      {/* Greeting hero */}
      <section className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-[radial-gradient(520px_260px_at_100%_0%,rgba(56,189,248,0.45),transparent_60%),radial-gradient(420px_240px_at_0%_100%,rgba(99,102,241,0.45),transparent_60%),linear-gradient(135deg,#172554,#1e40af_55%,#2563eb)]">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] items-center">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-blue-200">Namaste,</p>
            <h2 className="text-[26px] sm:text-[32px] leading-tight font-extrabold tracking-tight truncate">{first} 👋</h2>
            <p className="mt-1.5 text-[14px] text-blue-100 max-w-xl">
              {upcoming.length
                ? `${upcoming.length} saved job${upcoming.length === 1 ? '' : 's'} still open — the nearest closes ${fmtDate(upcoming[0].lastDate)}.`
                : 'Here is what is new for you today. Save jobs to get last-date reminders.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs'} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[13.5px] px-4 py-2.5"><Search className="w-4 h-4" />Find jobs for me</Link>
              <Link to="/daily-quiz" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-[13.5px] px-4 py-2.5"><Flame className="w-4 h-4" />Today's quiz</Link>
            </div>
          </div>
          {score < 100 && (
            <div className="flex items-center gap-4 rounded-2xl bg-white/[0.08] border border-white/15 p-4">
              <span className="relative w-[76px] h-[76px] rounded-full grid place-items-center shrink-0" style={{ background: `conic-gradient(#fbbf24 ${ring * 3.6}deg, rgba(255,255,255,0.14) 0)` }} role="img" aria-label={`Profile ${ring}% complete`}>
                <span className="w-[60px] h-[60px] rounded-full bg-[#1e3a8a] grid place-items-center text-[17px] font-black">{ring}%</span>
              </span>
              <span className="min-w-0 max-w-[13rem]">
                <span className="block font-bold text-[14px]">Complete your profile</span>
                <span className="block text-[12.5px] text-blue-100/80">Better matches & employers can find you</span>
                <button type="button" onClick={() => onOpenTab('career')} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-amber-300 hover:text-amber-200 cursor-pointer">Finish now <ArrowRight className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatTile icon={Bookmark} tone="bg-emerald-50 text-emerald-700" value={saved.length + (savedPrivate ?? 0)} label="Saved jobs" onClick={() => onOpenTab('saved')} />
        <StatTile icon={Briefcase} tone="bg-blue-50 text-blue-700" value={applications ?? '—'} label="Applications" onClick={() => onOpenTab('applications')} />
        <StatTile icon={CalendarClock} tone={closingThisWeek ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'} value={closingThisWeek} label="Closing this week" hint={closingThisWeek ? 'Apply soon' : 'Nothing urgent'} onClick={() => onOpenTab('saved')} />
        <StatTile icon={FileText} tone="bg-violet-50 text-violet-700" value={<PenLine className="w-6 h-6 inline" />} label="Mock tests" hint="See your scores" onClick={() => onOpenTab('mock-tests')} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <section className="min-w-0">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0"><Sparkles className="w-[18px] h-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-[16px] text-slate-900">Jobs for you</span>
                <span className="block text-[12.5px] text-slate-500 truncate">{qualLabel ? `Open jobs for ${qualLabel}` : 'Latest open government jobs'} · <button type="button" onClick={() => onOpenTab('career')} className="font-semibold text-blue-700 cursor-pointer">update education</button></span>
              </span>
              <Link to={qual ? `/jobs?qualification=${encodeURIComponent(qual)}` : '/jobs'} className="shrink-0 text-[13px] font-bold text-blue-700 inline-flex items-center">See all <ChevronRight className="w-4 h-4" /></Link>
            </div>
            {jobs === null ? <RowSkeleton rows={3} /> : jobs.length === 0
              ? <EmptyState title="No matching jobs right now" body="We add new jobs every day — turn on alerts to hear first." />
              : jobs.map((j) => <JobRow key={j.id} job={j} showCta={false} />)}
          </Card>
        </section>

        <aside className="space-y-4 min-w-0">
          <Card className="p-4 sm:p-5">
            <p className="font-extrabold text-[15px] flex items-center gap-2"><CalendarClock className="w-[18px] h-[18px] text-red-600" /> Upcoming last dates</p>
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-slate-500 mt-2">Save jobs with the bookmark icon and their deadlines will show up here.</p>
            ) : (
              <ul className="mt-2">
                {upcoming.slice(0, 5).map((s) => (
                  <li key={s.slug} className="border-t border-slate-100 first:border-t-0">
                    <Link to={`/jobs/${s.slug}`} className="flex items-center gap-2 py-2.5 group">
                      <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-slate-800 truncate group-hover:text-blue-700">{s.title}</span>
                      <DeadlinePill date={s.lastDate} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { to: '/daily-quiz', icon: Flame, label: 'Daily quiz', tone: 'from-amber-400 to-orange-500' },
              { to: '/mock-tests', icon: PenLine, label: 'Mock tests', tone: 'from-pink-500 to-rose-500' },
              { to: '/job-alerts', icon: Bell, label: 'Job alerts', tone: 'from-blue-600 to-indigo-600' },
              { to: '/old-papers', icon: FileText, label: 'Old papers', tone: 'from-teal-500 to-cyan-600' },
            ].map((q) => (
              <Link key={q.to} to={q.to} className={`rounded-2xl p-3.5 text-white bg-gradient-to-br ${q.tone} hover:-translate-y-0.5 transition-transform`}>
                <q.icon className="w-5 h-5" />
                <span className="mt-2 flex items-center justify-between text-[13.5px] font-extrabold">{q.label}<ArrowRight className="w-4 h-4" /></span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
