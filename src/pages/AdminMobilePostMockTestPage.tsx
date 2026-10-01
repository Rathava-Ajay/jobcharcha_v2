import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, AlertTriangle, Loader2, Instagram, ClipboardPaste, Send, ChevronRight, Award, ListChecks,
} from 'lucide-react';
import { AiPostShell } from '../components/admin/AiPostShell';
import { CopyButton } from '../components/CopyButton';
import { useAuth } from '../context/AuthContext';
import { getExams, createTest, ApiExam, UpsertTestPayload } from '../api/tests';
import { ApiError } from '../api/client';
import { buildMockTestExtractionPrompt, buildStudyContentCaptionPrompt } from '../utils/aiPrompts';
import { validateAiMockTestImport, ParsedAiMockTest } from '../utils/aiMockTestImportValidation';
import { Select } from '../components/ui/Select';

type Step = 'notification' | 'prompt' | 'paste' | 'preview' | 'caption';

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'notification', label: 'Question Paper' },
  { key: 'prompt', label: 'Copy Prompt' },
  { key: 'paste', label: 'Paste JSON' },
  { key: 'preview', label: 'Review & Post' },
  { key: 'caption', label: 'Caption' },
];

function bestMatchExam(examName: string, exams: ApiExam[]): number | null {
  if (!examName || exams.length === 0) return null;
  const needle = examName.trim().toLowerCase();
  const exact = exams.find((e) => e.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = exams.find((e) => e.name.toLowerCase().includes(needle) || needle.includes(e.name.toLowerCase()));
  return partial ? partial.id : null;
}

export default function AdminMobilePostMockTestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('notification');
  const [notificationText, setNotificationText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedAiMockTest | null>(null);
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedSlug, setPostedSlug] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const prompt = useMemo(() => buildMockTestExtractionPrompt(notificationText), [notificationText]);

  const totalQuestions = parsed ? parsed.sections.reduce((sum, s) => sum + s.questions.length, 0) : 0;

  const handleParse = () => {
    const result = validateAiMockTestImport(pasteText);
    setErrors(result.errors);
    setWarnings(result.warnings);
    if (result.data) {
      setParsed(result.data);
      getExams()
        .then((list) => {
          setExams(list);
          setSelectedExamId(bestMatchExam(result.data!.examName, list));
        })
        .catch(() => setExams([]));
      setStep('preview');
    }
  };

  const handlePost = async () => {
    if (!parsed || !selectedExamId) return;
    setPosting(true);
    setPostError(null);
    try {
      const payload: UpsertTestPayload = {
        examId: selectedExamId,
        title: parsed.title,
        durationMinutes: parsed.durationMinutes,
        negativeMarking: parsed.negativeMarking,
        marksPerQuestion: parsed.marksPerQuestion,
        isFree: parsed.isFree,
        price: parsed.price,
        instructions: parsed.instructions,
        displayOrder: 0,
        isActive: true,
        sections: parsed.sections.map((s) => ({
          name: s.name,
          displayOrder: s.displayOrder,
          questions: s.questions.map((q) => ({
            subject: q.subject,
            topic: q.topic,
            questionTextEn: q.questionTextEn,
            optionAEn: q.optionAEn,
            optionBEn: q.optionBEn,
            optionCEn: q.optionCEn,
            optionDEn: q.optionDEn,
            correctOption: q.correctOption,
            explanationEn: q.explanationEn,
            marks: q.marks,
            displayOrder: q.displayOrder,
          })),
        })),
      };
      const created = await createTest(payload);
      setPostedSlug(created.slug);
      setStep('caption');
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : 'Could not post this mock test. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const captionPrompt = useMemo(() => {
    if (!parsed) return '';
    return buildStudyContentCaptionPrompt(JSON.stringify({
      title: parsed.title, examName: parsed.examName, isFree: parsed.isFree, totalQuestions,
    }, null, 2), 'mock test');
  }, [parsed, totalQuestions]);

  return (
    <AiPostShell title="Post a mock test via AI" subtitle="Turn a question paper into a full CBT mock test with AI: questions, answers and explanations." steps={STEP_LABELS} stepIndex={stepIndex}>
        {step === 'notification' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div>
              <label className="text-[13px] font-bold text-slate-700 block mb-1.5">Paste the raw question paper / mock test text</label>
              <textarea
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                rows={10}
                placeholder="Paste the question paper text — questions, options, and answers — here…"
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
                placeholder='{"title": "...", "examName": "...", "sections": [...] }'
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
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Exam (confirm or change)</label>
                <Select
                  value={selectedExamId ?? ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-slate-900"
                >
                  <option value="" disabled>Select an exam…</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
                {!selectedExamId && (
                  <p className="text-[12.5px] font-semibold text-amber-700 mt-1.5">AI suggested "{parsed.examName}" — no confident match found, please pick one.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[13.5px] [&>div]:rounded-xl [&>div]:bg-slate-50 [&>div]:px-3 [&>div]:py-2.5 [&>div]:min-w-0 [&>div]:break-words">
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Duration</span><span className="font-bold text-slate-800">{parsed.durationMinutes} min</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Marks / Question</span><span className="font-bold text-slate-800">{parsed.marksPerQuestion}</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Negative Marking</span><span className="font-bold text-slate-800">{parsed.negativeMarking}</span></div>
                <div><span className="text-[11px] text-slate-400 uppercase tracking-wide font-bold block">Access</span><span className="font-bold text-slate-800">{parsed.isFree ? 'Free' : `₹${parsed.price ?? '—'}`}</span></div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Sections & Questions
                </span>
                <div className="space-y-1.5">
                  {parsed.sections.map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-2 text-[11px] flex items-center justify-between">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <span className="text-slate-500">{s.questions.length} question{s.questions.length === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-semibold">Total: {totalQuestions} question{totalQuestions === 1 ? '' : 's'} across {parsed.sections.length} section{parsed.sections.length === 1 ? '' : 's'}</p>
              </div>

              {postError && <div className="text-[13px] font-semibold text-red-600">{postError}</div>}

              <button
                onClick={handlePost}
                disabled={posting || !selectedExamId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[15px] py-3.5 cursor-pointer shadow-[0_12px_24px_-14px_rgba(37,99,235,0.8)] transition-colors"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting…' : 'Post Mock Test'}
              </button>
            </div>
          </div>
        )}

        {step === 'caption' && parsed && (
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6 text-center">
              <Award className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <div className="font-extrabold text-[18px] text-slate-900">Mock Test Posted Successfully!</div>
              {postedSlug && (
                <button onClick={() => navigate(`/mock-tests/${postedSlug}`)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[14px] px-5 py-3 cursor-pointer">
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
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[14px] py-3 cursor-pointer"
              >
                Post Another Mock Test
              </button>
            </div>
          </div>
        )}
    </AiPostShell>
  );
}
