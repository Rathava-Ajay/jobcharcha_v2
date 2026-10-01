import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJobBySlug } from '../api/jobs';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { ModernJobView } from '../components/jobDetail/ModernJobView';
import { ClassicJobView } from '../components/jobDetail/ClassicJobView';
import { buildJobViewModel, DetailJob } from '../components/jobDetail/jobViewModel';
import { useDetailView, useSavedGovtJobs, useReminders } from '../utils/localPrefs';
import { btn } from '../components/ui/kit';
import { ViewToggle } from '../components/jobDetail/ViewToggle';

export default function JobDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<DetailJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useDetailView();
  const { isSaved, toggle: toggleSaved } = useSavedGovtJobs();
  const { hasReminder, toggle: toggleReminder } = useReminders();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getJobBySlug(slug)
      .then(setJob)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'facebook') => {
    if (!job) return;
    const url = `${window.location.origin}/jobs/${job.slug}`;
    const text = `Check out this job opening: ${job.title} at ${job.companyOrDept} (${job.vacancyCount} Posts)! Apply here: ${url}`;
    if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    else window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" role="status" aria-label="Loading job" />
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Job not found</h1>
          <p className="text-sm text-slate-500">This vacancy may have been removed or the link is incorrect.</p>
          <Link to="/jobs" className={btn.primary}>Browse latest jobs</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const vm = buildJobViewModel(job);
  const { faqEntries, hasSalaryRange } = vm;
  const jobKey = job.slug ?? job.id;
  const viewProps = {
    job,
    vm,
    saved: isSaved(jobKey),
    onToggleSave: () => toggleSaved({ slug: jobKey, title: job.title, org: job.companyOrDept, lastDate: job.lastDate }),
    reminded: hasReminder(jobKey),
    onToggleReminder: () => toggleReminder({ slug: jobKey, title: job.title, lastDate: job.lastDate }),
    onShare: handleShare,
  };

  // Google Jobs wants an ISO-8601 validThrough; job.lastDate is a bare yyyy-MM-dd from the API.
  const validThrough = /^\d{4}-\d{2}-\d{2}$/.test(job.lastDate) ? `${job.lastDate}T23:59:59+05:30` : job.lastDate;

  // JobPosting.description accepts HTML and should be a *complete* representation of the job. Use
  // the overview when it has real substance; otherwise compose one from the structured fields so
  // Google never sees a one-line description.
  const overviewText = (job.overview || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const jobPostingDescription = overviewText.length >= 120
    ? job.overview!
    : [
        overviewText || null,
        job.eligibility ? `Eligibility: ${job.eligibility.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}` : null,
        job.qualification ? `Qualification: ${job.qualification}` : null,
        job.vacancyCount ? `Total vacancies: ${job.vacancyCount}` : null,
        job.location ? `Location: ${job.location}` : null,
        job.salary ? `Salary: ${job.salary}` : null,
        job.applicationFee !== undefined ? `Application fee: ₹${job.applicationFee}` : null,
        `Apply on or before ${job.lastDate}.`,
      ].filter(Boolean).join(' ');

  const jsonLdBlocks: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: jobPostingDescription,
    identifier: {
      '@type': 'PropertyValue',
      name: job.companyOrDept,
      value: job.advertisementNumber || job.slug || String(job.id),
    },
    datePosted: job.postedDate,
    validThrough,
    employmentType: job.type === 'public' ? 'FULL_TIME' : 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyOrDept,
      ...(job.organizationLogo ? { logo: job.organizationLogo } : {}),
      ...(job.officialWebsite ? { sameAs: job.officialWebsite } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        ...((job.state || job.district) ? { addressRegion: job.state || job.district } : {}),
        addressCountry: 'IN',
      },
    },
    ...(hasSalaryRange ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: { '@type': 'QuantitativeValue', minValue: job.minSalary, maxValue: job.maxSalary, unitText: 'MONTH' },
      },
    } : {}),
  }];
  if (faqEntries) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntries.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }


  return (
    <div className="min-h-screen flex flex-col">
      <SeoHead
        title={job.metaTitle || `${job.title} - ${job.vacancyCount} Vacancies | JobCharcha`}
        description={job.metaDescription || job.overview || job.qualification}
        keywords={job.metaKeywords}
        ogTitle={job.ogTitle}
        ogDescription={job.ogDescription}
        ogImage={job.organizationLogo}
        path={`/jobs/${job.slug}`}
        jsonLd={jsonLdBlocks}
      />
      <Navbar user={user} />

      <ViewToggle view={view} onChange={setView} />

      <div className="flex-1">
        {view === 'classic' ? <ClassicJobView {...viewProps} /> : <ModernJobView {...viewProps} />}
      </div>

      <Footer />
    </div>
  );
}
