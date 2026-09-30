import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, MapPin } from 'lucide-react';
import { UserProfile } from '../types';
import { uploadResume } from '../api/auth';
import { getMyApplications, ApiMyApplication } from '../api/jobApplications';
import { ApplicationStatusStepper } from './aspirant/ApplicationStatusStepper';

interface MyApplicationsSectionProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const STATUS_STYLE: Record<string, string> = {
  Selected: 'bg-emerald-100 text-emerald-800',
  Shortlisted: 'bg-indigo-100 text-indigo-800',
  Interview: 'bg-violet-100 text-violet-800',
  Rejected: 'bg-red-100 text-red-800',
  UnderReview: 'bg-blue-100 text-blue-800',
  Applied: 'bg-amber-100 text-amber-800',
};

const STATUS_LABEL: Record<string, string> = {
  UnderReview: 'Under Review',
};

export const MyApplicationsSection: React.FC<MyApplicationsSectionProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [applications, setApplications] = useState<ApiMyApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  const loadApplications = useCallback(() => {
    setApplicationsLoading(true);
    getMyApplications().then(setApplications).catch(() => setApplications([])).finally(() => setApplicationsLoading(false));
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  const resumeFileName = user.resumeUrl ? decodeURIComponent(user.resumeUrl.split('/').pop() || 'resume.pdf') : null;

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const { url } = await uploadResume(file);
      setUser({ ...user, resumeUrl: url });
      setUploadSuccess(true);
    } catch {
      setUploadError('Upload failed. Please try again with a PDF or DOCX file under 20MB.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aspirant Career Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              My Job Applications & Resume
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track applications to private-employer jobs posted on JobCharcha, and manage your resume.
            </p>
          </div>
          <button
            onClick={() => navigate('/private-jobs')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-2xl cursor-pointer flex items-center gap-2 shrink-0"
          >
            Browse Private Jobs <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Applications List (2 Cols) — real data from the employer job-application pipeline */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" /> Active Job Applications ({applications.length})
            </h2>

            {applicationsLoading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">
                Loading your applications…
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No applications yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Browse private-employer jobs posted on JobCharcha and apply directly — government jobs use "Apply
                  Online" on the official portal instead.
                </p>
                <button onClick={() => navigate('/private-jobs')} className="bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
                  Browse Private Jobs
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white p-5 rounded-3xl border border-slate-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <button onClick={() => navigate(`/private-jobs/${app.jobSlug}`)} className="font-heading font-extrabold text-base text-slate-900 hover:text-indigo-700 cursor-pointer text-left">
                          {app.jobTitle}
                        </button>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {app.companyName} • Applied on {new Date(app.createdDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[app.status] || 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[app.status] || app.status}
                        </span>
                        <button onClick={() => navigate(`/private-jobs/${app.jobSlug}`)} className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer">
                          View job
                        </button>
                      </div>
                    </div>

                    <div className="pt-1"><ApplicationStatusStepper status={app.status} /></div>

                    {app.interviewDate && (
                      <div className="text-xs font-semibold text-indigo-800 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
                        Interview scheduled: {new Date(app.interviewDate).toLocaleDateString()}
                        {app.interviewLocation && ` • ${app.interviewLocation}`}
                        {app.interviewMode && ` (${app.interviewMode})`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resume Upload Card (1 Col) — wired to the real upload endpoint */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5 h-fit">
            <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Master Resume
            </h2>

            {resumeFileName ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{resumeFileName}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Stored securely on JobCharcha's servers. Visible to employers once you unlock their view.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No resume uploaded yet.
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Upload Resume (PDF / DOCX)</label>
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-slate-50/50">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                )}
                <span className="text-xs font-bold text-slate-700 block">
                  {isUploading ? 'Uploading…' : 'Click to Browse PDF Resume'}
                </span>
                <span className="text-[10px] text-slate-400">Max size 20 MB • PDF / DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {uploadSuccess && (
                <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resume uploaded successfully.
                </p>
              )}
              {uploadError && (
                <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
