import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Clock, ArrowLeft, Flag, ListChecks, AlertTriangle, ChevronLeft, ChevronRight, Lock, LogIn, Loader2,
  LayoutGrid, X, Check, Eraser, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AttemptResultView } from '../components/AttemptResultView';
import {
  getTestBySlug, startAttempt, saveAttemptResponse, submitAttempt,
  ApiTestDetail, ApiAttemptSession, ApiAttemptQuestion, ApiAttemptResult,
} from '../api/tests';
import { startRazorpayCheckout } from '../utils/razorpayCheckout';

type Phase = 'loading' | 'login-required' | 'locked' | 'not-found' | 'instructions' | 'testing' | 'review' | 'result';
type ContentLang = 'en' | 'gu';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const LANG_KEY = 'jobcharcha.mocktest_lang';

const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    : `${m}:${s < 10 ? '0' : ''}${s}`;
};

/** Prefer the Gujarati string when the Gujarati view is active and a translation exists,
 *  otherwise fall back to English — so a partially-translated test still reads cleanly. */
const pick = (lang: ContentLang, en: string, gu?: string | null): string =>
  lang === 'gu' && gu && gu.trim() ? gu : en;

function optionText(q: ApiAttemptQuestion, letter: string, lang: ContentLang): string {
  switch (letter) {
    case 'A': return pick(lang, q.optionA, q.optionAGu);
    case 'B': return pick(lang, q.optionB, q.optionBGu);
    case 'C': return pick(lang, q.optionC, q.optionCGu);
    default: return pick(lang, q.optionD, q.optionDGu);
  }
}

export default function MockTestPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [test, setTest] = useState<ApiTestDetail | null>(null);
  const [session, setSession] = useState<ApiAttemptSession | null>(null);
  const [result, setResult] = useState<ApiAttemptResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const [contentLang, setContentLang] = useState<ContentLang>(() => {
    try { return localStorage.getItem(LANG_KEY) === 'gu' ? 'gu' : 'en'; } catch { return 'en'; }
  });
  const setLang = useCallback((l: ContentLang) => {
    setContentLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ }
  }, []);
  const gu = contentLang === 'gu';
  const guText = gu ? 'lang-gu' : '';

  const [paletteOpen, setPaletteOpen] = useState(false);

  const questions = useMemo(() => session?.sections.flatMap((s) => s.questions) ?? [], [session]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const endsAtRef = useRef<number>(0);
  const submittingRef = useRef(false);

  // Load the test; decide whether the viewer can attempt it.
  useEffect(() => {
    if (!slug || authLoading) return;
    let cancelled = false;
    setPhase('loading');
    getTestBySlug(slug)
      .then((t) => {
        if (cancelled) return;
        document.title = `${t.title} | JobCharcha`;
        setTest(t);
        if (!isAuthenticated) {
          setPhase('login-required');
        } else if (t.isLocked) {
          setPhase('locked');
        } else {
          setPhase('instructions');
        }
      })
      .catch(() => { if (!cancelled) setPhase('not-found'); });
    return () => { cancelled = true; };
  }, [slug, isAuthenticated, authLoading]);

  const buyThisTest = async () => {
    if (!test) return;
    setBuying(true);
    setBuyError(null);
    const outcome = await startRazorpayCheckout(
      { paymentFor: 'Test', testId: test.id },
      { name: 'JobCharcha', description: test.title, prefillName: user?.name, prefillEmail: user?.email },
    );

    if (outcome.status === 'success') {
      try {
        const refreshed = await getTestBySlug(test.slug);
        setTest(refreshed);
        setPhase(refreshed.isLocked ? 'locked' : 'instructions');
      } catch {
        setPhase('instructions');
      }
    } else if (outcome.status === 'failed') {
      setBuyError(outcome.message);
    }
    setBuying(false);
  };

  const seedFromSession = (s: ApiAttemptSession) => {
    setSession(s);
    const answers: Record<number, string> = {};
    const flags: Record<number, boolean> = {};
    const seenVisited: Record<number, boolean> = {};
    s.sections.forEach((sec) => sec.questions.forEach((q) => {
      if (q.selectedOption) answers[q.id] = q.selectedOption;
      if (q.isMarkedForReview) flags[q.id] = true;
      if (q.isVisited) seenVisited[q.id] = true;
    }));
    setSelectedAnswers(answers);
    setFlagged(flags);
    setVisited(seenVisited);
    endsAtRef.current = new Date(s.endsAt).getTime();
    setTimeLeft(Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000)));
    setCurrentIndex(0);
    setPhase('testing');
  };

  const startTest = async () => {
    if (!test) return;
    setStarting(true);
    setErrorMessage(null);
    try {
      const s = await startAttempt(test.id);
      seedFromSession(s);
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'PremiumLocked') {
        setPhase('locked');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Could not start the test. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  };

  const persistResponse = useCallback((questionId: number, selectedOption: string | undefined, isMarkedForReview: boolean) => {
    if (!session) return;
    saveAttemptResponse(session.attemptId, { questionId, selectedOption: selectedOption ?? null, isMarkedForReview }).catch(() => {});
  }, [session]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
    setPaletteOpen(false);
    const q = questions[idx];
    if (q && !visited[q.id]) {
      setVisited((v) => ({ ...v, [q.id]: true }));
      persistResponse(q.id, selectedAnswers[q.id], !!flagged[q.id]);
    }
  }, [questions, visited, selectedAnswers, flagged, persistResponse]);

  const currentQ = questions[currentIndex];

  const stats = useMemo(() => {
    let answered = 0, flaggedCount = 0, notAnswered = 0, notVisited = 0;
    questions.forEach((q) => {
      const isAnswered = selectedAnswers[q.id] !== undefined;
      const isFlagged = !!flagged[q.id];
      const isVisited = !!visited[q.id];
      if (isFlagged) flaggedCount++;
      if (isAnswered) answered++;
      else if (isVisited) notAnswered++;
      else notVisited++;
    });
    return { answered, flaggedCount, notAnswered, notVisited, total: questions.length };
  }, [questions, selectedAnswers, flagged, visited]);

  const doSubmit = useCallback(() => {
    if (!session || submittingRef.current) return;
    submittingRef.current = true;
    submitAttempt(session.attemptId)
      .then((r) => { setResult(r); setPhase('result'); })
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Could not submit the test.'))
      .finally(() => { submittingRef.current = false; });
  }, [session]);

  // Live countdown, recomputed from the server-issued endsAt (resilient to tab throttling).
  useEffect(() => {
    if (phase !== 'testing') return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) doSubmit();
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, doSubmit]);

  const handleSelect = useCallback((letter: string) => {
    if (!currentQ) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: letter }));
    persistResponse(currentQ.id, letter, !!flagged[currentQ.id]);
  }, [currentQ, flagged, persistResponse]);

  const handleClear = () => {
    if (!currentQ) return;
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
    persistResponse(currentQ.id, undefined, !!flagged[currentQ.id]);
  };

  const toggleFlag = () => {
    if (!currentQ) return;
    const next = !flagged[currentQ.id];
    setFlagged((prev) => ({ ...prev, [currentQ.id]: next }));
    persistResponse(currentQ.id, selectedAnswers[currentQ.id], next);
  };

  // Keyboard shortcuts on desktop: 1-4 / A-D pick an option, arrows move between questions.
  useEffect(() => {
    if (phase !== 'testing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(k)) { handleSelect(k); }
      else if (['1', '2', '3', '4'].includes(k)) { handleSelect(OPTION_LETTERS[Number(k) - 1]); }
      else if (e.key === 'ArrowRight') { goTo(currentIndex + 1); }
      else if (e.key === 'ArrowLeft') { goTo(currentIndex - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, currentIndex, handleSelect, goTo]);

  // ---------- shared bits ----------
  const LangToggle = ({ compact = false }: { compact?: boolean }) =>
    session?.hasGujarati ? (
      <div className={`inline-flex items-center rounded-xl bg-slate-100 p-0.5 ${compact ? '' : 'shadow-sm'}`}>
        {(['en', 'gu'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
              contentLang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            } ${l === 'gu' ? 'lang-gu lang-gu-tight' : ''}`}
          >
            {l === 'en' ? 'EN' : 'ગુજરાતી'}
          </button>
        ))}
      </div>
    ) : null;

  const Palette = ({ onPick }: { onPick: (i: number) => void }) => (
    <>
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const isAnswered = selectedAnswers[q.id] !== undefined;
          const isFlaggedQ = !!flagged[q.id];
          const isVisitedQ = !!visited[q.id];
          const isCurrent = idx === currentIndex;
          let cls = 'bg-slate-100 text-slate-500'; // not visited
          if (isFlaggedQ && isAnswered) cls = 'bg-purple-600 text-white ring-1 ring-inset ring-emerald-300';
          else if (isFlaggedQ) cls = 'bg-purple-500 text-white';
          else if (isAnswered) cls = 'bg-emerald-600 text-white';
          else if (isVisitedQ) cls = 'bg-red-100 text-red-700 border border-red-300';
          return (
            <button
              key={q.id}
              onClick={() => onPick(idx)}
              aria-current={isCurrent}
              className={`h-10 w-full rounded-lg text-xs font-extrabold cursor-pointer transition-all ${cls} ${
                isCurrent ? 'ring-2 ring-offset-1 ring-slate-900' : ''
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-500 mt-4">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600 inline-block shrink-0" /> Answered ({stats.answered})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block shrink-0" /> Not answered ({stats.notAnswered})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 inline-block shrink-0" /> Marked ({stats.flaggedCount})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 inline-block shrink-0" /> Not visited ({stats.notVisited})</div>
      </div>
    </>
  );

  // ================= EARLY STATES =================
  if (phase === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (phase === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4 text-center">
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Mock test not found</h1>
        <p className="text-sm text-slate-500">This test may have been removed or the link is incorrect.</p>
        <Link to="/mock-tests" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Browse Mock Tests</Link>
      </div>
    );
  }

  if (phase === 'login-required' && test) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center">
          <LogIn className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">Login to attempt “{test.title}”</h1>
        <p className="text-sm text-slate-500 max-w-md">Create a free account or log in to start this CBT mock test, save your progress, and track your score history.</p>
        <button
          onClick={() => navigate('/login', { state: { from: location.pathname } })}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer"
        >
          Login / Register
        </button>
      </div>
    );
  }

  if (phase === 'locked' && test) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">“{test.title}” is a Premium test</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Unlock this test individually{test.price != null ? ` for ₹${test.price}` : ''} or subscribe to a plan that unlocks all premium mock tests.
        </p>
        {buyError && <p className="text-xs font-semibold text-red-600 max-w-md">{buyError}</p>}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
          {test.price != null && (
            <button
              onClick={buyThisTest}
              disabled={buying}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {buying ? 'Processing…' : `Buy this test for ₹${test.price}`}
            </button>
          )}
          <button
            onClick={() => navigate('/#pricing-section')}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  // ================= INSTRUCTIONS =================
  if (phase === 'instructions') {
    const title = pick(contentLang, test.title, test.titleGu);
    const instructions = pick(contentLang, test.instructions || '', test.instructionsGu);
    const hasGuInstructions = !!(test.titleGu || test.instructionsGu);
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-6 gap-3">
            <button onClick={() => navigate('/mock-tests')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Mock Tests
            </button>
            {hasGuInstructions && (
              <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5">
                {(['en', 'gu'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                      contentLang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    } ${l === 'gu' ? 'lang-gu lang-gu-tight' : ''}`}
                  >
                    {l === 'en' ? 'EN' : 'ગુજરાતી'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {test.categoryName}
            </span>
            <h1 className={`text-lg sm:text-2xl font-heading font-extrabold text-slate-900 mt-3 mb-1 ${gu ? 'lang-gu' : ''}`}>{title}</h1>
            <p className="text-xs text-slate-500 mb-6">{test.examName}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
              {[
                { label: 'Questions', value: test.totalQuestions },
                { label: 'Duration', value: `${test.durationMinutes} min` },
                { label: 'Total Marks', value: test.totalMarks },
                { label: 'Negative', value: test.negativeMarking },
              ].map((s, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{s.label}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{s.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6">
              <h2 className="font-heading font-extrabold text-sm text-amber-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {gu ? 'સૂચનાઓ' : 'General Instructions'}
              </h2>
              {instructions ? (
                <p className={`text-xs text-amber-900 font-medium whitespace-pre-line ${gu ? 'lang-gu' : ''}`}>{instructions}</p>
              ) : (
                <ul className="text-xs text-amber-900 space-y-1.5 font-medium list-disc list-inside">
                  <li>The test auto-submits when the timer reaches zero.</li>
                  <li>Use “Mark for Review” to flag questions to revisit before submitting.</li>
                  <li>Navigate freely between questions using the question palette.</li>
                  <li>On desktop, keys 1–4 (or A–D) select an option; ← → change questions.</li>
                </ul>
              )}
              {test.hasInProgressAttempt && (
                <p className="text-xs text-amber-900 font-bold mt-3">You have an in-progress attempt — starting will resume it.</p>
              )}
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3 mb-4">{errorMessage}</div>
            )}

            <button
              onClick={startTest}
              disabled={starting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm py-4 rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {starting && <Loader2 className="w-4 h-4 animate-spin" />}
              {test.hasInProgressAttempt ? 'Resume Test' : 'Start Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RESULT =================
  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen flex flex-col">
        <AttemptResultView
          result={result}
          contentLang={contentLang}
          onRetake={() => { setResult(null); setSession(null); setPhase('instructions'); }}
          onBack={() => navigate('/mock-tests')}
          backLabel="Back to Mock Tests"
        />
      </div>
    );
  }

  // ================= REVIEW SUMMARY (before final submit) =================
  if (phase === 'review') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center">
            <ListChecks className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h1 className="text-xl font-heading font-extrabold text-slate-900 mb-1">Attempt Summary</h1>
            <p className="text-xs text-slate-500 mb-6">Review before you submit — this cannot be undone.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><span className="text-lg font-black text-emerald-700 block">{stats.answered}</span><span className="text-[10px] font-bold text-emerald-700 uppercase">Answered</span></div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3"><span className="text-lg font-black text-red-700 block">{stats.notAnswered}</span><span className="text-[10px] font-bold text-red-700 uppercase">Not Answered</span></div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3"><span className="text-lg font-black text-purple-700 block">{stats.flaggedCount}</span><span className="text-[10px] font-bold text-purple-700 uppercase">Marked for Review</span></div>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3"><span className="text-lg font-black text-slate-600 block">{stats.notVisited}</span><span className="text-[10px] font-bold text-slate-600 uppercase">Not Visited</span></div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3 mb-4">{errorMessage}</div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button onClick={() => setPhase('testing')} className="w-full sm:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3.5 rounded-xl cursor-pointer">
                Continue Test
              </button>
              <button onClick={doSubmit} className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md cursor-pointer">
                Submit Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= TESTING =================
  if (!currentQ) return null;
  const selectedOpt = selectedAnswers[currentQ.id];
  const isFlagged = !!flagged[currentQ.id];
  const progressPct = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
  const timerTone =
    timeLeft <= 60 ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
    : timeLeft <= 300 ? 'bg-amber-50 border-amber-300 text-amber-800'
    : 'bg-emerald-50 border-emerald-300 text-emerald-800';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ---------- Sticky header: title · timer · progress · submit ---------- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setPhase('review')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0 lg:hidden" aria-label="Submit / exit">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider hidden sm:block">Live CBT Mode</span>
              <h1 className={`text-xs sm:text-sm font-heading font-extrabold text-slate-900 truncate max-w-[45vw] sm:max-w-xs ${gu ? 'lang-gu lang-gu-tight' : ''}`}>
                {pick(contentLang, session?.testTitle || test.title, session?.testTitleGu)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:block"><LangToggle /></div>
            <div className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-mono font-bold flex items-center gap-1.5 tabular-nums ${timerTone}`}>
              <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setPhase('review')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Submit Test</span><span className="sm:hidden">Submit</span>
            </button>
          </div>
        </div>
        {/* progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-5 lg:gap-6">
        {/* ---------- Question panel ---------- */}
        <div className="min-w-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-7">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-extrabold text-slate-900 shrink-0">Q {currentIndex + 1}<span className="text-slate-400 font-bold"> / {questions.length}</span></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate hidden sm:block">
                  {session?.sections.find((s) => s.questions.some((q) => q.id === currentQ.id))?.name}
                </span>
              </div>
              <button
                onClick={toggleFlag}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                  isFlagged ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-purple-600' : ''}`} />
                <span className="hidden sm:inline">{isFlagged ? 'Marked for review' : 'Mark for review'}</span>
                <span className="sm:hidden">{isFlagged ? 'Marked' : 'Mark'}</span>
              </button>
            </div>

            <p className={`text-[15px] sm:text-lg text-slate-900 mb-5 sm:mb-6 ${gu ? 'lang-gu' : 'leading-relaxed font-semibold'}`}>
              {pick(contentLang, currentQ.questionText, currentQ.questionTextGu)}
            </p>

            <div className="space-y-2.5 sm:space-y-3">
              {OPTION_LETTERS.map((letter) => {
                const active = selectedOpt === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => handleSelect(letter)}
                    className={`w-full text-left rounded-xl border transition-all flex items-center gap-3 p-3 sm:p-3.5 min-h-[3.25rem] cursor-pointer ${
                      active
                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-extrabold shrink-0 ${
                      active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {active ? <Check className="w-4 h-4" /> : letter}
                    </span>
                    <span className={`text-sm ${active ? 'text-emerald-900 font-semibold' : 'text-slate-700'} ${gu ? 'lang-gu' : ''}`}>
                      {optionText(currentQ, letter, contentLang)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* desktop inline nav */}
            <div className="mt-6 pt-4 border-t border-slate-100 hidden lg:flex items-center justify-between gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => goTo(currentIndex - 1)}
                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button onClick={handleClear} className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer px-3 py-2.5 flex items-center gap-1">
                <Eraser className="w-3.5 h-3.5" /> Clear
              </button>
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => goTo(currentIndex + 1)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                >
                  Save &amp; Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setPhase('review')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  Finish &amp; Review
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Desktop palette sidebar ---------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Question Palette</h3>
              <LangToggle compact />
            </div>
            <Palette onPick={goTo} />
          </div>
        </aside>
      </div>

      {/* ---------- Mobile / tablet sticky action bar ---------- */}
      <div className="lg:hidden sticky bottom-0 z-40 bg-white border-t border-slate-200 pb-safe">
        <div className="max-w-6xl mx-auto px-3 pt-2.5 flex items-center gap-2">
          <button
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
            className="bg-slate-100 disabled:opacity-40 text-slate-700 rounded-xl p-3 cursor-pointer shrink-0"
            aria-label="Previous question"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            {stats.answered}/{stats.total} answered · Palette
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="bg-emerald-600 text-white rounded-xl px-4 py-3 text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setPhase('review')}
              className="bg-emerald-600 text-white rounded-xl px-4 py-3 text-xs font-bold cursor-pointer shrink-0"
            >
              Review
            </button>
          )}
        </div>
      </div>

      {/* ---------- Mobile palette bottom sheet ---------- */}
      {paletteOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setPaletteOpen(false)} aria-label="Close palette" />
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 max-h-[78vh] flex flex-col pb-safe">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Question Palette</h3>
              <div className="flex items-center gap-2">
                <LangToggle compact />
                <button onClick={() => setPaletteOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <Palette onPick={goTo} />
            </div>
            <div className="px-5 pt-3 pb-2 border-t border-slate-100">
              <button
                onClick={() => { setPaletteOpen(false); setPhase('review'); }}
                className="w-full bg-slate-900 text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
