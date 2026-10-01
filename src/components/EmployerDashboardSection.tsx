import React, { useState, useEffect, useCallback } from 'react';
import { Building2, PlusCircle, Users, CheckCircle2, Sparkles, Search, CreditCard, Eye, MapPin, X, Briefcase, Hourglass } from 'lucide-react';
import { DashboardLayout, DashNavGroup, StatTile } from './dashboard/DashboardLayout';
import { UserProfile } from '../types';
import { CandidateSearchPanel } from './employer/CandidateSearchPanel';
import { EmployerBillingPanel } from './employer/EmployerBillingPanel';
import { EmployerVerificationBanner } from './employer/EmployerVerificationBanner';
import {
  getMyEmployerJobs, createEmployerJob, closeEmployerJob,
  ApiEmployerJobListItem, UpsertEmployerJobPayload,
} from '../api/employerJobs';
import { getEmployerJobApplications, updateApplicationStatus, ApiJobApplication } from '../api/jobApplications';
import { ApiError } from '../api/client';
import { OfficialDocumentUpload } from './admin/OfficialDocumentUpload';
import { uploadEmployerDocument } from '../api/uploads';
import { Select } from './ui/Select';

interface EmployerDashboardSectionProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const emptyForm: UpsertEmployerJobPayload = {
  title: '',
  jobType: 'Full-time',
  workMode: 'On-site',
  description: '',
  qualification: '',
  city: '',
  state: '',
};

export const EmployerDashboardSection: React.FC<EmployerDashboardSectionProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'post' | 'applicants' | 'search' | 'billing'>('listings');
  const [jobs, setJobs] = useState<ApiEmployerJobListItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [postError, setPostError] = useState<string | null>(null);
  const [postNotice, setPostNotice] = useState<string | null>(null);
  const [form, setForm] = useState<UpsertEmployerJobPayload>(emptyForm);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applications, setApplications] = useState<ApiJobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const loadJobs = useCallback(() => {
    setJobsLoading(true);
    getMyEmployerJobs().then(setJobs).catch(() => setJobs([])).finally(() => setJobsLoading(false));
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const loadApplications = useCallback((jobId: number) => {
    setApplicationsLoading(true);
    getEmployerJobApplications(jobId).then(setApplications).catch(() => setApplications([])).finally(() => setApplicationsLoading(false));
  }, []);

  const openApplicants = (jobId: number) => {
    setSelectedJobId(jobId);
    setActiveTab('applicants');
    loadApplications(jobId);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    setPostNotice(null);
    try {
      const created = await createEmployerJob(form);
      setForm(emptyForm);
      loadJobs();
      setActiveTab('listings');
      setPostNotice(
        created.status === 'PendingReview'
          ? 'Your posting was submitted and is awaiting a one-time review by our team — it will go live once approved. Later postings from your account publish immediately.'
          : 'Your posting is live.',
      );
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : 'Could not post this job. Please try again.');
    }
  };

  const handleClose = async (jobId: number) => {
    await closeEmployerJob(jobId);
    loadJobs();
  };

  const [interviewFor, setInterviewFor] = useState<number | null>(null);
  const [interviewForm, setInterviewForm] = useState({ date: '', location: '', mode: 'In-person' });

  const handleApplicationStatus = async (
    appId: number,
    status: string,
    extra?: { interviewDate?: string; interviewLocation?: string; interviewMode?: string },
  ) => {
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    try {
      await updateApplicationStatus(appId, { status, ...extra });
    } catch {
      if (selectedJobId) loadApplications(selectedJobId);
    }
  };

  const submitInterview = async (appId: number) => {
    await handleApplicationStatus(appId, 'Interview', {
      interviewDate: interviewForm.date || undefined,
      interviewLocation: interviewForm.location || undefined,
      interviewMode: interviewForm.mode || undefined,
    });
    setInterviewFor(null);
    setInterviewForm({ date: '', location: '', mode: 'In-person' });
  };

  const activeJobsCount = jobs.filter((j) => j.isActive).length;
  const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);
  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);
  const pendingReview = jobs.filter((j) => j.status === 'PendingReview').length;

  const navGroups: DashNavGroup[] = [
    { title: 'Jobs', items: [
      { id: 'listings', label: 'My job postings', icon: Building2, badge: jobs.length || null },
      { id: 'post', label: 'Post vacancy', icon: PlusCircle },
    ] },
    { title: 'Candidates', items: [
      { id: 'applicants', label: 'Applications', icon: Users, badge: totalApplications || null },
      { id: 'search', label: 'Find candidates', icon: Search },
    ] },
    { title: 'Account', items: [{ id: 'billing', label: 'Plan & credits', icon: CreditCard }] },
  ];

  return (
    <DashboardLayout
      groups={navGroups}
      active={activeTab}
      onSelect={(id) => {
        if (id === 'applicants' && !selectedJobId && jobs.length > 0) openApplicants(jobs[0].id);
        else if (id === 'post') { setForm(emptyForm); setPostError(null); setActiveTab('post'); }
        else setActiveTab(id as typeof activeTab);
      }}
      title={activeTab === 'listings' ? (user.companyName || 'Employer dashboard') : undefined}
      subtitle={
        <span className="inline-flex items-center gap-1">
          {user.isCompanyVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
          {user.isCompanyVerified ? 'Verified employer · ' : ''}Post jobs, screen applicants and unlock candidate contacts
        </span>
      }
      actions={activeTab !== 'post' ? (
        <button
          onClick={() => { setForm(emptyForm); setPostError(null); setActiveTab('post'); }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[13px] px-3 sm:px-4 py-2.5 cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)]"
        >
          <PlusCircle className="w-4 h-4" /><span className="hidden sm:inline">Post vacancy</span>
        </button>
      ) : undefined}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 max-w-[1280px]">

        <EmployerVerificationBanner user={user} />

        {activeTab === 'listings' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <StatTile icon={Briefcase} tone="bg-blue-50 text-blue-700" value={activeJobsCount} label="Active jobs" hint={`${jobs.length} posted in total`} />
            <StatTile icon={Users} tone="bg-blue-50 text-blue-700" value={totalApplications} label="Applications" hint="Across all postings" onClick={() => jobs.length > 0 && openApplicants(jobs[0].id)} />
            <StatTile icon={Eye} tone="bg-violet-50 text-violet-700" value={totalViews.toLocaleString('en-IN')} label="Job views" hint="All postings" />
            <StatTile icon={Hourglass} tone={pendingReview ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'} value={pendingReview} label="Awaiting review" hint={pendingReview ? 'Our team checks within a day' : 'All reviewed'} />
          </div>
        )}

        {/* TAB 1: LISTINGS */}
        {activeTab === 'listings' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-extrabold text-slate-900">My job postings</h2>
              {jobs.length > 0 && <span className="text-[12.5px] font-semibold text-slate-500">{activeJobsCount} active · {jobs.length - activeJobsCount} closed or pending</span>}
            </div>

            {postNotice && (
              <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold rounded-xl px-3 py-2.5 flex items-start justify-between gap-3">
                <span>{postNotice}</span>
                <button onClick={() => setPostNotice(null)} className="text-sky-400 hover:text-sky-700 shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {jobsLoading ? (
              <div className="text-xs font-semibold text-slate-400">Loading your postings…</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No job postings yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Post your first vacancy to start receiving applications.</p>
                <button onClick={() => setActiveTab('post')} className="bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
                  Post a Vacancy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div key={job.id} className={`relative overflow-hidden p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_28px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-4 pl-5 sm:pl-6`}>
                    <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${job.status === 'PendingReview' ? 'bg-amber-400' : job.status === 'Rejected' ? 'bg-rose-500' : job.isActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-100 text-slate-700 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {job.jobType}
                        </span>
                        {job.isFeatured && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                          </span>
                        )}
                        {job.status === 'PendingReview' && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded">Awaiting review</span>
                        )}
                        {job.status === 'Rejected' && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded">Rejected</span>
                        )}
                        {job.status === 'Closed' && (
                          <span className="bg-slate-200 text-slate-500 text-[10px] font-extrabold px-2.5 py-0.5 rounded">Closed</span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-[15.5px] text-slate-900 break-words">{job.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                        <MapPin className="w-3 h-3" /> {job.city}, {job.state}
                        <span className="mx-1">•</span>
                        <Eye className="w-3 h-3" /> {job.viewCount} views
                        <span className="mx-1">•</span>
                        {job.applicationCount} applications
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openApplicants(job.id)}
                        className="inline-flex items-center gap-1 bg-blue-700 text-white hover:bg-blue-800 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" /> Applications ({job.applicationCount})
                      </button>
                      {job.isActive && (
                        <button
                          onClick={() => handleClose(job.id)}
                          className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POST JOB FORM */}
        {activeTab === 'post' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900">Create New Job Posting</h2>

            {postError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">
                {postError}
              </div>
            )}

            <form onSubmit={handlePostJob} className="space-y-6 text-xs font-bold">

              {/* Group 1 — the basics */}
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <legend className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">Role Basics</legend>

                <div className="md:col-span-2">
                  <label className="text-slate-700 block mb-1">Job Designation Title *</label>
                  <input
                    type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer / Assistant Manager"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Department / Team (optional)</label>
                  <input
                    type="text" value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Engineering, Sales, Operations"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Experience Required (optional)</label>
                  <input
                    type="text" value={form.experienceRequired || ''} onChange={(e) => setForm({ ...form, experienceRequired: e.target.value })}
                    placeholder="e.g. 2–4 years, Fresher, 5+ years"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Job Type</label>
                  <Select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Freelance">Freelance</option>
                  </Select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Work Mode</label>
                  <Select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium">
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </Select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">City *</label>
                  <input
                    type="text" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">State *</label>
                  <input
                    type="text" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Number of Openings</label>
                  <input
                    type="number" min={1} value={form.openings ?? ''} onChange={(e) => setForm({ ...form, openings: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Application Deadline (optional)</label>
                  <input
                    type="date" value={form.lastDate || ''} onChange={(e) => setForm({ ...form, lastDate: e.target.value || undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-700 block mb-1">Eligibility / Qualification Required *</label>
                  <input
                    type="text" required value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder="e.g. B.E./B.Tech in CS or IT; MBA preferred"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>
              </fieldset>

              {/* Group 2 — compensation */}
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <legend className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">Compensation</legend>

                <div>
                  <label className="text-slate-700 block mb-1">Monthly Salary — Min (optional)</label>
                  <input
                    type="text" placeholder="e.g. 40000" value={form.salaryMin || ''} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1">Monthly Salary — Max (optional)</label>
                  <input
                    type="text" placeholder="e.g. 65000" value={form.salaryMax || ''} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-2 pt-1">
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                    <input type="checkbox" checked={!!form.isSalaryNegotiable} onChange={(e) => setForm({ ...form, isSalaryNegotiable: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Salary is negotiable
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                    <input type="checkbox" checked={!!form.hideSalary} onChange={(e) => setForm({ ...form, hideSalary: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Hide salary from the public listing
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                    <input type="checkbox" checked={!!form.isUrgent} onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Mark as urgent hiring
                  </label>
                </div>
              </fieldset>

              {/* Group 3 — the detail */}
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">Role Detail</legend>

                <div>
                  <label className="text-slate-700 block mb-1">Job Description *</label>
                  <textarea
                    required rows={5} minLength={20} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What the role involves, who you're looking for, what a typical week looks like…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">At least 20 characters.</p>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Key Responsibilities / Requirements (optional)</label>
                  <textarea
                    rows={4} value={form.requirements || ''} onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    placeholder="One per line — e.g.&#10;• Own the release pipeline end to end&#10;• Mentor 2 junior engineers"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Perks &amp; Benefits (optional)</label>
                  <textarea
                    rows={3} value={form.benefits || ''} onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                    placeholder="Health cover, flexible hours, learning budget, ESOPs…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Key Skills (optional)</label>
                  <input
                    type="text" maxLength={500} value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="Comma-separated — e.g. React, .NET, SQL Server, Azure"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <OfficialDocumentUpload
                  value={form.attachmentUrl}
                  fileName={form.attachmentName}
                  onChange={(url, name) => setForm({ ...form, attachmentUrl: url, attachmentName: name })}
                  upload={uploadEmployerDocument}
                  label="Job Details Document (PDF or image, optional)"
                  hint="Attach a detailed JD, brochure, or role deck. Candidates can download it from the posting."
                />
              </fieldset>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl cursor-pointer"
                >
                  Publish Job Vacancy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: CANDIDATE APPLICATIONS */}
        {activeTab === 'applicants' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900">
                Applications {selectedJob ? <span className="text-slate-500 font-semibold text-sm">— {selectedJob.title}</span> : null}
              </h2>
              {jobs.length > 1 && (
                <Select
                  value={selectedJobId ?? ''}
                  onChange={(e) => openApplicants(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </Select>
              )}
            </div>

            {!selectedJobId ? (
              <div className="text-xs font-semibold text-slate-400">Post a job to start receiving applications.</div>
            ) : applicationsLoading ? (
              <div className="text-xs font-semibold text-slate-400">Loading applications…</div>
            ) : applications.length === 0 ? (
              <div className="text-xs font-semibold text-slate-400 text-center py-8">No applications yet for this posting.</div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">{app.applicantName}</h3>
                        <p className="text-xs text-slate-500">
                          {app.applicantEmail} {app.applicantPhone ? `• ${app.applicantPhone}` : ''} • Applied {new Date(app.createdDate).toLocaleDateString()}
                        </p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-center ${
                        app.status === 'Selected' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'Shortlisted' ? 'bg-indigo-100 text-indigo-800' :
                        app.status === 'Interview' ? 'bg-violet-100 text-violet-800' :
                        app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        app.status === 'UnderReview' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status === 'UnderReview' ? 'Under Review' : app.status}
                      </span>
                    </div>

                    {app.coverLetter && (
                      <p className="text-xs text-slate-600 border-y border-slate-200/60 py-2 font-medium">{app.coverLetter}</p>
                    )}

                    <div className="text-xs text-slate-600 flex flex-wrap gap-4 font-medium">
                      {app.expectedSalary && <span>Expected: {app.expectedSalary}</span>}
                      {app.resumeUrl ? (
                        <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-bold hover:underline">View Resume</a>
                      ) : (
                        <span className="text-slate-400">No resume on file</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApplicationStatus(app.id, 'Shortlisted')}
                        className="bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => { setInterviewFor(interviewFor === app.id ? null : app.id); setInterviewForm({ date: '', location: '', mode: 'In-person' }); }}
                        className="bg-violet-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Interview
                      </button>
                      <button
                        onClick={() => handleApplicationStatus(app.id, 'Selected')}
                        className="bg-blue-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => handleApplicationStatus(app.id, 'Rejected')}
                        className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>

                    {interviewFor === app.id && (
                      <div className="bg-white border border-violet-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-violet-800">Schedule interview</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input type="date" value={interviewForm.date} onChange={(e) => setInterviewForm((f) => ({ ...f, date: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium" />
                          <input placeholder="Location / link" value={interviewForm.location} onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium" />
                          <Select value={interviewForm.mode} onChange={(e) => setInterviewForm((f) => ({ ...f, mode: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium">
                            <option>In-person</option>
                            <option>Phone</option>
                            <option>Video</option>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => submitInterview(app.id)} className="bg-violet-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer">
                            Confirm interview
                          </button>
                          <button onClick={() => setInterviewFor(null)} className="bg-white border border-slate-200 text-slate-600 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FIND CANDIDATES — real search + contact-unlock */}
        {activeTab === 'search' && (
          <CandidateSearchPanel onGoToBilling={() => setActiveTab('billing')} />
        )}

        {/* TAB 5: PLAN & CREDITS — real subscription/billing */}
        {activeTab === 'billing' && (
          <EmployerBillingPanel />
        )}

      </div>
    </DashboardLayout>
  );
};
