import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Users, Briefcase, FileCheck, Send, CheckCircle2, BarChart3,
  Layers, PlusCircle, Trash2, Pencil, X, Clock3, Award, Trophy, Smartphone,
  Landmark, Newspaper, GraduationCap, Rss, BellRing, ShieldAlert, CreditCard,
  ShoppingBag, Wallet, Receipt, AlertTriangle, ScrollText, QrCode, Radar,
} from 'lucide-react';
import { Job } from '../types';
import { getDashboardStats, DashboardStats } from '../api/dashboard';
import {
  adminSearchJobs, createJob, updateJob, deleteJob, setJobActive, getJobBySlug, UpsertJobPayload,
} from '../api/jobs';
import {
  adminGetAllCategories, createCategory, updateCategory, deleteCategory,
  ApiCategory, UpsertCategoryPayload,
} from '../api/categories';
import { ApiError } from '../api/client';
import { AdminAdmitCardsPanel } from './admin/AdminAdmitCardsPanel';
import { AdminResultsPanel } from './admin/AdminResultsPanel';
import { AdminMockTestsPanel } from './admin/AdminMockTestsPanel';
import { AdminExamsPanel } from './admin/AdminExamsPanel';
import { AdminSchemesPanel } from './admin/AdminSchemesPanel';
import { AdminNewsPanel } from './admin/AdminNewsPanel';
import { AdminStudyMaterialsPanel } from './admin/AdminStudyMaterialsPanel';
import { AdminOldPapersPanel } from './admin/AdminOldPapersPanel';
import { AdminBlogPanel } from './admin/AdminBlogPanel';
import { AdminJobAlertsPanel } from './admin/AdminJobAlertsPanel';
import { AdminUsersPanel } from './admin/AdminUsersPanel';
import { AdminEmployerContactsPanel } from './admin/AdminEmployerContactsPanel';
import { AdminEmployerJobsPanel } from './admin/AdminEmployerJobsPanel';
import { AdminEmployerPlansPanel } from './admin/AdminEmployerPlansPanel';
import { AdminAspirantPlansPanel } from './admin/AdminAspirantPlansPanel';
import { AdminProductsPanel } from './admin/AdminProductsPanel';
import { AdminWalletPanel } from './admin/AdminWalletPanel';
import { AdminPaymentsPanel } from './admin/AdminPaymentsPanel';
import { AdminDisputesPanel } from './admin/AdminDisputesPanel';
import { AdminAuditLogPanel } from './admin/AdminAuditLogPanel';
import { AdminCampaignLinksPanel } from './admin/AdminCampaignLinksPanel';
import { AdminJobDraftsPanel } from './admin/AdminJobDraftsPanel';
import { BulkImportExportBar } from './admin/BulkImportExportBar';
import { OfficialDocumentUpload } from './admin/OfficialDocumentUpload';

type AdminTab = 'overview' | 'jobs' | 'jobdrafts' | 'categories' | 'admitcards' | 'results' | 'schemes' | 'news' | 'study' | 'oldpapers' | 'blog' | 'alerts' | 'users' | 'mocks' | 'exams' | 'social' | 'employer-jobs' | 'employer-contacts' | 'employer-plans' | 'aspirant-plans' | 'products' | 'wallet' | 'payments' | 'disputes' | 'audit' | 'campaign';

const ComingSoonBadge = () => (
  <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
    <Clock3 className="w-3 h-3" /> Coming in a later phase
  </span>
);

const emptyJobForm: UpsertJobPayload = {
  title: '',
  organizationName: '',
  categoryId: 0,
  location: '',
  totalPosts: 10,
  salary: '',
  qualificationRequired: '',
  postedDate: new Date().toISOString().slice(0, 10),
  lastDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  isFeatured: false,
  isUrgent: false,
  isNew: true,
  status: 1,
  isActive: true,
};

const emptyCategoryForm: UpsertCategoryPayload = {
  name: '',
  icon: 'Briefcase',
  displayOrder: 0,
  showOnHomepage: false,
  isActive: true,
};

export const AdminDashboardSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Overview
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Jobs
  const [jobs, setJobsList] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobForm, setJobForm] = useState<UpsertJobPayload>(emptyJobForm);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);

  // Categories
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState<UpsertCategoryPayload>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    getDashboardStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
  }, []);

  const loadJobs = useCallback(() => {
    setJobsLoading(true);
    adminSearchJobs({ pageSize: 50 }).then((r) => setJobsList(r.items)).catch(() => {}).finally(() => setJobsLoading(false));
  }, []);

  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    adminGetAllCategories().then(setCategories).catch(() => {}).finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (activeTab === 'jobs') loadJobs(); }, [activeTab, loadJobs]);
  useEffect(() => {
    if (['categories', 'jobs', 'admitcards', 'results', 'news', 'study', 'oldpapers', 'blog'].includes(activeTab)) loadCategories();
  }, [activeTab, loadCategories]);

  const resetJobForm = () => { setJobForm(emptyJobForm); setEditingJobId(null); setJobFormOpen(false); setFormError(null); };
  const resetCategoryForm = () => { setCategoryForm(emptyCategoryForm); setEditingCategoryId(null); setCategoryFormOpen(false); setFormError(null); };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingJobId) await updateJob(editingJobId, jobForm);
      else await createJob(jobForm);
      resetJobForm();
      loadJobs();
      loadStats();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save job.');
    }
  };

  const handleEditJob = async (job: Job & { id: string }) => {
    setEditingJobId(Number(job.id));
    setJobForm({
      title: job.title,
      organizationName: job.companyOrDept,
      categoryId: categories.find((c) => c.name === job.category)?.id || 0,
      location: job.location,
      totalPosts: job.vacancyCount,
      salary: job.salary,
      qualificationRequired: job.qualification,
      postedDate: job.postedDate,
      lastDate: job.lastDate,
      isFeatured: !!job.isFeatured,
      isUrgent: !!job.isUrgent,
      isNew: !!job.isNew,
      status: job.status === 'Draft' ? 0 : job.status === 'Expired' ? 2 : 1,
      isActive: true,
    });
    setJobFormOpen(true);
    // The list row carries no notification-file field — pull it from the full record so a
    // re-save doesn't wipe an existing attachment.
    try {
      const full = await getJobBySlug(job.slug);
      if (full.officialNotificationUrl) {
        setJobForm((f) => ({ ...f, officialNotificationPdf: full.officialNotificationUrl }));
      }
    } catch { /* non-fatal — admin can re-upload */ }
  };

  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null);

  const handleDeleteJob = async (id: string) => {
    if (confirmDeleteJobId !== id) {
      setConfirmDeleteJobId(id);
      return;
    }
    setConfirmDeleteJobId(null);
    await deleteJob(Number(id));
    loadJobs();
    loadStats();
  };

  const handleToggleJobActive = async (id: string, next: boolean) => {
    await setJobActive(Number(id), next);
    loadJobs();
    loadStats();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingCategoryId) await updateCategory(editingCategoryId, categoryForm);
      else await createCategory(categoryForm);
      resetCategoryForm();
      loadCategories();
      loadStats();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save category.');
    }
  };

  const handleEditCategory = (c: ApiCategory) => {
    setEditingCategoryId(c.id);
    setCategoryForm({
      name: c.name,
      nameGujarati: c.nameGujarati || undefined,
      slug: c.slug,
      description: c.description || undefined,
      icon: c.icon,
      displayOrder: c.displayOrder,
      showOnHomepage: c.showOnHomepage,
      isActive: c.isActive,
    });
    setCategoryFormOpen(true);
  };

  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);

  const handleDeleteCategory = async (id: number) => {
    if (confirmDeleteCategoryId !== id) {
      setConfirmDeleteCategoryId(id);
      setCategoryActionError(null);
      return;
    }
    setConfirmDeleteCategoryId(null);
    try {
      await deleteCategory(id);
      loadCategories();
      loadStats();
    } catch (err) {
      setCategoryActionError(err instanceof ApiError ? err.message : 'Failed to delete category.');
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Admin Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>System Control & Admin Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
              Master Admin Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Live job & category CMS backed by the .NET API — user, CBT and social tools are on the roadmap.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">API Status</span>
              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-4 text-xs font-bold">
          {[
            { id: 'overview', label: 'KPI Analytics', icon: BarChart3 },
            { id: 'jobs', label: `Jobs (${stats?.totalJobs ?? '…'})`, icon: Briefcase },
            { id: 'jobdrafts', label: 'Scraper Queue', icon: Radar },
            { id: 'categories', label: `Categories (${stats?.totalCategories ?? '…'})`, icon: Layers },
            { id: 'admitcards', label: 'Admit Cards', icon: Award },
            { id: 'results', label: 'Results', icon: Trophy },
            { id: 'schemes', label: 'Schemes', icon: Landmark },
            { id: 'news', label: 'News', icon: Newspaper },
            { id: 'study', label: 'Study Materials', icon: GraduationCap },
            { id: 'oldpapers', label: 'Old Papers', icon: FileCheck },
            { id: 'blog', label: 'Blog', icon: Rss },
            { id: 'alerts', label: 'Job Alerts', icon: BellRing },
            { id: 'users', label: 'User Accounts', icon: Users },
            { id: 'audit', label: 'Activity Audit', icon: ScrollText },
            { id: 'campaign', label: 'Campaign Links / QR', icon: QrCode },
            { id: 'mocks', label: 'CBT Test Studio', icon: FileCheck },
            { id: 'exams', label: 'Manage Exams', icon: GraduationCap },
            { id: 'social', label: 'Social Broadcast', icon: Send },
            { id: 'employer-jobs', label: 'Employer Job Moderation', icon: ShieldCheck },
            { id: 'employer-contacts', label: 'Employer Contacts', icon: ShieldAlert },
            { id: 'employer-plans', label: 'Employer Plans', icon: CreditCard },
            { id: 'aspirant-plans', label: 'Aspirant Plans', icon: CreditCard },
            { id: 'products', label: 'Store Products', icon: ShoppingBag },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'payments', label: 'Payments', icon: Receipt },
            { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`pb-3 px-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                  isActive ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {statsLoading || !stats ? (
              <div className="text-xs text-slate-400 font-semibold">Loading live stats…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Jobs', val: stats.totalJobs, change: `${stats.activeJobs} active`, color: 'text-indigo-600' },
                    { label: 'Draft Jobs', val: stats.draftJobs, change: 'Awaiting publish', color: 'text-amber-600' },
                    { label: 'Expired Jobs', val: stats.expiredJobs, change: 'Past last date', color: 'text-red-600' },
                    { label: 'Total Users', val: stats.totalUsers, change: `+${stats.newUsersThisMonth} this month`, color: 'text-emerald-600' },
                  ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{kpi.label}</span>
                      <div className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</div>
                      <span className="text-[11px] text-slate-400 font-semibold">{kpi.change}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
                    <h3 className="font-heading font-extrabold text-base text-slate-900">Top Categories by Job Count</h3>
                    <div className="space-y-2">
                      {stats.topCategories.map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                          <span className="font-semibold text-slate-700">{c.name}</span>
                          <span className="font-black text-indigo-600">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
                    <h3 className="font-heading font-extrabold text-base text-slate-900">Recently Created Jobs</h3>
                    <div className="space-y-2">
                      {stats.recentJobs.map((j) => (
                        <div key={j.id} className="text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                          <div className="font-bold text-slate-800 line-clamp-1">{j.title}</div>
                          <div className="text-slate-500">{j.companyOrDept} • {j.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* JOBS CMS */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-extrabold text-slate-900">Job Postings</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/mobile-post')}
                  className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" /> Post via Mobile/AI
                </button>
                <button
                  onClick={() => { resetJobForm(); setJobFormOpen(true); }}
                  className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> New Job
                </button>
              </div>
            </div>

            <BulkImportExportBar entityLabel="Jobs" exportPath="/api/jobs/admin/export" importPath="/api/jobs/admin/bulk-import" onImported={loadJobs} />

            {jobFormOpen && (
              <form onSubmit={handleJobSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingJobId ? 'Edit Job' : 'New Job'}</h3>
                  <button type="button" onClick={resetJobForm} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{formError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-slate-700 block mb-1">Title</label>
                    <input required value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Organization</label>
                    <input required value={jobForm.organizationName} onChange={(e) => setJobForm({ ...jobForm, organizationName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Category</label>
                    <select required value={jobForm.categoryId} onChange={(e) => setJobForm({ ...jobForm, categoryId: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                      <option value={0} disabled>Select category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Location</label>
                    <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Vacancies</label>
                    <input type="number" value={jobForm.totalPosts} onChange={(e) => setJobForm({ ...jobForm, totalPosts: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Salary</label>
                    <input value={jobForm.salary} onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Qualification</label>
                    <input value={jobForm.qualificationRequired} onChange={(e) => setJobForm({ ...jobForm, qualificationRequired: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Posted Date</label>
                    <input type="date" value={jobForm.postedDate} onChange={(e) => setJobForm({ ...jobForm, postedDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Last Date</label>
                    <input type="date" required value={jobForm.lastDate} onChange={(e) => setJobForm({ ...jobForm, lastDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Status</label>
                    <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium">
                      <option value={0}>Draft</option>
                      <option value={1}>Published</option>
                      <option value={2}>Closed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <OfficialDocumentUpload
                      value={jobForm.officialNotificationPdf ?? null}
                      fileName={jobForm.notificationFileName ?? null}
                      onChange={(url, name) => setJobForm({ ...jobForm, officialNotificationPdf: url ?? undefined, notificationFileName: name ?? undefined })}
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={jobForm.isFeatured} onChange={(e) => setJobForm({ ...jobForm, isFeatured: e.target.checked })} /> Featured</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={jobForm.isUrgent} onChange={(e) => setJobForm({ ...jobForm, isUrgent: e.target.checked })} /> Urgent</label>
                  </div>
                </div>
                <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
                  {editingJobId ? 'Save Changes' : 'Publish Job'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {jobsLoading ? (
                <div className="text-xs text-slate-400 font-semibold">Loading jobs…</div>
              ) : jobs.map((j) => (
                <div key={j.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{j.title}</div>
                    <div className="text-slate-500">{j.companyOrDept} • Vacancies: {j.vacancyCount} • {j.salary} • <span className="font-bold">{j.status}</span> • <span className="font-bold text-indigo-600">{(j.viewsCount ?? 0).toLocaleString()} views</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditJob(j as Job & { id: string })} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => handleToggleJobActive(j.id, j.status !== 'Active')} className="bg-indigo-50 text-indigo-800 font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                      {j.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteJob(j.id)} className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteJobId === j.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                    {confirmDeleteJobId === j.id && (
                      <button onClick={() => setConfirmDeleteJobId(null)} className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-xl cursor-pointer">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES CMS */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-extrabold text-slate-900">Categories</h2>
              <button
                onClick={() => { resetCategoryForm(); setCategoryFormOpen(true); }}
                className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> New Category
              </button>
            </div>

            {categoryFormOpen && (
              <form onSubmit={handleCategorySubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-extrabold text-slate-900">{editingCategoryId ? 'Edit Category' : 'New Category'}</h3>
                  <button type="button" onClick={resetCategoryForm} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">{formError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block mb-1">Name</label>
                    <input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Icon (lucide name)</label>
                    <input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-slate-700 block mb-1">Description</label>
                    <textarea value={categoryForm.description || ''} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" rows={2} />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">Display Order</label>
                    <input type="number" value={categoryForm.displayOrder} onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={categoryForm.showOnHomepage} onChange={(e) => setCategoryForm({ ...categoryForm, showOnHomepage: e.target.checked })} /> Show on Homepage</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} /> Active</label>
                  </div>
                </div>
                <button type="submit" className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md">
                  {editingCategoryId ? 'Save Changes' : 'Create Category'}
                </button>
              </form>
            )}

            {categoryActionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{categoryActionError}</div>
            )}

            <div className="space-y-3">
              {categoriesLoading ? (
                <div className="text-xs text-slate-400 font-semibold">Loading categories…</div>
              ) : categories.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{c.name} {!c.isActive && <span className="text-red-500">(inactive)</span>}</div>
                    <div className="text-slate-500">{c.jobCount} jobs • Slug: {c.slug} {c.showOnHomepage && '• Featured on homepage'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditCategory(c)} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteCategoryId === c.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                    {confirmDeleteCategoryId === c.id && (
                      <button onClick={() => setConfirmDeleteCategoryId(null)} className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-xl cursor-pointer">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIT CARDS CMS */}
        {activeTab === 'admitcards' && (
          <AdminAdmitCardsPanel categories={categories} onChanged={loadStats} />
        )}

        {/* RESULTS CMS */}
        {activeTab === 'results' && (
          <AdminResultsPanel categories={categories} onChanged={loadStats} />
        )}

        {/* SCHEMES CMS */}
        {activeTab === 'schemes' && (
          <AdminSchemesPanel />
        )}

        {/* EMPLOYER JOB MODERATION */}
        {activeTab === 'employer-jobs' && (
          <AdminEmployerJobsPanel />
        )}

        {/* EMPLOYER CONTACT AUDIT */}
        {activeTab === 'employer-contacts' && (
          <AdminEmployerContactsPanel />
        )}

        {/* EMPLOYER PLANS & TOP-UPS */}
        {activeTab === 'employer-plans' && (
          <AdminEmployerPlansPanel />
        )}

        {/* ASPIRANT SUBSCRIPTION PLANS */}
        {activeTab === 'aspirant-plans' && (
          <AdminAspirantPlansPanel />
        )}

        {/* STORE PRODUCTS CMS */}
        {activeTab === 'products' && (
          <AdminProductsPanel />
        )}

        {/* WALLET MANAGEMENT */}
        {activeTab === 'wallet' && (
          <AdminWalletPanel />
        )}

        {activeTab === 'payments' && (
          <AdminPaymentsPanel />
        )}

        {activeTab === 'disputes' && (
          <AdminDisputesPanel />
        )}

        {/* NEWS CMS */}
        {activeTab === 'news' && (
          <AdminNewsPanel categories={categories} />
        )}

        {/* OLD PAPERS CMS */}
        {activeTab === 'oldpapers' && (
          <AdminOldPapersPanel categories={categories} />
        )}

        {/* STUDY MATERIALS CMS */}
        {activeTab === 'study' && (
          <AdminStudyMaterialsPanel categories={categories} />
        )}

        {/* BLOG CMS */}
        {activeTab === 'blog' && (
          <AdminBlogPanel categories={categories} />
        )}

        {/* JOB ALERT SUBSCRIBERS */}
        {activeTab === 'alerts' && (
          <AdminJobAlertsPanel />
        )}

        {/* SCRAPER DRAFT QUEUE */}
        {activeTab === 'jobdrafts' && (
          <AdminJobDraftsPanel />
        )}

        {/* MOCK TESTS CMS */}
        {activeTab === 'mocks' && (
          <AdminMockTestsPanel onChanged={loadStats} />
        )}

        {/* EXAMS CMS */}
        {activeTab === 'exams' && (
          <AdminExamsPanel />
        )}

        {/* USER MANAGEMENT */}
        {activeTab === 'users' && (
          <AdminUsersPanel />
        )}

        {/* ACTIVITY AUDIT */}
        {activeTab === 'audit' && (
          <AdminAuditLogPanel />
        )}

        {/* CAMPAIGN LINKS / QR */}
        {activeTab === 'campaign' && (
          <AdminCampaignLinksPanel />
        )}

        {/* DEFERRED MODULES */}
        {activeTab === 'social' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
            <ComingSoonBadge />
            <h2 className="text-lg font-heading font-extrabold text-slate-900">Social Broadcast</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This module's CMS UI is scaffolded but not yet wired to a live database table — it lands in a later phase alongside notifications and marketplace modules.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
