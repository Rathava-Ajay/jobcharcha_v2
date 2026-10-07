import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Check, AlertTriangle, Loader2, Instagram, ClipboardPaste, Send, ChevronRight, ChevronDown, ChevronUp, FileUp, FileCheck2, Radar,
  FileText, Bot, ExternalLink, PartyPopper, RotateCcw, Users, CalendarClock, IndianRupee, GraduationCap,
} from 'lucide-react';
import { AiPostShell, aiUi } from '../components/admin/AiPostShell';
import { CopyButton } from '../components/CopyButton';
import { getCategories, ApiCategory } from '../api/categories';
import { aiImportJob, AiImportJobPayload } from '../api/jobs';
import { approveJobDraft } from '../api/jobDrafts';
import { uploadAdminDocument } from '../api/uploads';
import { ApiError } from '../api/client';
import { SkipSocialCheckbox } from '../components/admin/SocialShareControls';
import { buildJobExtractionPrompt, buildInstagramCaptionPrompt } from '../utils/aiPrompts';
import { validateAiJobImport, ParsedAiJob } from '../utils/aiJobImportValidation';
import { DocumentPreview } from '../components/DocumentPreview';
import { Select } from '../components/ui/Select';

type Step = 'compose' | 'review' | 'upload' | 'success';

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'compose', label: 'Prompt & paste' },
  { key: 'review', label: 'Review' },
  { key: 'upload', label: 'Upload & post' },
  { key: 'success', label: 'Done' },
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
  const [skipSocial, setSkipSocial] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [notificationFileName, setNotificationFileName] = useState<string | null>(null);
  const [notificationFileUrl, setNotificationFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

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
        skipSocial,
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

  const goStep = (next: Step) => { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const sections = parsed ? [
    { label: 'Overview', ok: parsed.overview.trim().length > 0 },
    { label: 'Key highlights', ok: !!parsed.keyHighlights?.trim() },
    { label: 'Eligibility', ok: !!parsed.eligibilityDetails?.trim() },
    { label: 'How to apply', ok: parsed.howToApply.trim().length > 0 },
    { label: 'Important notes', ok: !!parsed.importantNotes?.trim() },
    { label: 'Documents', ok: !!parsed.documentsRequired?.trim() },
    { label: 'Advt. no', ok: !!parsed.advertisementNumber },
    { label: 'Age limits', ok: parsed.maxAge !== null && parsed.maxAge !== undefined },
    { label: 'Pay range', ok: !!(parsed.minSalary || parsed.maxSalary) },
    { label: 'Fee table', ok: parsed.applicationFee.length > 0 },
    { label: 'Vacancy table', ok: parsed.vacancyBreakdown.some((r) => r.total > 0) },
    { label: 'Official website', ok: !!parsed.officialWebsite },
  ] : [];
  const filled = sections.filter((x) => x.ok).length;

  const resetAll = () => {
    goStep('compose');
    setNotificationText('');
    setPasteText('');
    setParsed(null);
    setPostedSlug(null);
    setSkipSocial(false);
    setCaptionText('');
    setErrors([]);
    setWarnings([]);
    setNotificationFileUrl(null);
    setNotificationFileName(null);
    setUploadError(null);
  };

  return (
    <AiPostShell
      title="Post a job via AI"
      subtitle="Paste the notification, let ChatGPT or Claude fill every field, check it, attach the PDF and publish — all from your phone."
      steps={STEP_LABELS}
      stepIndex={stepIndex}
      wide={step === 'compose'}
      badges={draftId ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 border border-cyan-300/30 px-3 py-1 text-[12px] font-bold text-cyan-100">
          <Radar className="w-3.5 h-3.5" /> Scraper draft #{draftId}
        </span>
      ) : undefined}
    >
      {step === 'compose' && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <section className={aiUi.card}>
            <StepHead n={1} icon={FileText} title="Paste the notification" hint="From the PDF, website or press release" />
            <textarea
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              rows={6}
              placeholder="Paste the official notification text here…"
              className={aiUi.textarea}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 grid place-items-center shrink-0"><Bot className="w-4 h-4" /></span>
                <p className="flex-1 min-w-0 text-[13px] text-slate-600"><b className="text-slate-900">2 · Copy the prompt</b> into ChatGPT, Claude or any AI chat. SEO rules and the exact JSON fields are built in.</p>
              </div>
              <CopyButton text={prompt} label="Copy prompt" full />
              <button type="button" onClick={() => setShowPrompt((v) => !v)} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-slate-500 hover:text-blue-700 cursor-pointer">
                {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}{showPrompt ? 'Hide prompt' : 'Preview prompt'}
              </button>
              {showPrompt && <div className={aiUi.promptBox}>{prompt}</div>}
            </div>
          </section>

          <section className={aiUi.card}>
            <StepHead n={3} icon={ClipboardPaste} title="Paste the AI's JSON reply" hint="Copy everything the AI returned — braces included" />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              placeholder='{"title": "...", "slug": "...", ...}'
              className={`${aiUi.textarea} ${aiUi.mono}`}
            />
            {errors.length > 0 && <ErrorList title="Fix these before continuing" items={errors} />}
            <button onClick={handleParse} disabled={pasteText.trim().length < 10} className={aiUi.primary}>
              Check &amp; continue <ChevronRight className="w-5 h-5" />
            </button>
          </section>
        </div>
      )}

      {step === 'review' && parsed && (
        <div className="space-y-4 pb-24 sm:pb-0">
          {warnings.length > 0 && <ErrorList tone="amber" title="Warnings — these won't block posting" items={warnings} />}

          <section className={aiUi.card}>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Job title</p>
              <h2 className="text-[18px] sm:text-[20px] font-extrabold leading-snug text-slate-900 break-words">{parsed.title}</h2>
              {parsed.department && <p className="text-[13px] text-slate-500 break-words">{parsed.department}</p>}
            </div>

            <div>
              <label className={aiUi.label}>Category <span className="font-semibold text-slate-400">— confirm or change</span></label>
              <Select value={selectedCategoryId ?? ''} onChange={(e) => setSelectedCategoryId(Number(e.target.value))} aria-label="Category" className={aiUi.select}>
                <option value="" disabled>Select a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {!selectedCategoryId && (
                <p className="mt-1.5 text-[12.5px] font-semibold text-amber-700">AI suggested “{parsed.categoryName}” — no confident match, please pick one.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Fact icon={Users} label="Total posts" value={parsed.totalPosts != null ? String(parsed.totalPosts) : undefined} />
              <Fact icon={CalendarClock} label="Last date" value={parsed.lastDate} />
              <Fact icon={IndianRupee} label="Salary" value={parsed.salary ?? undefined} />
              <Fact icon={GraduationCap} label="Qualification" value={parsed.qualification ?? undefined} />
            </div>

            <div>
              <p className={aiUi.label}>Focus keyword &amp; SEO</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-blue-700 text-white text-[12px] font-bold px-3 py-1">{parsed.focusKeyword}</span>
                {parsed.secondaryKeywords.slice(0, 5).map((k, i) => (
                  <span key={i} className="rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold px-3 py-1">{k}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[13px] font-bold text-slate-700">Content completeness</p>
                <span className={`text-[12.5px] font-extrabold ${filled >= 10 ? 'text-emerald-600' : filled >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>{filled}/{sections.length} filled</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2.5">
                <div className={`h-full rounded-full ${filled >= 10 ? 'bg-emerald-500' : filled >= 7 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${(filled / Math.max(1, sections.length)) * 100}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {sections.map((x) => (
                  <span key={x.label} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold ${x.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400'}`}>
                    {x.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{x.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {parsed.faqSchema.length > 0 && (
              <div>
                <p className={aiUi.label}>FAQ ({parsed.faqSchema.length})</p>
                <div className="space-y-1.5">
                  {parsed.faqSchema.slice(0, 3).map((f, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 p-3 text-[13px]">
                      <p className="font-bold text-slate-800">{f.question}</p>
                      <p className="text-slate-500">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <ActionBar>
            <button onClick={() => goStep('compose')} className={aiUi.secondary}><ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span></button>
            <button onClick={() => goStep('upload')} disabled={!selectedCategoryId} className={aiUi.primary}>
              Continue to upload <ChevronRight className="w-5 h-5" />
            </button>
          </ActionBar>
        </div>
      )}

      {step === 'upload' && parsed && (
        <div className="space-y-4 pb-24 sm:pb-0">
          <section className={aiUi.card}>
            <StepHead icon={FileUp} title="Attach the official notification" hint="Optional, but the “Download notification” button on the listing links to it" />
            {notificationFileUrl ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <DocumentPreview url={notificationFileUrl} fileName={notificationFileName} variant="thumb" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-800"><FileCheck2 className="w-4 h-4 shrink-0" /> Uploaded</p>
                  <a href={notificationFileUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] font-semibold text-emerald-900 underline decoration-emerald-300">{notificationFileName}</a>
                  <label className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-slate-600 hover:text-blue-700 cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Replace file
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingFile}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/60 px-4 py-9 text-center cursor-pointer transition-colors">
                <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 grid place-items-center text-blue-700">
                  {uploadingFile ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
                </span>
                <span className="text-[15px] font-extrabold text-slate-900">{uploadingFile ? 'Uploading…' : 'Tap to upload the notification'}</span>
                <span className="text-[12.5px] text-slate-500">PDF or image (PNG, JPG, WebP)</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingFile}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              </label>
            )}
            {uploadError && <p className="text-[13px] font-semibold text-red-600">{uploadError}</p>}

            <div className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
              <span className="font-bold text-slate-900">{parsed.autoPublish ? 'Publishes immediately' : 'Saves as a draft'}</span> — {parsed.autoPublish ? 'the job goes live as soon as you post.' : 'you can publish it later from Admin → Jobs.'}
            </div>
            {postError && <ErrorList title="Couldn't post" items={[postError]} />}
          </section>

          {parsed.autoPublish && (
            <section className={aiUi.card}>
              <SkipSocialCheckbox checked={skipSocial} onChange={setSkipSocial} />
            </section>
          )}

          <ActionBar>
            <button onClick={() => goStep('review')} className={aiUi.secondary}><ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span></button>
            <button onClick={handlePost} disabled={posting || uploadingFile} className={aiUi.primary}>
              {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {posting ? 'Posting…' : parsed.autoPublish ? 'Post & publish now' : 'Save as draft'}
            </button>
          </ActionBar>
        </div>
      )}

      {step === 'success' && parsed && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 text-center">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500 text-white grid place-items-center shadow-[0_12px_24px_-12px_rgba(16,185,129,0.8)]"><PartyPopper className="w-7 h-7" /></span>
            <h2 className="mt-3 text-[20px] font-extrabold text-slate-900">Job posted!</h2>
            <p className="text-[13.5px] text-slate-600 break-words">{parsed.title}</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
              {postedSlug && (
                <button onClick={() => navigate(`/jobs/${postedSlug}`)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[14px] px-5 py-3 cursor-pointer">
                  <ExternalLink className="w-4 h-4" /> View live listing
                </button>
              )}
              <button onClick={resetAll} className={aiUi.secondary}><RotateCcw className="w-4 h-4" /> Post another job</button>
            </div>
          </section>

          <section className={aiUi.card}>
            <StepHead icon={Instagram} tone="bg-pink-50 text-pink-600" title="Instagram caption" hint="Copy the prompt into ChatGPT/Claude, paste its caption below, then copy it for Instagram" />
            <CopyButton text={captionPrompt} label="Copy caption prompt" full />
            <details className="group">
              <summary className="list-none inline-flex items-center gap-1 text-[12.5px] font-bold text-slate-500 hover:text-blue-700 cursor-pointer"><ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" /> Preview prompt</summary>
              <div className={`${aiUi.promptBox} mt-2`}>{captionPrompt}</div>
            </details>
            <div>
              <label className={aiUi.label}>Paste the caption the AI returns</label>
              <textarea value={captionText} onChange={(e) => setCaptionText(e.target.value)} rows={6} placeholder="Paste the generated Instagram caption here…" className={aiUi.textarea} />
            </div>
            {captionText.trim().length > 0 && <CopyButton text={captionText} label="Copy caption" full />}
          </section>
        </div>
      )}
    </AiPostShell>
  );
}

const StepHead: React.FC<{ n?: number; icon: React.ElementType; title: string; hint?: string; tone?: string }> = ({ n, icon: Icon, title, hint, tone }) => (
  <div className="flex items-center gap-3">
    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone ?? 'bg-blue-50 text-blue-700'}`}><Icon className="w-5 h-5" /></span>
    <div className="min-w-0">
      <h2 className="font-extrabold text-[16px] text-slate-900">{n ? <span className="text-blue-700">{n} · </span> : null}{title}</h2>
      {hint && <p className="text-[12.5px] text-slate-500">{hint}</p>}
    </div>
  </div>
);

const Fact: React.FC<{ icon: React.ElementType; label: string; value?: string }> = ({ icon: Icon, label, value }) => (
  <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Icon className="w-3.5 h-3.5" />{label}</p>
    <p className={`mt-0.5 text-[14px] font-bold break-words ${value ? 'text-slate-900' : 'text-slate-400'}`}>{value || '—'}</p>
  </div>
);

const ErrorList: React.FC<{ title: string; items: string[]; tone?: 'red' | 'amber' }> = ({ title, items, tone = 'red' }) => (
  <div role={tone === 'red' ? 'alert' : 'status'} className={`rounded-xl border p-3.5 text-[13px] space-y-1 ${tone === 'red' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
    <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {title}</p>
    <ul className="list-disc pl-5 space-y-0.5">{items.map((e, i) => <li key={i}>{e}</li>)}</ul>
  </div>
);

/** On phones the step actions stay pinned to the bottom of the screen, within thumb reach. */
const ActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed sm:static inset-x-0 bottom-0 z-30 bg-white/95 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t border-slate-200 sm:border-0 px-4 sm:px-0 py-3 sm:py-0 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-0">
    <div className="flex gap-2">{children}</div>
  </div>
);
