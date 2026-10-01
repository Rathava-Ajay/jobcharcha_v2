import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, AlertTriangle, Loader2, Instagram, ClipboardPaste, Send, ChevronRight, Trophy, FileUp, FileCheck2,
} from 'lucide-react';
import { AiPostShell } from '../components/admin/AiPostShell';
import { CopyButton } from '../components/CopyButton';
import { useAuth } from '../context/AuthContext';
import { getCategories, ApiCategory } from '../api/categories';
import { aiImportResult, AiImportResultPayload } from '../api/results';
import { uploadAdminDocument } from '../api/uploads';
import { ApiError } from '../api/client';
import { buildResultExtractionPrompt, buildInstagramCaptionPrompt } from '../utils/aiPrompts';
import { validateAiResultImport, ParsedAiResult } from '../utils/aiResultImportValidation';
import { DocumentPreview } from '../components/DocumentPreview';
import { Select } from '../components/ui/Select';

type Step = 'notification' | 'prompt' | 'paste' | 'preview' | 'caption';

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'notification', label: 'Notification' },
  { key: 'prompt', label: 'Copy Prompt' },
  { key: 'paste', label: 'Paste JSON' },
  { key: 'preview', label: 'Review & Post' },
  { key: 'caption', label: 'Caption' },
];

function bestMatchCategory(categoryName: string, categories: ApiCategory[]): number | null {
  if (!categoryName || categories.length === 0) return null;
  const needle = categoryName.trim().toLowerCase();
  const exact = categories.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = categories.find((c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase()));
  return partial ? partial.id : null;
}

export default function AdminMobilePostResultPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('notification');
  const [notificationText, setNotificationText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedAiResult | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedSlug, setPostedSlug] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [resultFileName, setResultFileName] = useState<string | null>(null);
  const [resultFileUrl, setResultFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setUploadError(null);
    try {
      const { url } = await uploadAdminDocument(file);
      setResultFileUrl(url);
      setResultFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Could not upload this file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const prompt = useMemo(() => buildResultExtractionPrompt(notificationText), [notificationText]);

  const handleParse = () => {
    const result = validateAiResultImport(pasteText);
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
      setStep('preview');
    }
  };

  const handlePost = async () => {
    if (!parsed || !selectedCategoryId) return;
    setPosting(true);
    setPostError(null);
    try {
      const payload: AiImportResultPayload = {
        title: parsed.title,
        slug: parsed.slug,
        examName: parsed.examName,
        organizationName: parsed.organizationName,
        categoryId: selectedCategoryId,
        focusKeyword: parsed.focusKeyword,
        secondaryKeywords: parsed.secondaryKeywords,
        lsiKeywords: parsed.lsiKeywords,
        internalLinkAnchors: parsed.internalLinkAnchors,
        resultDate: parsed.resultDate,
        examDate: parsed.examDate,
        resultLink: parsed.resultLink,
        resultPdf: resultFileUrl ?? parsed.resultPdf,
        cutOffMarks: parsed.cutOffMarks,
        selectedCandidates: parsed.selectedCandidates,
        location: parsed.location,
        shortDescription: parsed.shortDescription,
        description: parsed.description,
        faqSchema: parsed.faqSchema,
        cutOffBreakdown: parsed.cutOffBreakdown,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        metaKeywords: parsed.metaKeywords,
        ogTitle: parsed.ogTitle,
        ogDescription: parsed.ogDescription,
        autoPublish: parsed.autoPublish,
      };
      const created = await aiImportResult(payload);
      setPostedSlug(created.slug);
      setStep('caption');
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : 'Could not post this result. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const captionPrompt = useMemo(() => {
    if (!parsed) return '';
    return buildInstagramCaptionPrompt(JSON.stringify({
      title: parsed.title, organizationName: parsed.organizationName, resultDate: parsed.resultDate,
      focusKeyword: parsed.focusKeyword,
    }, null, 2));
  }, [parsed]);

  return (
    <AiPostShell title="Post a result via AI" subtitle="Turn a result or merit-list notification into a full results page with AI, then share it." steps={STEP_LABELS} stepIndex={stepIndex}>
        {step === 'notification' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-[13px] font-bold text-slate-700 block mb-1.5">Paste the raw result notification text</label>
              <textarea
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                rows={10}
                placeholder="Paste the official result/merit-list notification text here…"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
            <button
              onClick={() => setStep('prompt')}
              disabled={notificationText.trim().length < 20}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[15px] py-3.5 cursor-pointer shadow-[0_12px_24px_-14px_rgba(37,99,235,0.8)] transition-colors"
            >
              Generate Extraction Prompt
            </button>
          </div>
        )}

        {step === 'prompt' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <p className="text-[13.5px] text-slate-600">
              Copy this prompt, paste it into ChatGPT or Claude's app, and send it. Then copy the JSON it returns and come back here.
            </p>
            <div className="bg-slate-950 text-slate-200 rounded-xl p-3.5 text-[12px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-mono">
              {prompt}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <CopyButton text={prompt} label="Copy Prompt" />
              <button
                onClick={() => setStep('paste')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold text-[14px] px-4 py-3 cursor-pointer"
              >
                I've pasted it into ChatGPT — Continue
              </button>
            </div>
          </div>
        )}

        {step === 'paste' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste the JSON the AI returned
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={12}
                placeholder='{"title": "...", "slug": "...", ...}'
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 font-mono text-[13px]"
              />
            </div>
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-[13px] text-red-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Fix these before continuing:</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <button
              onClick={handleParse}
              disabled={pasteText.trim().length < 10}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[15px] py-3.5 cursor-pointer shadow-[0_12px_24px_-14px_rgba(37,99,235,0.8)] transition-colors"
            >
              Parse & Preview
            </button>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div className="space-y-4">
            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[13px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Warnings (won't block posting):</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Title</span>
                <h2 className="font-extrabold text-slate-900 text-[18px] leading-snug break-words">{parsed.title}</h2>
                <p className="text-xs text-slate-500">{parsed.organizationName}{parsed.examName ? ` · ${parsed.examName}` : ''}</p>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Category (confirm or change)</label>
                <Select
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-slate-900"
                >
                  <option value="" disabled>Select a category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {!selectedCategoryId && (
                  <p className="text-[12.5px] font-semibold text-amber-700 mt-1.5">AI suggested "{parsed.categoryName}" — no confident match found, please pick one.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[13.5px] [&>div]:rounded-xl [&>div]:bg-slate-50 [&>div]:px-3 [&>div]:py-2.5 [&>div]:min-w-0 [&>div]:break-words">
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Result Date</span><span className="font-bold text-slate-800">{parsed.resultDate}</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Exam Date</span><span className="font-bold text-slate-800">{parsed.examDate ?? '—'}</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Cut Off</span><span className="font-bold text-slate-800">{parsed.cutOffMarks ?? '—'}</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Selected</span><span className="font-bold text-slate-800">{parsed.selectedCandidates ?? '—'}</span></div>
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Focus Keyword & SEO</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-blue-700 text-white text-[12px] font-bold px-3 py-1 rounded-full">{parsed.focusKeyword}</span>
                  {parsed.secondaryKeywords.slice(0, 5).map((k, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-[12px] font-semibold px-3 py-1 rounded-full">{k}</span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Official Result PDF (optional)</label>
                {resultFileUrl ? (
                  <div className="flex items-start gap-2.5">
                    <DocumentPreview url={resultFileUrl} fileName={resultFileName} variant="thumb" />
                    <div className="flex items-center gap-1.5 flex-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2.5 rounded-xl">
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                      <a href={resultFileUrl} target="_blank" rel="noopener noreferrer" className="truncate underline decoration-emerald-300 hover:decoration-emerald-600">
                        {resultFileName}
                      </a>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 bg-slate-50/60 border-2 border-dashed border-slate-300 text-slate-700 text-[14px] font-bold px-4 py-6 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/40 text-center">
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {uploadingFile ? 'Uploading…' : 'Upload the real result PDF so "Download Result" links to it'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    />
                  </label>
                )}
                {uploadError && <p className="text-[12.5px] text-red-600 mt-1.5">{uploadError}</p>}
              </div>

              {parsed.faqSchema.length > 0 && (
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">FAQ ({parsed.faqSchema.length})</span>
                  <div className="space-y-1.5">
                    {parsed.faqSchema.slice(0, 3).map((f, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 text-[13px]">
                        <div className="font-bold text-slate-800">{f.question}</div>
                        <div className="text-slate-500">{f.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {postError && <div className="text-[13px] font-semibold text-red-600">{postError}</div>}

              <button
                onClick={handlePost}
                disabled={posting || !selectedCategoryId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[15px] py-3.5 cursor-pointer shadow-[0_12px_24px_-14px_rgba(37,99,235,0.8)] transition-colors"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting…' : parsed.autoPublish ? 'Post & Publish Now' : 'Save as Draft'}
              </button>
            </div>
          </div>
        )}

        {step === 'caption' && parsed && (
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6 text-center">
              <Trophy className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <div className="font-extrabold text-[18px] text-slate-900">Result Posted Successfully!</div>
              {postedSlug && (
                <button onClick={() => navigate(`/results/${postedSlug}`)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[14px] px-5 py-3 cursor-pointer">
                  View live listing
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-600" />
                <h2 className="font-extrabold text-slate-900 text-[18px] leading-snug break-words">Instagram Caption</h2>
              </div>
              <p className="text-[13.5px] text-slate-600">Copy this prompt into ChatGPT/Claude, paste the caption it gives you back below, then copy the final caption for Instagram.</p>
              <div className="bg-slate-950 text-slate-200 rounded-xl p-3.5 text-[12px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                {captionPrompt}
              </div>
              <CopyButton text={captionPrompt} label="Copy Caption Prompt" />

              <div>
                <label className="text-[13px] font-bold text-slate-700 block mb-1.5">Paste the caption ChatGPT returns</label>
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={6}
                  placeholder="Paste the generated Instagram caption here…"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>
              {captionText.trim().length > 0 && <CopyButton text={captionText} label="Copy Caption" />}

              <button
                onClick={() => {
                  setStep('notification');
                  setNotificationText('');
                  setPasteText('');
                  setParsed(null);
                  setPostedSlug(null);
                  setCaptionText('');
                  setErrors([]);
                  setWarnings([]);
                  setResultFileUrl(null);
                  setResultFileName(null);
                  setUploadError(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[14px] py-3 cursor-pointer"
              >
                Post Another Result
              </button>
            </div>
          </div>
        )}
    </AiPostShell>
  );
}
