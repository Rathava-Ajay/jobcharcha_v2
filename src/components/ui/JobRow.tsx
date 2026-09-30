import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Users, GraduationCap, MapPin, IndianRupee, Briefcase, ShieldCheck, ChevronRight } from 'lucide-react';
import { Job } from '../../types';
import { ApiPublicEmployerJobListItem } from '../../api/employerJobs';
import { useSavedGovtJobs } from '../../utils/localPrefs';
import { fmtDate, daysSince } from '../../utils/dates';
import { OrgAvatar, DeadlinePill, Pill, cx } from './kit';

const Fact: React.FC<{ icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ icon: Icon, children, className }) => (
  <span className={cx('inline-flex items-center gap-1.5 min-w-0', className)}>
    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <span className="truncate">{children}</span>
  </span>
);

/**
 * One government job in a list. The title link is stretched over the whole row (after:inset-0),
 * so the entire row is tappable while the bookmark button stays a separate, valid control.
 */
export const JobRow: React.FC<{ job: Job; showCta?: boolean }> = ({ job, showCta = true }) => {
  const { isSaved, toggle } = useSavedGovtJobs();
  const saved = isSaved(job.slug);
  const fresh = job.isNew || (daysSince(job.postedDate) ?? 99) <= 2;
  const to = `/jobs/${job.slug ?? job.id}`;

  return (
    <article className="relative flex gap-3.5 p-4 border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70 transition-colors">
      <OrgAvatar name={job.companyOrDept} logo={job.organizationLogo} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1 empty:hidden">
          {job.isFeatured && <Pill tone="amber">Featured</Pill>}
          {fresh && <Pill tone="green">New</Pill>}
          {job.isUrgent && <Pill tone="red">Urgent</Pill>}
          <DeadlinePill date={job.lastDate} className="sm:hidden" />
        </div>
        <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
          <Link to={to} className="after:absolute after:inset-0 hover:text-emerald-800">
            {job.title}
            {job.vacancyCount > 0 && !/posts?\b/i.test(job.title) && ` – ${job.vacancyCount.toLocaleString('en-IN')} Posts`}
          </Link>
        </h3>
        <p className="text-[13px] text-slate-500 mt-0.5 truncate">{job.companyOrDept}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px] text-slate-700">
          {job.vacancyCount > 0 && <Fact icon={Users}>{job.vacancyCount.toLocaleString('en-IN')} posts</Fact>}
          {job.qualification && <Fact icon={GraduationCap} className="max-w-[14rem]">{job.qualification}</Fact>}
          {job.location && <Fact icon={MapPin}>{job.location}</Fact>}
          {job.salary && job.salary !== 'As per norms' && <Fact icon={IndianRupee} className="hidden md:inline-flex max-w-[14rem]">{job.salary.replace(/^₹\s*/, '')}</Fact>}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <DeadlinePill date={job.lastDate} className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => toggle({ slug: job.slug ?? job.id, title: job.title, org: job.companyOrDept, lastDate: job.lastDate })}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
            className={cx('relative z-10 p-1.5 -m-1.5 rounded-lg cursor-pointer', saved ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700')}
          >
            <Bookmark className={cx('w-5 h-5', saved && 'fill-amber-400')} />
          </button>
        </div>
        <span className="hidden sm:block text-xs text-slate-400">Last date {fmtDate(job.lastDate)}</span>
        {showCta && (
          <span className="hidden md:inline-flex items-center gap-0.5 text-[13px] font-bold text-emerald-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
            View details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </article>
  );
};

/** One employer (private) job in a list — same anatomy as JobRow. */
export const PrivateJobRow: React.FC<{ job: ApiPublicEmployerJobListItem }> = ({ job }) => {
  const salary = job.hideSalary || (!job.salaryMin && !job.salaryMax) ? null : [job.salaryMin, job.salaryMax].filter(Boolean).join(' – ');
  const fresh = (daysSince(job.createdDate) ?? 99) <= 2;
  return (
    <article className="relative flex gap-3.5 p-4 border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70 transition-colors">
      <OrgAvatar name={job.companyName} logo={job.companyLogo} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1 empty:hidden">
          {job.isFeatured && <Pill tone="amber">Featured</Pill>}
          {fresh && <Pill tone="green">New</Pill>}
          {job.isUrgent && <Pill tone="red">Urgent hiring</Pill>}
          {job.lastDate && <DeadlinePill date={job.lastDate} className="sm:hidden" />}
        </div>
        <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
          <Link to={`/private-jobs/${job.slug}`} className="after:absolute after:inset-0 hover:text-indigo-800">{job.title}</Link>
        </h3>
        <p className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-1 min-w-0">
          <span className="truncate">{job.companyName}</span>
          {job.isCompanyVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Verified company" />}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px] text-slate-700">
          <Fact icon={Briefcase}>{job.jobType} · {job.workMode}</Fact>
          <Fact icon={MapPin}>{job.city}{job.state ? `, ${job.state}` : ''}</Fact>
          {salary && <Fact icon={IndianRupee}>{salary.replace(/₹\s*/g, '')}</Fact>}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-2 shrink-0">
        {job.lastDate ? <DeadlinePill date={job.lastDate} className="hidden sm:inline-flex" /> : <Pill tone="grey" className="hidden sm:inline-flex">Open</Pill>}
        <span className="hidden md:inline-flex items-center gap-0.5 text-[13px] font-bold text-indigo-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
          View job <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
};

/** A result / admit-card / news style row with one clear action on the right. */
export const UpdateRow: React.FC<{
  to: string;
  title: string;
  org: string;
  meta?: React.ReactNode;
  pill?: React.ReactNode;
  date?: string;
  action: string;
  actionIcon?: React.ElementType;
  muted?: boolean;
  logo?: string | null;
}> = ({ to, title, org, meta, pill, date, action, actionIcon: ActionIcon = ChevronRight, muted, logo }) => (
  <article className="relative flex items-center gap-3.5 p-4 border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70 transition-colors">
    <OrgAvatar name={org} logo={logo} />
    <div className="flex-1 min-w-0">
      {pill && <div className="flex flex-wrap gap-1.5 mb-1">{pill}</div>}
      <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
        <Link to={to} className="after:absolute after:inset-0 hover:text-emerald-800">{title}</Link>
      </h3>
      <p className="text-[13px] text-slate-500 mt-0.5 truncate">{org}{meta ? <> · {meta}</> : null}</p>
    </div>
    {date && <span className="hidden sm:block text-[13px] text-slate-400 whitespace-nowrap">{date}</span>}
    <span
      className={cx(
        'shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl font-bold text-[13px]',
        'w-10 h-10 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2',
        muted ? 'bg-white border border-slate-200 text-slate-700' : 'bg-emerald-700 text-white',
      )}
    >
      <ActionIcon className="w-4 h-4" />
      <span className="hidden sm:inline">{action}</span>
    </span>
  </article>
);
