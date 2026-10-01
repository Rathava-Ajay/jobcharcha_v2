import { useBodyClass } from '../hooks/useBodyClass';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, ShieldCheck, CheckCircle2, Sparkles, Zap, Bookmark,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getPublicEmployerJobBySlug, ApiPublicEmployerJobDetail } from '../api/employerJobs';
import { applyToJob } from '../api/jobApplications';
import { getSavedJobIds, saveJob, unsaveJob } from '../api/savedJobs';
import { ApiError } from '../api/client';
import { ViewToggle } from '../components/jobDetail/ViewToggle';
import { useDetailView } from '../utils/localPrefs';
import { Card, OrgAvatar, Pill, DeadlinePill, btn, cx } from '../components/ui/kit';
import {
  Briefcase as BriefcaseIcon, MapPin as MapPinIcon, IndianRupee as RupeeIcon, CalendarDays as CalIcon, FileText as FileIcon,
  ListChecks as ListIcon, Gift, Tags, Download as DownloadIcon, Share2, GraduationCap, Users as UsersIcon,
} from 'lucide-react';
import {
  PortalBox, KeyValueTable, KeyValueRow, LinksTable, StatsStrip, StatTile, MobileActionBar, fmtPortalDate, deadlineNote,
} from '../components/jobDetail/PortalBlocks';

const EMPLOYMENT_TYPE: Record<string, string> = {
  'full-time': 'FULL_TIME', 'part-time': 'PART_TIME', contract: 'CONTRACTOR',
  internship: 'INTERN', temporary: 'TEMPORARY', freelance: 'CONTRACTOR',
};

/** JobPosting JSON-LD for an employer-posted job — mirrors JobDetailsPage's govt-job block. */
function buildEmployerJobJsonLd(job: ApiPublicEmployerJobDetail) {
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  const hasNumericSalary = !job.hideSalary && Number.isFinite(min) && Number.isFinite(max) && (min > 0 || max > 0);
  const validThrough = job.lastDate && /^\d{4}-\d{2}-\d{2}/.test(job.lastDate)
    ? `${job.lastDate.slice(0, 10)}T23:59:59+05:30`
    : job.lastDate || undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.requirements && `Requirements: ${job.requirements}`,
      job.qualification && `Qualification: ${job.qualification}`].filter(Boolean).join('\n\n'),
    identifier: { '@type': 'PropertyValue', name: job.companyName, value: job.slug },
    datePosted: job.createdDate,
    ...(validThrough ? { validThrough } : {}),
    employmentType: EMPLOYMENT_TYPE[job.jobType?.toLowerCase()] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      ...(job.companyLogo ? { logo: job.companyLogo } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city,
        ...(job.state ? { addressRegion: job.state } : {}),
        addressCountry: 'IN',
      },
    },
    ...(job.workMode?.toLowerCase() === 'remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    directApply: true,
    ...(hasNumericSalary ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: { '@type': 'QuantitativeValue', minValue: min || undefined, maxValue: max || undefined, unitText: 'MONTH' },
      },
    } : {}),
  };
}

export default function PrivateJobDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<ApiPublicEmployerJobDetail | null>(null);
  useBodyClass('has-mobile-cta', !!job);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);

  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [view, setView] = useDetailView();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getPublicEmployerJobBySlug(slug)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!job || user?.role !== 'aspirant') { setSaved(false); return; }
    getSavedJobIds().then((ids) => setSaved(ids.includes(job.id))).catch(() => {});
  }, [job, user?.role]);

  const toggleSave = async () => {
    if (!job || savingBookmark) return;
    if (user?.role !== 'aspirant') { navigate('/login', { state: { from: `/private-jobs/${job.slug}` } }); return; }
    setSavingBookmark(true);
    const next = !saved;
    setSaved(next);
    try {
      await (next ? saveJob(job.id) : unsaveJob(job.id));
    } catch {
      setSaved(!next);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setApplying(true);
    setApplyError(null);
    try {
      await applyToJob(job.id, { coverLetter: coverLetter || undefined, expectedSalary: expectedSalary || undefined });
      setApplySuccess(true);
      setShowApplyForm(false);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Job not found</h1>
        <p className="text-sm text-slate-500">This vacancy may have closed or the link is incorrect.</p>
        <Link to="/private-jobs" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Back to Private Jobs</Link>
      </div>
    );
  }

  const alreadyApplied = job.hasApplied || applySuccess;
  const salaryText = job.hideSalary || (!job.salaryMin && !job.salaryMax) ? 'Not disclosed' : `${job.salaryMin || '—'} – ${job.salaryMax || '—'}`;

  const metaDescription = `${job.title} at ${job.companyName} — ${job.jobType}, ${job.workMode}, ${job.city}, ${job.state}. `
    + `${job.openings ? `${job.openings} opening${job.openings === 1 ? '' : 's'}. ` : ''}Apply online on JobCharcha.`;

  const fmtDate = (d: string) => fmtPortalDate(d.slice(0, 10));
  const lastDateText = job.lastDate ? fmtDate(job.lastDate) : 'Open until filled';
  const skills = (job.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const overviewRows: KeyValueRow[] = [
    { label: 'Company', value: <>{job.companyName}{job.isCompanyVerified && <ShieldCheck className="inline w-3.5 h-3.5 text-emerald-600 ml-1 -mt-0.5" />}</> },
    { label: 'Job Title', value: job.title },
    ...(job.department ? [{ label: 'Department', value: job.department }] : []),
    { label: 'Job Type', value: job.jobType },
    { label: 'Work Mode', value: job.workMode },
    { label: 'Location', value: `${job.city}, ${job.state}` },
    { label: 'Salary', value: <>{salaryText}{job.isSalaryNegotiable && !job.hideSalary && <span className="text-slate-500"> (Negotiable)</span>}</> },
    ...(job.openings ? [{ label: 'Openings', value: `${job.openings} Post${job.openings === 1 ? '' : 's'}` }] : []),
    { label: 'Qualification', value: job.qualification },
    ...(job.experienceRequired ? [{ label: 'Experience', value: job.experienceRequired }] : []),
    { label: 'Posted On', value: fmtDate(job.createdDate) },
    { label: 'Last Date to Apply', value: lastDateText, highlight: !!job.lastDate },
  ];

  const deadline = deadlineNote(job.lastDate);
  const stats: StatTile[] = [
    { label: 'Salary', value: <span className="text-sm sm:text-lg">{salaryText}</span>, note: job.isSalaryNegotiable && !job.hideSalary ? 'Negotiable' : undefined },
    { label: 'Openings', value: job.openings ? job.openings : '—' },
    { label: 'Experience', value: <span className="text-sm sm:text-lg">{job.experienceRequired || 'Freshers OK'}</span> },
    { label: 'Apply By', value: <span className="text-sm sm:text-lg">{lastDateText}</span>, note: deadline?.note, tone: deadline?.tone },
  ];

  const textBody = 'whitespace-pre-line font-medium';

  const inputCls = 'w-full bg-white border border-slate-200 focus:border-indigo-600 rounded-xl outline-none px-3 py-2.5 text-sm';
  const applyInner = alreadyApplied ? (
    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-center text-sm font-bold flex flex-col items-center gap-2">
      <CheckCircle2 className="w-6 h-6" />
      You've applied to this job
      <Link to="/dashboard/aspirant" className="text-xs font-bold underline">Track it in your dashboard</Link>
    </div>
  ) : !user ? (
    <button type="button" onClick={() => navigate('/login', { state: { from: `/private-jobs/${job.slug}` } })} className={`${btn.primary} w-full py-3 !bg-indigo-700 hover:!bg-indigo-800`}>
      Login to apply
    </button>
  ) : user.role !== 'aspirant' ? (
    <div className="bg-slate-50 border border-slate-200 rounded-xl text-slate-600 p-4 text-center text-sm font-semibold">Only job-seeker accounts can apply to jobs.</div>
  ) : !user.resumeUrl ? (
    <div className="bg-amber-50 border border-amber-200 rounded-xl text-amber-900 p-4 text-sm font-semibold space-y-2 text-center">
      <p>Add your résumé once — then apply to any job in one tap.</p>
      <button type="button" onClick={() => navigate('/dashboard/aspirant')} className={`${btn.primary} w-full !bg-amber-600 hover:!bg-amber-700`}>Upload résumé</button>
    </div>
  ) : showApplyForm ? (
    <form onSubmit={handleApply} className="space-y-3">
      {applyError && <div className="bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold px-3 py-2">{applyError}</div>}
      <label className="block text-xs font-bold text-slate-700">Cover letter (optional)
        <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={4} className={`${inputCls} mt-1 font-normal`} />
      </label>
      <label className="block text-xs font-bold text-slate-700">Expected salary (optional)
        <input value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} className={`${inputCls} mt-1 font-normal`} />
      </label>
      <button type="submit" disabled={applying} className={`${btn.primary} w-full py-3 !bg-indigo-700 hover:!bg-indigo-800`}>
        {applying ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  ) : (
    <button type="button" onClick={() => setShowApplyForm(true)} className={`${btn.primary} w-full py-3 !bg-indigo-700 hover:!bg-indigo-800`}>Apply now</button>
  );


  const share = () => {
    const url = `${window.location.origin}/private-jobs/${job.slug}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${job.title} at ${job.companyName} — apply here: ${url}`)}`, '_blank');
  };

  const PSection: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; id?: string }> = ({ icon: Icon, title, children, id }) => (
    <Card id={id} className="p-4 sm:p-5 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-[16px] sm:text-[17px] font-extrabold mb-3"><Icon className="w-5 h-5 text-indigo-600" />{title}</h2>
      <div className="text-[14.5px] leading-relaxed text-slate-700">{children}</div>
    </Card>
  );

  const modernFacts = [
    { icon: RupeeIcon, label: 'Salary', value: salaryText + (job.isSalaryNegotiable && !job.hideSalary ? ' (negotiable)' : '') },
    { icon: BriefcaseIcon, label: 'Job type', value: `${job.jobType} · ${job.workMode}` },
    { icon: UsersIcon, label: 'Experience', value: job.experienceRequired || 'Freshers can apply' },
    { icon: CalIcon, label: 'Apply by', value: lastDateText, alert: !!job.lastDate },
  ];

  const modernView = (
    <div className="flex-1 pb-20 lg:pb-0">
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex gap-3.5 sm:gap-4 items-start">
            <OrgAvatar name={job.companyName} logo={job.companyLogo} size="lg" className="max-sm:w-11 max-sm:h-11 max-sm:text-xs" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {job.isCompanyVerified && <Pill tone="green" icon={ShieldCheck}>Verified company</Pill>}
                {job.lastDate && <DeadlinePill date={job.lastDate} />}
                {job.isUrgent && <Pill tone="red" icon={Zap}>Urgent hiring</Pill>}
                {job.isFeatured && <Pill tone="amber" icon={Sparkles}>Featured</Pill>}
              </div>
              <h1 className="mt-2 text-[21px] sm:text-[28px] font-extrabold leading-tight text-slate-900">{job.title}</h1>
              <p className="text-[13px] sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">{job.companyName}</span>
                <span>·</span><MapPinIcon className="w-3.5 h-3.5" />{job.city}{job.state ? `, ${job.state}` : ''}
                <span>·</span>Posted {fmtDate(job.createdDate)}
              </p>
            </div>
            <div className="hidden md:flex gap-2 shrink-0">
              <button type="button" onClick={toggleSave} disabled={savingBookmark} aria-pressed={saved} className={cx(btn.secondary, saved && 'border-amber-300 bg-amber-50 text-amber-800')}>
                <Bookmark className={cx('w-4 h-4', saved && 'fill-amber-400 text-amber-500')} /> {saved ? 'Saved' : 'Save'}
              </button>
              <button type="button" onClick={share} className={btn.secondary}><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 mt-4 sm:mt-5 rounded-2xl border border-slate-200 overflow-hidden bg-slate-200 gap-px">
            {modernFacts.map((f) => (
              <div key={f.label} className="bg-white px-3.5 py-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><f.icon className="w-3.5 h-3.5" />{f.label}</span>
                <span className={cx('block mt-0.5 font-bold text-[15px] leading-snug break-words', f.alert ? 'text-red-700' : 'text-slate-900')}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 grid lg:grid-cols-[1fr_330px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <PSection icon={FileIcon} title="About the job"><div className="whitespace-pre-line">{job.description}</div></PSection>
          {job.requirements && <PSection icon={ListIcon} title="Responsibilities & requirements"><div className="whitespace-pre-line">{job.requirements}</div></PSection>}
          <PSection icon={GraduationCap} title="Qualification">
            <p>{job.qualification}</p>
            {job.experienceRequired && <p className="mt-1 text-slate-500">Experience: {job.experienceRequired}</p>}
            {job.openings ? <p className="mt-1 text-slate-500">Openings: {job.openings}</p> : null}
          </PSection>
          {skills.length > 0 && (
            <PSection icon={Tags} title="Key skills">
              <div className="flex flex-wrap gap-2">{skills.map((sk) => <span key={sk} className="rounded-full bg-indigo-50 text-indigo-800 px-3 py-1 text-[13px] font-semibold">{sk}</span>)}</div>
            </PSection>
          )}
          {job.benefits && <PSection icon={Gift} title="Perks & benefits"><div className="whitespace-pre-line">{job.benefits}</div></PSection>}
          {job.attachmentUrl && (
            <a href={job.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold hover:border-indigo-500">
              <DownloadIcon className="w-5 h-5 text-indigo-600" /> <span className="flex-1 truncate">{job.attachmentName || 'Job details document'}</span>
            </a>
          )}
          <div className="lg:hidden" id="apply-m"><Card className="p-5"><p className="font-extrabold mb-3">Apply for this job</p>{applyInner}</Card></div>
        </div>
        <aside className="hidden lg:block sticky top-20 space-y-4">
          <Card className="p-5" id="apply">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500">Apply by</span>
              {job.lastDate && <DeadlinePill date={job.lastDate} />}
            </div>
            <p className="text-xl font-extrabold mt-1 mb-4">{lastDateText}</p>
            {applyInner}
          </Card>
          <Card className="p-5 text-[13px] text-slate-600">
            <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Stay safe</p>
            Genuine employers never ask for money to apply or for an interview. Report anything suspicious to support@jobcharcha.com.
          </Card>
        </aside>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
        <button type="button" onClick={toggleSave} disabled={savingBookmark} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save job'}
          className={cx('w-12 h-12 rounded-xl border grid place-items-center shrink-0 cursor-pointer', saved ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600')}>
          <Bookmark className={cx('w-5 h-5', saved && 'fill-amber-400')} />
        </button>
        <a href="#apply-m" className={cx(btn.primary, 'flex-1 h-12 text-[15px] !bg-indigo-700')}>{alreadyApplied ? 'Applied ✓' : 'Apply now'}</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead
        title={`${job.title} at ${job.companyName} | JobCharcha`}
        description={metaDescription}
        path={`/private-jobs/${job.slug}`}
        ogImage={job.companyLogo || undefined}
        jsonLd={buildEmployerJobJsonLd(job)}
      />
      <Navbar user={user} />
      <ViewToggle view={view} onChange={setView} backTo="/private-jobs" backLabel="Private jobs" />

      {view === 'modern' ? modernView : (
      <div className="flex-1 pb-16 sm:pb-0">
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-3 sm:space-y-4">

        {/* Title block */}
        <header className="bg-white border sm:border-2 border-indigo-700/40 border-t-4 sm:border-t-4 border-t-indigo-700 text-center px-3 py-4 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-indigo-700 text-white">
              Private Job • {job.jobType} • {job.workMode}
            </span>
            {job.isFeatured && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Featured
              </span>
            )}
            {job.isUrgent && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> Urgent Hiring
              </span>
            )}
          </div>
          <p className="font-heading font-extrabold uppercase text-indigo-800 text-sm sm:text-base inline-flex items-center gap-1">
            {job.companyName}
            {job.isCompanyVerified && <ShieldCheck className="w-4 h-4 text-emerald-600" aria-label="Verified company" />}
          </p>
          <h1 className="font-heading font-extrabold text-red-700 text-xl sm:text-3xl leading-snug mt-1">{job.title}</h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>{job.city}, {job.state}</span>
            <span>Salary: <b className="text-slate-800">{salaryText}</b></span>
            <span>Last Date: <b className="text-red-700">{lastDateText}</b></span>
          </p>
          <div className="mt-4 hidden sm:flex flex-wrap items-center justify-center gap-2">
            <a href="#apply" className="inline-flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-extrabold px-4 py-2">
              {alreadyApplied ? 'Application Status' : 'Apply Now'}
            </a>
            <button
              onClick={toggleSave}
              disabled={savingBookmark}
              title={saved ? 'Remove from saved' : 'Save this job'}
              className={`inline-flex items-center gap-1.5 border-2 text-xs sm:text-sm font-extrabold px-3 py-1.5 cursor-pointer ${
                saved ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-amber-400' : ''}`} /> {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </header>

        <StatsStrip stats={stats} />

        <PortalBox title="Job Overview" tone="indigo" flush>
          <KeyValueTable rows={overviewRows} />
        </PortalBox>

        <PortalBox title="Job Description" tone="indigo">
          <div className={textBody}>{job.description}</div>
        </PortalBox>

        {job.requirements && (
          <PortalBox title="Key Responsibilities / Requirements" tone="indigo">
            <div className={textBody}>{job.requirements}</div>
          </PortalBox>
        )}

        {(job.benefits || skills.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.benefits && (
              <PortalBox title="Perks & Benefits" tone="indigo" className={skills.length > 0 ? '' : 'md:col-span-2'}>
                <div className={textBody}>{job.benefits}</div>
              </PortalBox>
            )}
            {skills.length > 0 && (
              <PortalBox title="Key Skills" tone="indigo" className={job.benefits ? '' : 'md:col-span-2'}>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 text-xs font-bold">{s}</span>
                  ))}
                </div>
              </PortalBox>
            )}
          </div>
        )}

        {/* Apply */}
        <div id="apply" className="scroll-mt-24">
          <PortalBox title="Apply Online" tone="red">
            <div className="max-w-md mx-auto">
              {applyInner}
            </div>
          </PortalBox>
        </div>

        {job.attachmentUrl && (
          <PortalBox title="Some Useful Important Links" tone="red" flush>
            <LinksTable links={[{ label: job.attachmentName || 'Job Details Document', href: job.attachmentUrl, cta: 'Download' }]} />
          </PortalBox>
        )}
      </main>

      <MobileActionBar>
        <a href="#apply" className="flex-1 inline-flex items-center justify-center bg-indigo-700 active:bg-indigo-800 text-white text-sm font-extrabold py-2.5">
          {alreadyApplied ? 'Applied ✓' : 'Apply Now'}
        </a>
        <button onClick={toggleSave} disabled={savingBookmark} aria-label={saved ? 'Remove from saved' : 'Save this job'}
          className={`inline-flex items-center justify-center gap-1.5 border-2 px-4 text-sm font-extrabold cursor-pointer ${saved ? 'bg-amber-50 border-amber-400 text-amber-800' : 'border-slate-300 text-slate-700'}`}>
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-amber-400' : ''}`} /> {saved ? 'Saved' : 'Save'}
        </button>
      </MobileActionBar>
      </div>
      )}

      <Footer />
    </div>
  );
}
