import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, Trophy, ListChecks, RotateCcw, Lock, Sparkles } from 'lucide-react';
import { ApiAttemptResult } from '../api/tests';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

type ContentLang = 'en' | 'gu';
const pick = (lang: ContentLang, en: string, gu?: string | null): string =>
  lang === 'gu' && gu && gu.trim() ? gu : en;

interface AttemptResultViewProps {
  result: ApiAttemptResult;
  onRetake?: () => void;
  onBack: () => void;
  backLabel: string;
  /** When 'gu', question review renders Gujarati text where a translation exists. */
  contentLang?: ContentLang;
}

export const AttemptResultView: React.FC<AttemptResultViewProps> = ({ result, onRetake, onBack, backLabel, contentLang: contentLangProp }) => {
  const contentLang: ContentLang = contentLangProp ?? 'en';
  const [reviewingAnswers, setReviewingAnswers] = useState(false);
  const navigate = useNavigate();
  const gu = contentLang === 'gu';

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
      <div className="bg-slate-900 shadow-lg text-white rounded-3xl p-6 sm:p-8 text-center mb-6">
        <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-7 h-7" />
        </div>
        <span className={`text-[11px] uppercase font-bold text-slate-400 ${gu ? 'lang-gu lang-gu-tight' : ''}`}>
          Scorecard · {pick(contentLang, result.testTitle, result.testTitleGu)}
        </span>
        <h1 className="text-3xl sm:text-4xl font-heading font-black mt-1 tabular-nums">{result.score} / {result.maxScore}</h1>
        <p className="text-xs text-slate-300 mt-1">
          Accuracy: {result.accuracyPercent}%{' '}
          {result.analyticsLocked ? (
            <button
              onClick={() => navigate('/#pricing-section')}
              className="inline-flex items-center gap-1 text-amber-300 font-bold hover:underline cursor-pointer"
            >
              · <Lock className="w-3 h-3" /> Rank &amp; Percentile <Sparkles className="w-3 h-3" /> Unlock with Premium
            </button>
          ) : (
            <>· Rank {result.allIndiaRank} of {result.totalAttempts} · Percentile {result.percentile}</>
          )}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="text-lg font-black block">{result.correctCount}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Correct</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <span className="text-lg font-black block">{result.wrongCount}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Wrong</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <MinusCircle className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <span className="text-lg font-black block">{result.unansweredCount}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Skipped</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setReviewingAnswers((v) => !v)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <ListChecks className="w-4 h-4" /> {reviewingAnswers ? 'Hide' : 'Review'} Answers
          </button>
          {onRetake && (
            <button
              onClick={onRetake}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Retake Test
            </button>
          )}
          <button
            onClick={onBack}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
          >
            {backLabel}
          </button>
        </div>
      </div>

      {reviewingAnswers && (
        <div className="space-y-4">
          {result.questions.map((q, idx) => {
            const isCorrect = q.selectedOption === q.correctOption;
            const isSkipped = !q.selectedOption;
            const optionTexts = gu
              ? [q.optionAGu || q.optionA, q.optionBGu || q.optionB, q.optionCGu || q.optionC, q.optionDGu || q.optionD]
              : [q.optionA, q.optionB, q.optionC, q.optionD];
            return (
              <div key={q.questionId} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className={`text-sm text-slate-900 ${gu ? 'lang-gu' : 'font-semibold leading-relaxed'}`}>
                    <span className="text-slate-400 font-mono mr-2">Q{idx + 1}.</span>
                    {pick(contentLang, q.questionText, q.questionTextGu)}
                  </p>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-md shrink-0 ${
                    isSkipped ? 'bg-slate-100 text-slate-500' : isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Wrong'}
                  </span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {OPTION_LETTERS.map((letter) => (
                    <div key={letter} className={`text-xs px-3 py-2 rounded-lg border flex items-start gap-2 ${
                      letter === q.correctOption ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' :
                      letter === q.selectedOption ? 'bg-red-50 border-red-300 text-red-800 font-bold' :
                      'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-mono shrink-0">{letter}.</span>
                      <span className={gu ? 'lang-gu' : ''}>{optionTexts[OPTION_LETTERS.indexOf(letter)]}</span>
                    </div>
                  ))}
                </div>
                {(gu ? (q.explanationGu || q.explanation) : q.explanation) && (
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">
                    <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider block mb-1">Explanation</span>
                    <span className={gu ? 'lang-gu' : ''}>{gu ? (q.explanationGu || q.explanation) : q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
