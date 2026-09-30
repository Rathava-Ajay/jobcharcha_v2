import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, AlertTriangle, Loader2, Instagram, ClipboardPaste, Send, ChevronRight, Award, ListChecks,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { CopyButton } from '../components/CopyButton';
import { useAuth } from '../context/AuthContext';
import { getExams, createTest, ApiExam, UpsertTestPayload } from '../api/tests';
import { ApiError } from '../api/client';
import { buildMockTestExtractionPrompt, buildStudyContentCaptionPrompt } from '../utils/aiPrompts';
import { validateAiMockTestImport, ParsedAiMockTest } from '../utils/aiMockTestImportValidation';

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="bg-slate-900 text-white py-8 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <button onClick={() => navigate('/dashboard/admin')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI-Assisted Mobile Posting
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">Post a Mock Test via AI</h1>

          <div className="flex items-center gap-1 mt-4 text-[10px] font-bold overflow-x-auto">
            {STEP_LABELS.map((s, idx) => (
              <React.Fragment key={s.key}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <span className={`px-2 py-1 rounded-md whitespace-nowrap ${idx === stepIndex ? 'bg-emerald-500 text-slate-950' : idx < stepIndex ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-8">
        {step === 'notification' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Paste the raw question paper / mock test text</label>
              <textarea
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                rows={10}
                placeholder="Paste the question paper text — questions, options, and answers — here…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setStep('prompt')}
              disabled={notificationText.trim().length < 20}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer transition-colors"
            >
              Generate Extraction Prompt
            </button>
          </div>
        )}

        {step === 'prompt' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <p className="text-xs text-slate-600">
              Copy this prompt, paste it into ChatGPT or Claude's app, and send it. Then copy the JSON it returns and come back here.
            </p>
            <div className="bg-slate-950 text-slate-300 rounded-xl p-3 text-[10px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-mono">
              {prompt}
            </div>
            <div className="flex gap-2">
              <CopyButton text={prompt} label="Copy Prompt" />
              <button
                onClick={() => setStep('paste')}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                I've pasted it into ChatGPT — Continue
              </button>
            </div>
          </div>
        )}

        {step === 'paste' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste the JSON the AI returned
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={12}
                placeholder='{"title": "...", "examName": "...", "sections": [...] }'
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
              Parse & Preview
            </button>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div className="space-y-4">
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
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Exam (confirm or change)</label>
                <select
                  value={selectedExamId ?? ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Select an exam…</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {!selectedExamId && (
                  <p className="text-[10px] text-amber-700 mt-1">AI suggested "{parsed.examName}" — no confident match found, please pick one.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span><span className="font-bold text-slate-800">{parsed.durationMinutes} min</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Marks / Question</span><span className="font-bold text-slate-800">{parsed.marksPerQuestion}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Negative Marking</span><span className="font-bold text-slate-800">{parsed.negativeMarking}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Access</span><span className="font-bold text-slate-800">{parsed.isFree ? 'Free' : `₹${parsed.price ?? '—'}`}</span></div>
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

              {postError && <div className="text-xs font-semibold text-red-600">{postError}</div>}

              <button
                onClick={handlePost}
                disabled={posting || !selectedExamId}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting…' : 'Post Mock Test'}
              </button>
            </div>
          </div>
        )}

        {step === 'caption' && parsed && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <Award className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <div className="font-black text-sm text-emerald-900">Mock Test Posted Successfully!</div>
              {postedSlug && (
                <button onClick={() => navigate(`/mock-tests/${postedSlug}`)} className="text-xs font-bold text-emerald-700 underline cursor-pointer mt-1">
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
                  setStep('notification');
                  setNotificationText('');
                  setPasteText('');
                  setParsed(null);
                  setPostedSlug(null);
                  setCaptionText('');
                  setErrors([]);
                  setWarnings([]);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Post Another Mock Test
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
