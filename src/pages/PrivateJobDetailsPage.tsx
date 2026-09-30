import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Loader2, ArrowLeft, MapPin, Briefcase, IndianRupee, CalendarDays, ShieldCheck,
  CheckCircle2, Sparkles, Zap, FileText, ListChecks, Gift, Tags, Paperclip, Download, Bookmark,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getPublicEmployerJobBySlug, ApiPublicEmployerJobDetail } from '../api/employerJobs';
import { applyToJob } from '../api/jobApplications';
import { getSavedJobIds, saveJob, unsaveJob } from '../api/savedJobs';
import { ApiError } from '../api/client';

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

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="bg-white shadow-sm rounded-3xl border border-slate-200 p-6 sm:p-7">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">{title}</h2>
    </div>
    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{children}</div>
  </div>
);

export default function PrivateJobDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<ApiPublicEmployerJobDetail | null>(null);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SeoHead
        title={`${job.title} at ${job.companyName} | JobCharcha`}
        description={metaDescription}
        path={`/private-jobs/${job.slug}`}
        ogImage={job.companyLogo || undefined}
        jsonLd={buildEmployerJobJsonLd(job)}
      />
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="bg-slate-900 shadow-lg text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <button
            onClick={toggleSave}
            disabled={savingBookmark}
            title={saved ? 'Remove from saved' : 'Save this job'}
            className={`absolute top-5 right-5 z-10 p-2.5 rounded-2xl border cursor-pointer transition-colors ${
              saved ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-amber-400' : ''}`} />
          </button>
          <div className="relative z-10 space-y-2 pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                {job.jobType} • {job.workMode}
              </span>
              {job.isFeatured && (
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
              {job.isUrgent && (
                <span className="bg-red-500/15 text-red-300 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Urgent Hiring
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-heading font-extrabold leading-snug">{job.title}</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" /> {job.companyName}
              {job.isCompanyVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            </p>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: MapPin, label: 'Location', value: `${job.city}, ${job.state}` },
              { icon: IndianRupee, label: 'Salary', value: salaryText },
              { icon: Briefcase, label: 'Openings', value: job.openings ? `${job.openings} posts` : '—' },
              { icon: CalendarDays, label: 'Apply By', value: job.lastDate ? new Date(job.lastDate).toLocaleDateString() : 'Open' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3 hover:-translate-y-0.5 transition-transform duration-300">
                <item.icon className="w-3.5 h-3.5 text-indigo-400 mb-1.5" />
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{item.label}</span>
                <span className="font-extrabold text-white text-xs sm:text-sm break-words">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Section icon={FileText} title="Job Description">{job.description}</Section>
            {job.requirements && <Section icon={ListChecks} title="Key Responsibilities / Requirements">{job.requirements}</Section>}
            {job.benefits && <Section icon={Gift} title="Perks & Benefits">{job.benefits}</Section>}
            <Section icon={Briefcase} title="Qualification">
              {job.qualification}
              {job.experienceRequired && <div className="mt-2 font-semibold">Experience: {job.experienceRequired}</div>}
            </Section>
            {job.skills && (
              <Section icon={Tags} title="Key Skills">
                <div className="flex flex-wrap gap-2">
                  {job.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            {job.attachmentUrl && (
              <Section icon={Paperclip} title="Job Details Document">
                <a
                  href={job.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="truncate">{job.attachmentName || 'Download attachment'}</span>
                </a>
              </Section>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                {alreadyApplied ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-center text-xs font-bold flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    You've applied to this job
                  </div>
                ) : !user ? (
                  <button
                    onClick={() => navigate('/login', { state: { from: `/private-jobs/${job.slug}` } })}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl cursor-pointer"
                  >
                    Login to Apply
                  </button>
                ) : user.role !== 'aspirant' ? (
                  <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl p-4 text-center text-xs font-semibold">
                    Only aspirant accounts can apply to jobs.
                  </div>
                ) : !user.resumeUrl ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-semibold space-y-2">
                    <p>You need a résumé on file before you can apply.</p>
                    <button
                      onClick={() => navigate('/dashboard/aspirant')}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Upload résumé
                    </button>
                  </div>
                ) : showApplyForm ? (
                  <form onSubmit={handleApply} className="space-y-3">
                    {applyError && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold rounded-xl px-3 py-2">{applyError}</div>}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Cover Letter (optional)</label>
                      <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Expected Salary (optional)</label>
                      <input value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium" />
                    </div>
                    <button type="submit" disabled={applying}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black text-sm px-6 py-3 rounded-2xl cursor-pointer">
                      {applying ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowApplyForm(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl cursor-pointer"
                  >
                    Apply Now
                  </button>
                )}

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Job Type</span><span className="font-bold text-slate-800">{job.jobType}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Work Mode</span><span className="font-bold text-slate-800">{job.workMode}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400 font-semibold shrink-0">Posted</span><span className="font-bold text-slate-800">{new Date(job.createdDate).toLocaleDateString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
