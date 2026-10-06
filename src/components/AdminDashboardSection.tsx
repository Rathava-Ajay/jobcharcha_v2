import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Users, Briefcase, FileCheck, Send, CheckCircle2, BarChart3,
  Layers, PlusCircle, Trash2, Pencil, X, Clock3, Award, Trophy, Smartphone,
  Landmark, Newspaper, GraduationCap, Rss, BellRing, ShieldAlert, CreditCard,
  ShoppingBag, Wallet, Receipt, AlertTriangle, ScrollText, QrCode, Sparkles,
  CircleCheck, CircleDashed, CircleX, UserPlus, ChevronRight, ArrowRight, Share2, Coins,
} from 'lucide-react';
import { DashboardLayout, DashNavGroup, StatTile } from './dashboard/DashboardLayout';
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
import { AdminAiMagicPanel } from './admin/AdminAiMagicPanel';
import { AdminAutoSharePanel } from './admin/AdminAutoSharePanel';
import { AdminAiUsagePanel } from './admin/AdminAiUsagePanel';
import { SkipSocialCheckbox, ShareAgainButton } from './admin/SocialShareControls';
import { getContentSummary, ApiContentCategorySummary } from '../api/contentDrafts';
import { searchJobDrafts, JOB_DRAFT_STATUS } from '../api/jobDrafts';
import { BulkImportExportBar } from './admin/BulkImportExportBar';
import { OfficialDocumentUpload } from './admin/OfficialDocumentUpload';
import { Select } from './ui/Select';

type AdminTab = 'overview' | 'jobs' | 'aimagic' | 'categories' | 'admitcards' | 'results' | 'schemes' | 'news' | 'study' | 'oldpapers' | 'blog' | 'alerts' | 'users' | 'mocks' | 'exams' | 'social' | 'autoshare' | 'aiusage' | 'employer-jobs' | 'employer-contacts' | 'employer-plans' | 'aspirant-plans' | 'products' | 'wallet' | 'payments' | 'disputes' | 'audit' | 'campaign';

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

  // AI Magic drafts waiting for review (all content categories + the jobs scraper queue), for the overview banner.
  const [aiPending, setAiPending] = useState<{ total: number; parts: string[] } | null>(null);
  const loadAiPending = useCallback(() => {
    const labels: Record<string, string> = { job: 'jobs', result: 'results', admitcard: 'admit cards', oldpaper: 'old papers', news: 'news', scheme: 'schemes', study: 'study notes' };
    Promise.all([
      getContentSummary().catch((): ApiContentCategorySummary[] => []),
      searchJobDrafts(JOB_DRAFT_STATUS.Pending, 1, 1).then((r) => r.totalCount).catch(() => 0),
    ]).then(([summary, jobs]) => {
      const parts = [
        ...(jobs > 0 ? [`${jobs} job${jobs === 1 ? '' : 's'}`] : []),
        ...summary.filter((c) => c.pendingCount > 0).map((c) => `${c.pendingCount} ${labels[c.category] ?? c.category}`),
      ];
      const total = jobs + summary.reduce((n, c) => n + c.pendingCount, 0);
      setAiPending({ total, parts });
    });
  }, []);

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

  useEffect(() => { loadStats(); loadAiPending(); }, [loadStats, loadAiPending]);
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

  const navGroups: DashNavGroup[] = [
    { items: [{ id: 'overview', label: 'Overview', icon: BarChart3 }] },
    { title: 'Content', items: [
      { id: 'jobs', label: 'Jobs', icon: Briefcase, badge: stats?.totalJobs?.toLocaleString('en-IN') ?? null },
      { id: 'aimagic', label: 'AI Magic', icon: Sparkles },
      { id: 'categories', label: 'Categories', icon: Layers, badge: stats?.totalCategories ?? null },
      { id: 'admitcards', label: 'Admit cards', icon: Award },
      { id: 'results', label: 'Results', icon: Trophy },
      { id: 'schemes', label: 'Schemes', icon: Landmark },
      { id: 'news', label: 'News', icon: Newspaper },
      { id: 'blog', label: 'Blog', icon: Rss },
      { id: 'study', label: 'Study materials', icon: GraduationCap },
      { id: 'oldpapers', label: 'Old papers', icon: FileCheck },
    ] },
    { title: 'Tests', items: [
      { id: 'mocks', label: 'CBT test studio', icon: FileCheck },
      { id: 'exams', label: 'Manage exams', icon: GraduationCap },
    ] },
    { title: 'Audience', items: [
      { id: 'users', label: 'User accounts', icon: Users, badge: stats?.totalUsers?.toLocaleString('en-IN') ?? null },
      { id: 'alerts', label: 'Job alerts', icon: BellRing },
      { id: 'autoshare', label: 'Auto-share', icon: Share2 },
      { id: 'social', label: 'Social broadcast', icon: Send },
      { id: 'campaign', label: 'Campaign links / QR', icon: QrCode },
    ] },
    { title: 'Employers', items: [
      { id: 'employer-jobs', label: 'Job moderation', icon: ShieldCheck },
      { id: 'employer-contacts', label: 'Employer contacts', icon: ShieldAlert },
      { id: 'employer-plans', label: 'Employer plans', icon: CreditCard },
    ] },
    { title: 'Money', items: [
      { id: 'aspirant-plans', label: 'Aspirant plans', icon: CreditCard },
      { id: 'products', label: 'Store products', icon: ShoppingBag },
      { id: 'wallet', label: 'Wallet', icon: Wallet },
      { id: 'payments', label: 'Payments', icon: Receipt },
      { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    ] },
    { title: 'System', items: [
      { id: 'aiusage', label: 'AI usage', icon: Coins },
      { id: 'audit', label: 'Activity audit', icon: ScrollText },
    ] },
  ];

  const health = stats ? [
    { key: 'Active', value: stats.activeJobs, bar: 'bg-emerald-500', icon: CircleCheck, ink: 'text-emerald-700' },
    { key: 'Draft', value: stats.draftJobs, bar: 'bg-amber-400', icon: CircleDashed, ink: 'text-amber-700' },
    { key: 'Expired', value: stats.expiredJobs, bar: 'bg-rose-500', icon: CircleX, ink: 'text-rose-700' },
  ] : [];
  const healthTotal = health.reduce((n, h) => n + h.value, 0);
  const topMax = Math.max(1, ...(stats?.topCategories ?? []).map((c) => c.count));

  return (
    <DashboardLayout
      groups={navGroups}
      active={activeTab}
      onSelect={(id) => setActiveTab(id as AdminTab)}
      title={activeTab === 'overview' ? 'Admin control center' : undefined}
      subtitle={stats ? 'Live data from the JobCharcha API' : 'Connecting to the JobCharcha API…'}
      actions={
        <button onClick={() => navigate('/admin/mobile-post')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[13px] px-3 sm:px-4 py-2.5 cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)]">
          <Smartphone className="w-4 h-4" /><span className="hidden sm:inline">Quick post</span>
        </button>
      }
    >
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 max-w-[1400px]">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {statsLoading || !stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading stats">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[86px] rounded-2xl bg-white border border-slate-200 animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  <StatTile icon={Briefcase} tone="bg-blue-50 text-blue-700" value={stats.totalJobs.toLocaleString('en-IN')} label="Total jobs" hint={`${stats.activeJobs} active`} onClick={() => setActiveTab('jobs')} />
                  <StatTile icon={CircleDashed} tone="bg-amber-50 text-amber-700" value={stats.draftJobs.toLocaleString('en-IN')} label="Draft jobs" hint="Awaiting publish" onClick={() => setActiveTab('jobs')} />
                  <StatTile icon={CircleX} tone="bg-rose-50 text-rose-600" value={stats.expiredJobs.toLocaleString('en-IN')} label="Expired jobs" hint="Past last date" />
                  <StatTile icon={UserPlus} tone="bg-emerald-50 text-emerald-700" value={stats.totalUsers.toLocaleString('en-IN')} label="Total users" hint={`+${stats.newUsersThisMonth} this month`} onClick={() => setActiveTab('users')} />
                </div>

                {aiPending && aiPending.total > 0 && (
                  <button onClick={() => setActiveTab('aimagic')}
                    className="w-full text-left flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 px-4 py-3.5 cursor-pointer transition">
                    <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-items-center shrink-0"><Sparkles className="w-5 h-5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold text-[14.5px] text-slate-900">{aiPending.total} AI draft{aiPending.total === 1 ? '' : 's'} waiting for your review</span>
                      <span className="block text-[12.5px] text-slate-600 truncate">{aiPending.parts.join(' · ')}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
                  </button>
                )}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
                  <div className="space-y-5 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-extrabold text-[16px] text-slate-900">Job health</h3>
                        <span className="text-[12.5px] text-slate-500">{healthTotal.toLocaleString('en-IN')} jobs</span>
                      </div>
                      <div className="mt-3 flex h-3.5 gap-0.5" role="img" aria-label={health.map((h) => `${h.key} ${h.value}`).join(', ')}>
                        {health.filter((h) => h.value > 0).map((h, i, arr) => (
                          <span key={h.key} title={`${h.key}: ${h.value} (${Math.round((h.value / Math.max(1, healthTotal)) * 100)}%)`}
                            className={`${h.bar} ${i === 0 ? 'rounded-l-full' : ''} ${i === arr.length - 1 ? 'rounded-r-full' : ''}`}
                            style={{ width: `${(h.value / Math.max(1, healthTotal)) * 100}%`, minWidth: 6 }} />
                        ))}
                        {healthTotal === 0 && <span className="flex-1 rounded-full bg-slate-100" />}
                      </div>
                      <ul className="mt-3 grid grid-cols-3 gap-2">
                        {health.map((h) => (
                          <li key={h.key} className="rounded-xl bg-slate-50 px-3 py-2">
                            <span className={`flex items-center gap-1.5 text-[12px] font-bold ${h.ink}`}><h.icon className="w-3.5 h-3.5" />{h.key}</span>
                            <span className="block text-[18px] font-black text-slate-900 tabular-nums">{h.value.toLocaleString('en-IN')}</span>
                            <span className="block text-[11.5px] text-slate-500">{Math.round((h.value / Math.max(1, healthTotal)) * 100)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-extrabold text-[16px] text-slate-900">Top categories by jobs</h3>
                        <button onClick={() => setActiveTab('categories')} className="text-[12.5px] font-bold text-blue-700 inline-flex items-center cursor-pointer">Manage <ChevronRight className="w-4 h-4" /></button>
                      </div>
                      {stats.topCategories.length === 0 ? (
                        <p className="mt-3 text-[13px] text-slate-500">No categories with jobs yet.</p>
                      ) : (
                        <ul className="mt-3 space-y-2.5">
                          {stats.topCategories.map((c) => (
                            <li key={c.name} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-3" title={`${c.name}: ${c.count} jobs`}>
                              <span className="text-[13px] font-semibold text-slate-700 truncate">{c.name}</span>
                              <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${(c.count / topMax) * 100}%` }} /></span>
                              <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">{c.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                        <h3 className="font-extrabold text-[16px] text-slate-900">Recently created jobs</h3>
                        <button onClick={() => setActiveTab('jobs')} className="text-[12.5px] font-bold text-blue-700 inline-flex items-center cursor-pointer">All jobs <ChevronRight className="w-4 h-4" /></button>
                      </div>
                      {stats.recentJobs.length === 0 ? (
                        <p className="px-5 py-6 text-[13px] text-slate-500">No jobs created yet.</p>
                      ) : (
                        <ul>
                          {stats.recentJobs.map((j) => (
                            <li key={j.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 border-t border-slate-100 first:border-t-0">
                              <span className="flex-1 min-w-0">
                                <span className="block text-[13.5px] font-bold text-slate-900 line-clamp-1 break-words">{j.title}</span>
                                <span className="block text-[12px] text-slate-500 truncate">{j.companyOrDept}</span>
                              </span>
                              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${String(j.status) === 'Active' || String(j.status) === 'Published' ? 'bg-emerald-50 text-emerald-700' : String(j.status) === 'Draft' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{String(j.status)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                      <h3 className="font-extrabold text-[16px] text-slate-900 mb-3">Quick actions</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {([
                          ['jobs', 'Add a job', Briefcase, 'from-blue-600 to-indigo-600'],
                          ['aimagic', 'AI Magic', Sparkles, 'from-indigo-600 to-violet-600'],
                          ['results', 'Publish result', Trophy, 'from-emerald-600 to-teal-600'],
                          ['admitcards', 'Admit card', Award, 'from-violet-600 to-purple-600'],
                          ['mocks', 'Mock test', FileCheck, 'from-pink-600 to-rose-600'],
                          ['employer-jobs', 'Moderate jobs', ShieldCheck, 'from-amber-500 to-orange-600'],
                        ] as const).map(([id, label, Icon, tone]) => (
                          <button key={id} onClick={() => setActiveTab(id as AdminTab)}
                            className={`rounded-xl p-3 text-left text-white bg-gradient-to-br ${tone} hover:-translate-y-0.5 transition-transform cursor-pointer`}>
                            <Icon className="w-[18px] h-[18px]" />
                            <span className="mt-2 flex items-center justify-between gap-1 text-[12.5px] font-extrabold">{label}<ArrowRight className="w-3.5 h-3.5 shrink-0" /></span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* JOBS CMS */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Job Postings</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/mobile-post')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Smartphone className="w-4 h-4" /> Post via Mobile/AI
                </button>
                <button
                  onClick={() => { resetJobForm(); setJobFormOpen(true); }}
                  className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> New Job
                </button>
              </div>
            </div>

            <BulkImportExportBar entityLabel="Jobs" exportPath="/api/jobs/admin/export" importPath="/api/jobs/admin/bulk-import" onImported={loadJobs} />

            {jobFormOpen && (
              <form onSubmit={handleJobSubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[16px] font-extrabold text-slate-900">{editingJobId ? 'Edit Job' : 'New Job'}</h3>
                  <button type="button" onClick={resetJobForm} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px]">{formError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Title</label>
                    <input required value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Organization</label>
                    <input required value={jobForm.organizationName} onChange={(e) => setJobForm({ ...jobForm, organizationName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Category</label>
                    <Select required value={jobForm.categoryId} onChange={(e) => setJobForm({ ...jobForm, categoryId: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                      <option value={0} disabled>Select category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Location</label>
                    <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Vacancies</label>
                    <input type="number" value={jobForm.totalPosts} onChange={(e) => setJobForm({ ...jobForm, totalPosts: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Salary</label>
                    <input value={jobForm.salary} onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Qualification</label>
                    <input value={jobForm.qualificationRequired} onChange={(e) => setJobForm({ ...jobForm, qualificationRequired: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Posted Date</label>
                    <input type="date" value={jobForm.postedDate} onChange={(e) => setJobForm({ ...jobForm, postedDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Last Date</label>
                    <input type="date" required value={jobForm.lastDate} onChange={(e) => setJobForm({ ...jobForm, lastDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Status</label>
                    <Select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10">
                      <option value={0}>Draft</option>
                      <option value={1}>Published</option>
                      <option value={2}>Closed</option>
                    </Select>
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
                <SkipSocialCheckbox checked={!!jobForm.skipSocial} onChange={(v) => setJobForm({ ...jobForm, skipSocial: v })} />
                <button type="submit" className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[14px] px-6 py-3 rounded-xl cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)] transition-colors">
                  {editingJobId ? 'Save Changes' : 'Publish Job'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {jobsLoading ? (
                <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading jobs…</div>
              ) : jobs.map((j) => (
                <div key={j.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
                  <div>
                    <div className="font-bold text-slate-900 text-[15px] break-words">{j.title}</div>
                    <div className="text-slate-500">{j.companyOrDept} • Vacancies: {j.vacancyCount} • {j.salary} • <span className="font-bold">{j.status}</span> • <span className="font-bold text-indigo-600">{(j.viewsCount ?? 0).toLocaleString()} views</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditJob(j as Job & { id: string })} className="bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <ShareAgainButton category="job" entityId={Number((j as { id: string }).id)} />
                    <button onClick={() => handleToggleJobActive(j.id, j.status !== 'Active')} className="bg-indigo-50 text-indigo-800 font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                      {j.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteJob(j.id)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteJobId === j.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                    {confirmDeleteJobId === j.id && (
                      <button onClick={() => setConfirmDeleteJobId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES CMS */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Categories</h2>
              <button
                onClick={() => { resetCategoryForm(); setCategoryFormOpen(true); }}
                className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-[0_8px_18px_-10px_rgba(37,99,235,0.8)] transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> New Category
              </button>
            </div>

            {categoryFormOpen && (
              <form onSubmit={handleCategorySubmit} className="bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 ring-4 ring-blue-500/5 rounded-2xl p-4 sm:p-6 space-y-4 text-[13px] font-bold">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[16px] font-extrabold text-slate-900">{editingCategoryId ? 'Edit Category' : 'New Category'}</h3>
                  <button type="button" onClick={resetCategoryForm} className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3.5 py-2.5 text-[13px]">{formError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Name</label>
                    <input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Icon (lucide name)</label>
                    <input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Description</label>
                    <textarea value={categoryForm.description || ''} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1.5 text-[12.5px]">Display Order</label>
                    <input type="number" value={categoryForm.displayOrder} onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={categoryForm.showOnHomepage} onChange={(e) => setCategoryForm({ ...categoryForm, showOnHomepage: e.target.checked })} /> Show on Homepage</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} /> Active</label>
                  </div>
                </div>
                <button type="submit" className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[14px] px-6 py-3 rounded-xl cursor-pointer shadow-[0_10px_20px_-12px_rgba(37,99,235,0.8)] transition-colors">
                  {editingCategoryId ? 'Save Changes' : 'Create Category'}
                </button>
              </form>
            )}

            {categoryActionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{categoryActionError}</div>
            )}

            <div className="space-y-3">
              {categoriesLoading ? (
                <div className="text-[13px] text-slate-500 font-semibold rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">Loading categories…</div>
              ) : categories.map((c) => (
                <div key={c.id} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_12px_26px_-22px_rgba(37,99,235,0.7)] transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-[13px]">
                  <div>
                    <div className="font-bold text-slate-900 text-[15px] break-words">{c.name} {!c.isActive && <span className="text-red-500">(inactive)</span>}</div>
                    <div className="text-slate-500">{c.jobCount} jobs • Slug: {c.slug} {c.showOnHomepage && '• Featured on homepage'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditCategory(c)} className="bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteCategoryId === c.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                    {confirmDeleteCategoryId === c.id && (
                      <button onClick={() => setConfirmDeleteCategoryId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">Cancel</button>
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

        {/* AI MAGIC: scraper queue (jobs) + AI-collected results/admit cards/papers/news/schemes/notes */}
        {activeTab === 'aimagic' && (
          <AdminAiMagicPanel />
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

        {/* AI USAGE (Claude + OpenAI token consumption) */}
        {activeTab === 'aiusage' && (
          <AdminAiUsagePanel />
        )}

        {/* AUTO-SHARE (Telegram / Facebook / Instagram) */}
        {activeTab === 'autoshare' && (
          <AdminAutoSharePanel />
        )}

        {/* DEFERRED MODULES */}
        {activeTab === 'social' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
            <ComingSoonBadge />
            <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Social Broadcast</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This module's CMS UI is scaffolded but not yet wired to a live database table — it lands in a later phase alongside notifications and marketplace modules.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
