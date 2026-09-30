import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Clock, CheckCircle2, XCircle, Loader2, Calendar, RotateCcw,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getTodayQuiz, getQuizByDate, getAvailableQuizDates, getMyQuizAttempt, submitDailyQuiz, getOrCreateGuestKey,
  ApiDailyQuiz, ApiDailyQuizResult,
} from '../api/dailyQuiz';
import { ApiError } from '../api/client';

export default function DailyQuizPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<ApiDailyQuiz | null>(null);
  const [result, setResult] = useState<ApiDailyQuizResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const guestKey = getOrCreateGuestKey();

  useEffect(() => {
    document.title = 'Daily Quiz | JobCharcha';
    getAvailableQuizDates().then(setDates).catch(() => setDates([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setAnswers({});
    const fetchQuiz = date ? getQuizByDate(date) : getTodayQuiz();
    fetchQuiz
      .then(async (q) => {
        setQuiz(q);
        try {
          const existing = await getMyQuizAttempt(q.id, guestKey);
          setResult(existing);
        } catch {
          // no prior attempt — fine
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleSelect = (questionId: number, option: string) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId: Number(questionId),
        selectedOption: selectedOption as string,
      }));
      const res = await submitDailyQuiz(quiz.id, guestKey, payload);
      setResult(res);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not submit the quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="bg-gradient-to-b from-amber-50 via-amber-50/40 to-slate-50 border-b border-slate-200/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Daily Speed Dispatch
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Daily Quiz</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">High-yield aptitude & awareness questions, published fresh every day.</p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>
        ) : notFound || !quiz ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No quiz published for this date</h3>
            <p className="text-xs text-slate-500 mt-1">Check back tomorrow, or browse the archive below.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
              <div>
                <span className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider block">{quiz.quizDate}</span>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">{quiz.title}</h2>
                {quiz.description && <p className="text-xs text-slate-500 mt-1">{quiz.description}</p>}
              </div>
              {result ? (
                <div className="sm:text-right bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold tracking-wider">Your Score</span>
                  <span className="text-xl font-mono font-black text-emerald-700">{result.correctCount}/{result.totalQuestions} ({result.scorePercent}%)</span>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> <span>{quiz.questions.length} Questions</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {(result ? result.questions : quiz.questions).map((q, idx) => {
                const isResultView = !!result;
                const resultQ = isResultView ? (q as typeof result.questions[number]) : null;
                const liveQ = !isResultView ? (q as typeof quiz.questions[number]) : null;
                const selected = isResultView ? resultQ!.selectedOption : answers[liveQ!.id];
                const options: [string, string][] = isResultView
                  ? [['A', resultQ!.optionA], ['B', resultQ!.optionB], ['C', resultQ!.optionC], ['D', resultQ!.optionD]]
                  : [['A', liveQ!.optionA], ['B', liveQ!.optionB], ['C', liveQ!.optionC], ['D', liveQ!.optionD]];

                return (
                  <div key={isResultView ? resultQ!.questionId : liveQ!.id} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg shrink-0">Q{idx + 1}</span>
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {isResultView ? resultQ!.questionText : liveQ!.questionText}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {options.map(([letter, text]) => {
                        let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50';
                        if (isResultView) {
                          if (letter === resultQ!.correctOption) btnStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm';
                          else if (letter === selected) btnStyle = 'bg-slate-200 border-slate-300 text-slate-600 line-through';
                        } else if (selected === letter) {
                          btnStyle = 'bg-slate-900 text-white border-slate-900 font-bold';
                        }
                        return (
                          <button
                            key={letter}
                            disabled={isResultView}
                            onClick={() => liveQ && handleSelect(liveQ.id, letter)}
                            className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                          >
                            <span>{text}</span>
                            {isResultView && letter === resultQ!.correctOption && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-1" />}
                            {isResultView && letter === selected && letter !== resultQ!.correctOption && <XCircle className="w-4 h-4 text-slate-500 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>

                    {isResultView && resultQ!.explanation && (
                      <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                        <span className="font-bold text-emerald-700 block mb-0.5 uppercase text-[10px] tracking-wider">Explanation:</span>
                        {resultQ!.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3">{errorMessage}</div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              {result ? (
                <span className="text-xs font-semibold text-slate-500">Come back tomorrow for a fresh set of questions.</span>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit & Evaluate
                </button>
              )}
            </div>
          </div>
        )}

        {dates.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Archive
            </h3>
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => navigate(`/daily-quiz/${d}`)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    (date ?? dates[0]) === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
