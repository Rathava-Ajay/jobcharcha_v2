import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, Loader2, RotateCcw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getTodayQuiz, getQuizByDate, getAvailableQuizDates, getMyQuizAttempt, submitDailyQuiz, getOrCreateGuestKey,
  ApiDailyQuiz, ApiDailyQuizResult,
} from '../api/dailyQuiz';
import { ApiError } from '../api/client';
import { PageHeader, Card, Chip, Pill, EmptyState, btn, cx } from '../components/ui/kit';
import { fmtDate } from '../utils/dates';

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

  const total = quiz?.questions.length ?? 0;
  const answered = Object.keys(answers).length;
  const scoreTone = !result ? '' : result.scorePercent >= 70 ? 'text-emerald-700' : result.scorePercent >= 40 ? 'text-amber-700' : 'text-red-700';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <PageHeader
        title="Daily quiz"
        subtitle="10 quick questions every day — answers explained after you submit. No login needed."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Mock tests', to: '/mock-tests' }, { label: 'Daily quiz' }]}
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" role="status" aria-label="Loading quiz" /></div>
        ) : notFound || !quiz ? (
          <Card>
            <EmptyState title="No quiz published for this date" body="Check back tomorrow, or open an earlier quiz from the archive below." />
          </Card>
        ) : (
          <>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-700">{fmtDate(quiz.quizDate)}</span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{quiz.title}</h2>
                  {quiz.description && <p className="text-[13px] text-slate-500 mt-0.5">{quiz.description}</p>}
                </div>
                {result ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 sm:text-right shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Your score</span>
                    <span className={cx('text-2xl font-extrabold', scoreTone)}>{result.correctCount}/{result.totalQuestions}</span>
                    <span className="text-sm font-bold text-slate-500 ml-1.5">{result.scorePercent}%</span>
                  </div>
                ) : (
                  <span className="self-start sm:self-auto"><Pill tone="grey" icon={Clock}>{total} questions · ~{Math.max(3, Math.round(total / 2))} min</Pill></span>
                )}
              </div>
              {!result && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5"><span>Answered {answered} of {total}</span><span>{total ? Math.round((answered / total) * 100) : 0}%</span></div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} /></div>
                </div>
              )}
            </Card>

            <ol className="mt-4 space-y-3">
              {(result ? result.questions : quiz.questions).map((q, idx) => {
                const isResultView = !!result;
                const resultQ = isResultView ? (q as typeof result.questions[number]) : null;
                const liveQ = !isResultView ? (q as typeof quiz.questions[number]) : null;
                const selected = isResultView ? resultQ!.selectedOption : answers[liveQ!.id];
                const options: [string, string][] = isResultView
                  ? [['A', resultQ!.optionA], ['B', resultQ!.optionB], ['C', resultQ!.optionC], ['D', resultQ!.optionD]]
                  : [['A', liveQ!.optionA], ['B', liveQ!.optionB], ['C', liveQ!.optionC], ['D', liveQ!.optionD]];
                const topic = liveQ?.topic;

                return (
                  <li key={isResultView ? resultQ!.questionId : liveQ!.id}>
                    <Card className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-extrabold text-slate-400">Q{idx + 1}</span>
                        {topic && <Pill tone="violet">{topic}</Pill>}
                      </div>
                      <p className="text-[15.5px] sm:text-base font-semibold text-slate-900 leading-snug lang-gu-tight">
                        {isResultView ? resultQ!.questionText : liveQ!.questionText}
                      </p>
                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.map(([letter, text]) => {
                          const isCorrect = isResultView && letter === resultQ!.correctOption;
                          const isWrongPick = isResultView && letter === selected && !isCorrect;
                          const isPicked = !isResultView && selected === letter;
                          return (
                            <button
                              key={letter}
                              type="button"
                              disabled={isResultView}
                              onClick={() => liveQ && handleSelect(liveQ.id, letter)}
                              aria-pressed={isPicked}
                              className={cx(
                                'flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-3 text-left text-[14.5px] font-semibold transition-colors',
                                isCorrect ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                                  : isWrongPick ? 'border-red-500 bg-red-50 text-red-900'
                                    : isPicked ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 cursor-pointer',
                                isResultView && 'cursor-default',
                              )}
                            >
                              <span className={cx('w-7 h-7 rounded-lg grid place-items-center text-[13px] font-extrabold shrink-0',
                                isCorrect ? 'bg-emerald-600 text-white' : isWrongPick ? 'bg-red-600 text-white' : isPicked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                                {letter}
                              </span>
                              <span className="flex-1">{text}</span>
                              {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                              {isWrongPick && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {isResultView && resultQ!.explanation && (
                        <div className="mt-3 rounded-xl bg-blue-50 text-blue-950 px-3.5 py-3 text-[13.5px]">
                          <b>Why: </b>{resultQ!.explanation}
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>

            {errorMessage && <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm font-semibold rounded-xl p-3">{errorMessage}</div>}

            {result ? (
              <Card className="mt-4 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="flex-1 text-sm text-slate-600">Come back tomorrow for a fresh set — or keep going with a full mock test.</p>
                <Link to="/mock-tests" className={btn.primary}>Take a mock test</Link>
              </Card>
            ) : (
              <>
                <div className="hidden sm:flex justify-end mt-4">
                  <button type="button" onClick={handleSubmit} disabled={submitting || answered === 0} className={cx(btn.primary, 'px-6 py-3')}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit & see answers
                  </button>
                </div>
                <div className="h-20 sm:hidden" aria-hidden />
                <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-slate-600 pl-1">{answered}/{total} answered</span>
                  <button type="button" onClick={handleSubmit} disabled={submitting || answered === 0} className={cx(btn.primary, 'flex-1 h-12 text-[15px]')}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {dates.length > 0 && (
          <section className="mt-8">
            <h3 className="text-sm font-extrabold text-slate-800 mb-2.5 flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Earlier quizzes</h3>
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <Chip key={d} active={(date ?? dates[0]) === d} onClick={() => navigate(`/daily-quiz/${d}`)}>{fmtDate(d)}</Chip>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
