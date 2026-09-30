import React, { useState, useEffect, useCallback } from 'react';
import { Building2, PlusCircle, Users, CheckCircle2, Sparkles, Search, CreditCard, ArrowLeft, Eye, MapPin, X } from 'lucide-react';
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

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header Banner */}
        <div className="bg-slate-900 shadow-lg text-white p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Verified Employer Portal</span>
              {user.isCompanyVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              {user.companyName || 'Employer Studio'} Management Suite
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Post real job openings, screen applicants, and unlock candidate resumes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-extrabold">Active Jobs</span>
              <span className="font-black text-emerald-400 text-base">{activeJobsCount} Posted</span>
            </div>

            <button
              onClick={() => { setForm(emptyForm); setPostError(null); setActiveTab('post'); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Vacancy</span>
            </button>
          </div>
        </div>

        <EmployerVerificationBanner user={user} />

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-4 text-xs font-bold">
          {[
            { id: 'listings', label: `My Job Postings (${jobs.length})`, icon: Building2 },
            { id: 'post', label: 'Post Vacancy', icon: PlusCircle },
            { id: 'applicants', label: `Candidate Applications (${totalApplications})`, icon: Users },
            { id: 'search', label: 'Find Candidates', icon: Search },
            { id: 'billing', label: 'Plan & Credits', icon: CreditCard },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'applicants' && !selectedJobId && jobs.length > 0) openApplicants(jobs[0].id);
                  else setActiveTab(tab.id as any);
                }}
                className={`pb-3 px-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-emerald-700 border-b-2 border-emerald-600 font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: LISTINGS */}
        {activeTab === 'listings' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-heading font-extrabold text-slate-900">My Job Postings</h2>

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
                <button onClick={() => setActiveTab('post')} className="bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
                  Post a Vacancy
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded">
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
                      <h3 className="font-heading font-extrabold text-base text-slate-900">{job.title}</h3>
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
                        className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                      >
                        View Applications
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
            <h2 className="text-xl font-heading font-extrabold text-slate-900">Create New Job Posting</h2>

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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
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
                  <select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Work Mode</label>
                  <select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium">
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
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
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Salary is negotiable
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                    <input type="checkbox" checked={!!form.hideSalary} onChange={(e) => setForm({ ...form, hideSalary: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Hide salary from the public listing
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                    <input type="checkbox" checked={!!form.isUrgent} onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl cursor-pointer"
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
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Applications {selectedJob ? <span className="text-slate-500 font-semibold text-sm">— {selectedJob.title}</span> : null}
              </h2>
              {jobs.length > 1 && (
                <select
                  value={selectedJobId ?? ''}
                  onChange={(e) => openApplicants(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
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
                        <h3 className="font-heading font-extrabold text-base text-slate-900">{app.applicantName}</h3>
                        <p className="text-xs text-slate-500">
                          {app.applicantEmail} {app.applicantPhone ? `• ${app.applicantPhone}` : ''} • Applied {new Date(app.createdDate).toLocaleDateString()}
                        </p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-center ${
                        app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800' :
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
                        <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">View Resume</a>
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
                        className="bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
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
                          <select value={interviewForm.mode} onChange={(e) => setInterviewForm((f) => ({ ...f, mode: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium">
                            <option>In-person</option>
                            <option>Phone</option>
                            <option>Video</option>
                          </select>
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
    </section>
  );
};
