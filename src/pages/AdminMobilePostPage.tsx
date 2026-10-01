import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Check, Sparkles, AlertTriangle, Loader2, Instagram, ClipboardPaste, Send, ChevronRight, FileUp, FileCheck2, Radar,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { CopyButton } from '../components/CopyButton';
import { useAuth } from '../context/AuthContext';
import { getCategories, ApiCategory } from '../api/categories';
import { aiImportJob, AiImportJobPayload } from '../api/jobs';
import { approveJobDraft } from '../api/jobDrafts';
import { uploadAdminDocument } from '../api/uploads';
import { ApiError } from '../api/client';
import { buildJobExtractionPrompt, buildInstagramCaptionPrompt } from '../utils/aiPrompts';
import { validateAiJobImport, ParsedAiJob } from '../utils/aiJobImportValidation';
import { DocumentPreview } from '../components/DocumentPreview';
import { Select } from '../components/ui/Select';

type Step = 'compose' | 'review' | 'upload' | 'success';

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'compose', label: 'Prompt & Paste' },
  { key: 'review', label: 'Review & Edit' },
  { key: 'upload', label: 'Upload & Post' },
  { key: 'success', label: 'Success' },
];

function bestMatchCategory(categoryName: string, categories: ApiCategory[]): number | null {
  if (!categoryName || categories.length === 0) return null;
  const needle = categoryName.trim().toLowerCase();
  const exact = categories.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = categories.find((c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase()));
  return partial ? partial.id : null;
}

export default function AdminMobilePostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const draftState = location.state as { draftId?: number; notificationText?: string } | null;
  const draftId = draftState?.draftId ?? null;

  const [step, setStep] = useState<Step>('compose');
  const [notificationText, setNotificationText] = useState(draftState?.notificationText || '');
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedAiJob | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedSlug, setPostedSlug] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [notificationFileName, setNotificationFileName] = useState<string | null>(null);
  const [notificationFileUrl, setNotificationFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setUploadError(null);
    try {
      const { url } = await uploadAdminDocument(file);
      setNotificationFileUrl(url);
      setNotificationFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Could not upload this file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const prompt = useMemo(() => buildJobExtractionPrompt(notificationText), [notificationText]);

  const handleParse = () => {
    const result = validateAiJobImport(pasteText);
    setErrors(result.errors);
    setWarnings(result.warnings);
    if (result.data) {
      setParsed(result.data);
      getCategories()
        .then((cats) => {
          setCategories(cats);
          setSelectedCategoryId(bestMatchCategory(result.data!.categoryName, cats));
        })
        .catch(() => setCategories([]));
      setStep('review');
    }
  };

  const handlePost = async () => {
    if (!parsed || !selectedCategoryId) return;
    setPosting(true);
    setPostError(null);
    try {
      const payload: AiImportJobPayload = {
        title: parsed.title,
        slug: parsed.slug,
        department: parsed.department,
        categoryId: selectedCategoryId,
        focusKeyword: parsed.focusKeyword,
        secondaryKeywords: parsed.secondaryKeywords,
        lsiKeywords: parsed.lsiKeywords,
        internalLinkAnchors: parsed.internalLinkAnchors,
        totalPosts: parsed.totalPosts,
        salary: parsed.salary,
        ageLimit: parsed.ageLimit,
        qualification: parsed.qualification,
        location: parsed.location,
        lastDate: parsed.lastDate,
        applyLink: parsed.applyLink,
        officialNotificationPdf: notificationFileUrl,
        notificationFileName: notificationFileName,
        advertisementNumber: parsed.advertisementNumber,
        officialWebsite: parsed.officialWebsite,
        syllabusLink: parsed.syllabusLink,
        state: parsed.state,
        district: parsed.district,
        minAge: parsed.minAge,
        maxAge: parsed.maxAge,
        experienceRequired: parsed.experienceRequired,
        minSalary: parsed.minSalary,
        maxSalary: parsed.maxSalary,
        salaryType: parsed.salaryType,
        applicationFeeAmount: parsed.applicationFeeAmount,
        applicationFeeDetails: parsed.applicationFeeDetails,
        shortDescription: parsed.shortDescription,
        overview: parsed.overview,
        keyHighlights: parsed.keyHighlights,
        eligibilityDetails: parsed.eligibilityDetails,
        howToApply: parsed.howToApply,
        importantNotes: parsed.importantNotes,
        documentsRequired: parsed.documentsRequired,
        faqSchema: parsed.faqSchema,
        vacancyBreakdown: parsed.vacancyBreakdown,
        categoryWiseVacancy: parsed.categoryWiseVacancy,
        applicationFee: parsed.applicationFee,
        selectionProcess: parsed.selectionProcess,
        examPattern: parsed.examPattern,
        salaryBreakdown: parsed.salaryBreakdown,
        importantDates: parsed.importantDates,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        metaKeywords: parsed.metaKeywords,
        ogTitle: parsed.ogTitle,
        ogDescription: parsed.ogDescription,
        autoPublish: parsed.autoPublish,
      };
      const created = draftId ? await approveJobDraft(draftId, payload) : await aiImportJob(payload);
      setPostedSlug(created.slug);
      setStep('success');
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : 'Could not post this job. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const captionPrompt = useMemo(() => {
    if (!parsed) return '';
    return buildInstagramCaptionPrompt(JSON.stringify({
      title: parsed.title, department: parsed.department, totalPosts: parsed.totalPosts,
      lastDate: parsed.lastDate, focusKeyword: parsed.focusKeyword, location: parsed.location,
    }, null, 2));
  }, [parsed]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="bg-slate-900 text-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/dashboard/admin')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI-Assisted Mobile Posting
          </div>
          {draftId && (
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-2 ml-2">
              <Radar className="w-3.5 h-3.5" /> Reviewing scraper draft #{draftId}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">Post a Job via AI</h1>

          <div className="flex items-center gap-1 mt-4 text-[10px] font-bold overflow-x-auto">
            {STEP_LABELS.map((s, idx) => (
              <React.Fragment key={s.key}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <span className={`px-2 py-1 rounded-md whitespace-nowrap ${idx === stepIndex ? 'bg-emerald-500 text-slate-950' : idx < stepIndex ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {idx + 1}. {s.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {step === 'compose' && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Left window</span>
                <h2 className="font-heading font-bold text-slate-900 text-sm mb-1">SEO Extraction Prompt</h2>
                <p className="text-xs text-slate-600">
                  Paste the raw job notification below, then copy the prompt underneath it into ChatGPT, Claude, or any other AI chat. It already bakes in JobCharcha's SEO requirements and the exact JSON fields needed to post — you don't need to add anything else.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Raw job notification text</label>
                <textarea
                  value={notificationText}
                  onChange={(e) => setNotificationText(e.target.value)}
                  rows={5}
                  placeholder="Paste the official notification text here (from a PDF, website, or press release)…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Full prompt (copy this into your AI chat)</label>
                <div className="bg-slate-950 text-slate-300 rounded-xl p-3 text-[10px] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-mono">
                  {prompt}
                </div>
              </div>
              <CopyButton text={prompt} label="Copy Prompt" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Right window</span>
                <h2 className="font-heading font-bold text-slate-900 text-sm mb-1">Paste the AI's JSON Reply</h2>
                <p className="text-xs text-slate-600">
                  Once ChatGPT/Claude replies, copy its JSON output and paste it here.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5" /> AI JSON response
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={18}
                  placeholder='{"title": "...", "slug": "...", ...}'
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Fix these before continuing:</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={handleParse}
                disabled={pasteText.trim().length < 10}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer transition-colors"
              >
                Parse & Continue to Review
              </button>
            </div>
          </div>
        )}

        {step === 'review' && parsed && (
          <div className="max-w-lg mx-auto space-y-4">
            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Warnings (won't block posting):</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Title</span>
                <h2 className="font-heading font-bold text-slate-900 text-base">{parsed.title}</h2>
                <p className="text-xs text-slate-500">{parsed.department}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Category (confirm or change)</label>
                <Select
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Select a category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {!selectedCategoryId && (
                  <p className="text-[10px] text-amber-700 mt-1">AI suggested "{parsed.categoryName}" — no confident match found, please pick one.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Total Posts</span><span className="font-bold text-slate-800">{parsed.totalPosts ?? '—'}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Last Date</span><span className="font-bold text-slate-800">{parsed.lastDate}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Salary</span><span className="font-bold text-slate-800">{parsed.salary ?? '—'}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Qualification</span><span className="font-bold text-slate-800">{parsed.qualification ?? '—'}</span></div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Focus Keyword & SEO</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">{parsed.focusKeyword}</span>
                  {parsed.secondaryKeywords.slice(0, 5).map((k, i) => (
                    <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">{k}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Content Sections</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Overview', ok: parsed.overview.trim().length > 0 },
                    { label: 'Key Highlights', ok: !!parsed.keyHighlights?.trim() },
                    { label: 'Eligibility Details', ok: !!parsed.eligibilityDetails?.trim() },
                    { label: 'How To Apply', ok: parsed.howToApply.trim().length > 0 },
                    { label: 'Important Notes', ok: !!parsed.importantNotes?.trim() },
                    { label: 'Documents Required', ok: !!parsed.documentsRequired?.trim() },
                    { label: 'Advt. No', ok: !!parsed.advertisementNumber },
                    { label: 'Age (min/max)', ok: parsed.maxAge !== null && parsed.maxAge !== undefined },
                    { label: 'Pay Range', ok: !!(parsed.minSalary || parsed.maxSalary) },
                    { label: 'Fee Table', ok: parsed.applicationFee.length > 0 },
                    { label: 'Vacancy Table', ok: parsed.vacancyBreakdown.some((r) => r.total > 0) },
                    { label: 'Official Website', ok: !!parsed.officialWebsite },
                  ].map((s) => (
                    <span
                      key={s.label}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        s.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {s.ok ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {parsed.faqSchema.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">FAQ ({parsed.faqSchema.length})</span>
                  <div className="space-y-1.5">
                    {parsed.faqSchema.slice(0, 3).map((f, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-2 text-[11px]">
                        <div className="font-bold text-slate-800">{f.question}</div>
                        <div className="text-slate-500">{f.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('upload')}
                disabled={!selectedCategoryId}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                Continue to Upload & Post <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'upload' && parsed && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div>
                <h2 className="font-heading font-bold text-slate-900 text-base mb-1">Upload Official Notification</h2>
                <p className="text-xs text-slate-600">Attach the real notification PDF so the "Download Notification" button on the live listing links to it (optional but recommended).</p>
              </div>

              <div>
                {notificationFileUrl ? (
                  <div className="flex items-start gap-2.5">
                    <DocumentPreview url={notificationFileUrl} fileName={notificationFileName} variant="thumb" />
                    <div className="flex items-center gap-1.5 flex-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2.5 rounded-xl">
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                      <a href={notificationFileUrl} target="_blank" rel="noopener noreferrer" className="truncate underline decoration-emerald-300 hover:decoration-emerald-600">
                        {notificationFileName}
                      </a>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-300 text-slate-600 text-xs font-semibold px-3 py-2.5 rounded-xl cursor-pointer hover:border-emerald-400">
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {uploadingFile ? 'Uploading…' : 'Upload the real notification PDF'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    />
                  </label>
                )}
                {uploadError && <p className="text-[10px] text-red-600 mt-1">{uploadError}</p>}
              </div>

              {postError && <div className="text-xs font-semibold text-red-600">{postError}</div>}

              <button
                onClick={handlePost}
                disabled={posting || uploadingFile}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting…' : parsed.autoPublish ? 'Post & Publish Now' : 'Save as Draft'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && parsed && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <Check className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <div className="font-black text-sm text-emerald-900">Job Posted Successfully!</div>
              {postedSlug && (
                <button onClick={() => navigate(`/jobs/${postedSlug}`)} className="text-xs font-bold text-emerald-700 underline cursor-pointer mt-1">
                  View live listing
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-600" />
                <h2 className="font-heading font-bold text-slate-900 text-base">Instagram Caption</h2>
              </div>
              <p className="text-xs text-slate-600">Copy this prompt into ChatGPT/Claude, paste the caption it gives you back below, then copy the final caption for Instagram.</p>
              <div className="bg-slate-950 text-slate-300 rounded-xl p-3 text-[10px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-mono">
                {captionPrompt}
              </div>
              <CopyButton text={captionPrompt} label="Copy Caption Prompt" />

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Paste the caption ChatGPT returns</label>
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={6}
                  placeholder="Paste the generated Instagram caption here…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
              {captionText.trim().length > 0 && <CopyButton text={captionText} label="Copy Caption" />}

              <button
                onClick={() => {
                  setStep('compose');
                  setNotificationText('');
                  setPasteText('');
                  setParsed(null);
                  setPostedSlug(null);
                  setCaptionText('');
                  setErrors([]);
                  setWarnings([]);
                  setNotificationFileUrl(null);
                  setNotificationFileName(null);
                  setUploadError(null);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Post Another Job
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
