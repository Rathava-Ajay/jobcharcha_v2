import React, { useEffect, useState } from 'react';
import {
  Clock,
  Download,
  Play,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ApiTestListItem } from '../api/tests';
import { ApiOldPaperListItem } from '../api/oldPapers';
import { getTodayQuiz, ApiDailyQuiz } from '../api/dailyQuiz';

interface MockTestsSectionProps {
  mockTests: ApiTestListItem[];
  oldPapers: ApiOldPaperListItem[];
  onStartFullMockTest: (test: ApiTestListItem) => void;
  onViewAllMockTests: () => void;
  onSelectOldPaper: (slug: string) => void;
  onViewAllOldPapers: () => void;
  onOpenDailyQuiz: () => void;
}

export const MockTestsSection: React.FC<MockTestsSectionProps> = ({
  mockTests,
  oldPapers,
  onStartFullMockTest,
  onViewAllMockTests,
  onSelectOldPaper,
  onViewAllOldPapers,
  onOpenDailyQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'quiz' | 'papers'>('quiz');
  const [todayQuiz, setTodayQuiz] = useState<ApiDailyQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(true);

  useEffect(() => {
    getTodayQuiz().then(setTodayQuiz).catch(() => setTodayQuiz(null)).finally(() => setQuizLoading(false));
  }, []);

  return (
    <section className="py-12 bg-gradient-to-b from-amber-50 via-amber-50/40 to-slate-50 border-t border-slate-200/80 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 -right-24 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Question Bank & CBT Exam Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Mock Tests, Daily Quizzes & Solved Archives
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Real CBT pattern test series, daily live speed quizzes, and official PDF question papers with answer keys.
            </p>
          </div>

          <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'quiz' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Daily Quiz
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'tests' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CBT Mock Tests ({mockTests.length})
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'papers' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Old Solved Papers ({oldPapers.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Daily Quiz Preview */}
        {activeTab === 'quiz' && (
          <div className="card-3d-static bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl mx-auto text-center">
            {quizLoading ? (
              <div className="py-10 text-xs font-semibold text-slate-400">Loading today's quiz…</div>
            ) : !todayQuiz ? (
              <div className="py-6">
                <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">No quiz published today</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">Check back soon, or browse the quiz archive.</p>
                <button
                  onClick={onOpenDailyQuiz}
                  className="btn-3d btn-3d-dark bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                >
                  Open Daily Quiz <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-4">
                <span className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider block mb-1">{todayQuiz.quizDate}</span>
                <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mb-2">{todayQuiz.title}</h3>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl mb-6">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {todayQuiz.questions.length} Questions
                </div>
                <div>
                  <button
                    onClick={onOpenDailyQuiz}
                    className="btn-3d btn-3d-emerald bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl cursor-pointer inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" /> Take Today's Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Mock Tests */}
        {activeTab === 'tests' && (
          <>
            {mockTests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">
                No mock tests published yet — check back soon.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mockTests.map((test) => (
                  <div key={test.id} className="card-3d card-3d-amber bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-md truncate">
                          {test.categoryName}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                          test.isFree ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {test.isFree ? 'Free Mock' : 'Pass Pro'}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-slate-900 text-lg leading-snug group-hover:text-emerald-700 transition-colors">{test.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{test.examName}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Questions</span>
                          <span className="font-bold text-slate-800">{test.totalQuestions}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Time</span>
                          <span className="font-bold text-slate-800">{test.durationMinutes}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Marks</span>
                          <span className="font-bold text-slate-800">{test.totalMarks}</span>
                        </div>
                      </div>

                      <div className="mt-3 text-xs font-medium text-slate-500">
                        <span>{test.attemptsCount.toLocaleString()} Candidates Attempted</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onStartFullMockTest(test)}
                        className="btn-3d btn-3d-emerald w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                        <span>Launch CBT Exam Test</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <button
                onClick={onViewAllMockTests}
                className="btn-3d btn-3d-dark bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold px-8 py-3.5 rounded-2xl cursor-pointer"
              >
                View All Mock Tests
              </button>
            </div>
          </>
        )}

        {/* Tab 3: Previous Year Papers */}
        {activeTab === 'papers' && (
          <>
            {oldPapers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">
                No old papers published yet — check back soon.
              </div>
            ) : (
              <div className="space-y-4">
                {oldPapers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => onSelectOldPaper(paper.slug)}
                    className="card-3d w-full text-left bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {paper.year} Paper
                        </span>
                        <span className="text-xs text-slate-500">{paper.examName}</span>
                      </div>
                      <h3 className="font-heading font-bold text-slate-900 text-lg">{paper.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official Question Paper PDF with verified Answer Key &middot; {paper.downloads.toLocaleString()} Downloads
                      </p>
                    </div>

                    <span className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 self-start md:self-auto shrink-0 transition-all">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>View & Download</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-8 flex justify-center">
              <button
                onClick={onViewAllOldPapers}
                className="btn-3d btn-3d-dark bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold px-8 py-3.5 rounded-2xl cursor-pointer"
              >
                View All Old Papers
              </button>
            </div>
          </>
        )}

      </div>
    </section>
  );
};
