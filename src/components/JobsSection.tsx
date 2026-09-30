import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Calendar,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Download,
  Plus,
  Building2,
  Users,
  Zap,
  Filter,
  Share2,
  FileSpreadsheet,
  Landmark,
  LayoutGrid,
  ArrowRight,
  X
} from 'lucide-react';
import { Job } from '../types';
import { JobAlertSubscription } from './JobAlertSubscription';
import { useAuth } from '../context/AuthContext';

interface JobsSectionProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onOpenNewJobModal: () => void;
  footerSlot?: React.ReactNode;
  hideAlertBox?: boolean;
  /** Enables the tactile 3D card/button styling — reserved for the landing page. */
  use3d?: boolean;
}

export const JobsSection: React.FC<JobsSectionProps> = ({
  jobs,
  onSelectJob,
  onOpenNewJobModal,
  footerSlot,
  hideAlertBox = false,
  use3d = false,
}) => {
  // Flat-vs-3D class swap: only the landing page passes use3d, every other caller
  // (AllJobsPage, etc.) gets plain flat styling.
  const c3d = (threeD: string, flat: string) => (use3d ? threeD : flat);
  const navigate = useNavigate();

  // Role-gated action buttons:
  //  - Export CSV  → admin / superadmin only
  //  - Saved       → aspirant (or logged-out visitor) only — hidden for employers/admins
  //  - Post Job    → employer / admin / superadmin only
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isEmployer = user?.role === 'employer';
  const isAspirant = !user || user.role === 'aspirant' || user.role === 'user';
  const canExportCsv = isAdmin;
  const canSeeSaved = isAspirant;
  const canPostJob = isAdmin || isEmployer;

  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'public' | 'private'>('all');
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const toggleSaveJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedJobIds.includes(id)) {
      setSavedJobIds(savedJobIds.filter((jId) => jId !== id));
    } else {
      setSavedJobIds([...savedJobIds, id]);
    }
  };

  // Search/category/qualification/location are already applied server-side by the caller
  // (see LandingPage / AllJobsPage) — only the two local-only toggles below refine further.
  const filteredJobs = jobs.filter((job) => {
    if (jobTypeFilter !== 'all' && job.type !== jobTypeFilter) return false;
    if (showSavedOnly && !savedJobIds.includes(job.id)) return false;
    return true;
  });

  // Counts are taken from the full incoming list (before the type/saved refinements)
  // so each browse-card always shows its true total.
  const typeCounts = {
    all: jobs.length,
    public: jobs.filter((j) => j.type === 'public').length,
    private: jobs.filter((j) => j.type === 'private').length,
  };

  // Each card routes to its own dedicated page (a real navigation, not an in-page filter/scroll).
  // Government/aggregated feed jobs live at /jobs; direct employer posts at /private-jobs.
  const typeCards = [
    {
      value: 'all' as const,
      to: '/jobs',
      title: 'All Jobs',
      description: 'Every verified government & private vacancy in one combined list.',
      icon: LayoutGrid,
      count: typeCounts.all,
      cta: 'Browse all',
      iconClass: 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-200',
      activeBorder: 'border-slate-900',
      activeRing: 'ring-slate-900/10',
      countClass: 'text-slate-900',
    },
    {
      value: 'public' as const,
      to: '/jobs',
      title: 'Government Jobs',
      description: 'Sarkari naukri from official govt feeds — GPSC, GSSSB, Talati, Police & more.',
      icon: Landmark,
      count: typeCounts.public,
      cta: 'View govt jobs',
      iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-100',
      activeBorder: 'border-emerald-500',
      activeRing: 'ring-emerald-500/15',
      countClass: 'text-emerald-700',
    },
    {
      value: 'private' as const,
      to: '/private-jobs',
      title: 'Private / Corporate',
      description: 'Direct employer posts from companies hiring across Gujarat & remote roles.',
      icon: Building2,
      count: typeCounts.private,
      cta: 'View private jobs',
      iconClass: 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-100',
      activeBorder: 'border-indigo-500',
      activeRing: 'ring-indigo-500/15',
      countClass: 'text-indigo-700',
    },
  ];

  // Descriptor for the currently-selected type — drives the results-panel header below.
  const activeTypeCard = typeCards.find((c) => c.value === jobTypeFilter) ?? typeCards[0];
  const isRefined = jobTypeFilter !== 'all' || showSavedOnly;

  const handleExportExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Title,Department,Vacancy,Salary,Location,LastDate"].join(",") + "\n"
      + filteredJobs.map(e => `"${e.title}","${e.companyOrDept}",${e.vacancyCount},"${e.salary}","${e.location}","${e.lastDate}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GovJobs_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="py-12 bg-gradient-to-b from-emerald-50 via-emerald-50/40 to-slate-50 border-t border-slate-200/80 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 -right-24 w-72 h-72 bg-teal-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Jobs Management & Automation Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Latest Government & Private Job Vacancies
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {jobTypeFilter === 'public'
                ? `Showing ${filteredJobs.length} government listings from official govt feed sources.`
                : jobTypeFilter === 'private'
                ? `Showing ${filteredJobs.length} private / corporate listings from direct employer posts.`
                : `Showing ${filteredJobs.length} verified listings from official government feed sources & direct employer posts.`}
            </p>
          </div>

          {/* Action CTAs — each gated by role (see canExportCsv / canSeeSaved / canPostJob above) */}
          <div className="flex flex-wrap items-center gap-3">
            {canExportCsv && (
              <button
                onClick={handleExportExcel}
                className={`${c3d('btn-3d btn-3d-white', 'shadow-sm hover:shadow-md transition-shadow active:scale-95')} inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer`}
                title="Export visible jobs to CSV/Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}

            {canSeeSaved && (
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`${c3d('btn-3d', 'shadow-sm hover:shadow-md transition-shadow active:scale-95')} inline-flex items-center gap-1.5 border px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  showSavedOnly
                    ? `${c3d('btn-3d-amber', '')} bg-amber-50 text-amber-900 border-amber-300`
                    : `${c3d('btn-3d-white', '')} bg-white text-slate-700 border-slate-200 hover:bg-slate-100`
                }`}
              >
                <Bookmark className={`w-4 h-4 ${showSavedOnly ? 'text-amber-600 fill-amber-600' : 'text-slate-500'}`} />
                <span>Saved ({savedJobIds.length})</span>
              </button>
            )}

            {canPostJob && (
              <button
                onClick={onOpenNewJobModal}
                className={`${c3d('btn-3d btn-3d-dark', 'shadow-sm hover:shadow-md transition-shadow active:scale-95')} inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer`}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Post Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Browse-by-type cards — pick Government or Private to filter the list below */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            <Filter className="w-3.5 h-3.5" />
            <span>Browse by job type</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {typeCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.value}
                  onClick={() => navigate(card.to)}
                  className={`${c3d('card-3d', 'shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]')} text-left bg-white rounded-2xl p-6 border-2 border-slate-200/80 hover:border-slate-300 cursor-pointer group flex flex-col justify-between`}
                >
                  <div>
                    <div className={`${c3d('icon-badge-3d', '')} w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 transition-colors ${card.iconClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-bold text-slate-900 text-base mb-1">{card.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-sm font-extrabold ${card.countClass}`}>
                      {card.count} {card.count === 1 ? 'listing' : 'listings'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 flex items-center gap-1">
                      {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results panel — a distinct container so the filtered list reads as its own
            section, separate from the browse-by-type cards above. */}
        <div className={`${c3d('card-3d-static', 'shadow-sm')} rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6`}>

          {/* Panel header: which slice is being shown + a reset when refined */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${activeTypeCard.iconClass}`}>
                <activeTypeCard.icon className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {activeTypeCard.title}
                  {showSavedOnly && <span className="text-amber-600"> · Saved</span>}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'result' : 'results'}
                </p>
              </div>
            </div>
            {isRefined && (
              <button
                onClick={() => { setJobTypeFilter('all'); setShowSavedOnly(false); }}
                className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Show all jobs
              </button>
            )}
          </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No jobs match your current filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try resetting your category or location filters, or search for different keywords.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => {
              const isSaved = savedJobIds.includes(job.id);
              return (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className={`${c3d(`card-3d ${job.isBoosted ? 'card-3d-amber' : ''}`, 'bg-white shadow-sm hover:shadow-md transition-shadow')} rounded-2xl p-5 border cursor-pointer flex flex-col justify-between relative group ${
                    job.isBoosted ? 'border-amber-300/70' : 'border-slate-200'
                  }`}
                >
                  {/* Top Badge Row */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`${c3d('icon-badge-3d', '')} text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        job.type === 'public'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      }`}>
                        {job.type === 'public' ? 'Government' : 'Private'} • {job.category}
                      </span>

                      <div className="flex items-center gap-1">
                        {job.isBoosted && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-600 fill-amber-600" /> Featured
                          </span>
                        )}
                        <button
                          onClick={(e) => toggleSaveJob(job.id, e)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100"
                          title={isSaved ? 'Unsave job' : 'Save job'}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'text-amber-500 fill-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Job Title & Department */}
                    <h3 className="font-heading font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{job.companyOrDept}</span>
                    </p>

                    {/* Job Meta Info Grid */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Vacancies</span>
                        <span className="font-bold text-slate-800">{job.vacancyCount.toLocaleString()} Posts</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Salary Scale</span>
                        <span className="font-semibold text-emerald-700 truncate block">{job.salary}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                        <span className="font-medium text-slate-700 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {job.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Apply Deadline</span>
                        <span className="font-semibold text-amber-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-600 shrink-0" /> {job.lastDate}
                        </span>
                      </div>
                    </div>

                    {/* Qualification & Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded font-medium">
                        {job.qualification}
                      </span>
                      {job.tags.slice(0, 2).map((t) => (
                        <span key={t} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-600 group-hover:underline flex items-center gap-1">
                      View Details & Syllabus <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-slate-400 text-[11px] font-normal">Posted {job.postedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

          {footerSlot}
        </div>

        {/* Job Alert Subscription Component */}
        {!hideAlertBox && (
          <div className="mt-12">
            <JobAlertSubscription />
          </div>
        )}

      </div>
    </section>
  );
};
