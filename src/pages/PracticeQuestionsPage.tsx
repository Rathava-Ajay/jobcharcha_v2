import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ListChecks, Loader2, Search, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getPracticeExams, getPracticeSubjects, getPracticeTopics, searchPracticeQuestions,
  ApiPracticeExamOption, ApiPracticeQuestion,
} from '../api/practiceQuestions';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const PAGE_SIZE = 10;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function PracticeQuestionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exams, setExams] = useState<ApiPracticeExamOption[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [search, setSearch] = useState('');

  const [questions, setQuestions] = useState<ApiPracticeQuestion[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    document.title = 'Practice Question Bank | JobCharcha';
    getPracticeExams().then((data) => {
      setExams(data);
      if (data[0]) setSelectedExamId(data[0].examId);
    }).catch(() => setExams([])).finally(() => setExamsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExamId) { setSubjects([]); return; }
    setSelectedSubject('');
    getPracticeSubjects(selectedExamId).then(setSubjects).catch(() => setSubjects([]));
  }, [selectedExamId]);

  useEffect(() => {
    if (!selectedExamId) { setTopics([]); return; }
    setSelectedTopic('');
    getPracticeTopics(selectedExamId, selectedSubject || undefined).then(setTopics).catch(() => setTopics([]));
  }, [selectedExamId, selectedSubject]);

  useEffect(() => {
    if (!selectedExamId) return;
    setLoading(true);
    const handle = setTimeout(() => {
      searchPracticeQuestions({
        examId: selectedExamId,
        subject: selectedSubject || undefined,
        topic: selectedTopic || undefined,
        difficulty: difficulty !== 'All' ? difficulty : undefined,
        search: search.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((res) => {
          setQuestions(res.items);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
          setRevealed({});
        })
        .catch(() => { setQuestions([]); setTotalPages(0); setTotalCount(0); })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [selectedExamId, selectedSubject, selectedTopic, difficulty, search, page]);

  useEffect(() => { setPage(1); }, [selectedExamId, selectedSubject, selectedTopic, difficulty, search]);

  const toggleReveal = (id: number) => setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ListChecks className="w-3.5 h-3.5" /> Solved Question Bank
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Practice Questions</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">
            Browse previously solved questions by exam, subject and topic — reveal the answer to self-check.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {examsLoading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No practice questions published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back once question banks are added for your exam.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 sm:p-6 mb-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={selectedExamId ?? ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  {exams.map((e) => <option key={e.examId} value={e.examId}>{e.examName} ({e.questionCount})</option>)}
                </select>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={topics.length === 0}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer disabled:opacity-50"
                >
                  <option value="">All Topics</option>
                  {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search question text…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 pl-10 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center"><Loader2 className="w-7 h-7 text-emerald-600 animate-spin" /></div>
            ) : questions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">
                No questions match your filters.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const isRevealed = !!revealed[q.id];
                    const options: [string, string][] = [['A', q.optionA], ['B', q.optionB], ['C', q.optionC], ['D', q.optionD]];
                    return (
                      <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg shrink-0">
                              Q{(page - 1) * PAGE_SIZE + idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 leading-snug">{q.questionText}</p>
                              <p className="text-[11px] text-slate-400 mt-1">{q.subject}{q.topic ? ` · ${q.topic}` : ''} &middot; {q.difficulty}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleReveal(q.id)}
                            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {isRevealed ? 'Hide Answer' : 'Reveal Answer'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {options.map(([letter, text]) => (
                            <div
                              key={letter}
                              className={`p-3 rounded-xl border text-xs font-semibold ${
                                isRevealed && letter === q.correctOption
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {text}
                            </div>
                          ))}
                        </div>

                        {isRevealed && q.explanation && (
                          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                            <span className="font-bold text-emerald-700 block mb-0.5 uppercase text-[10px] tracking-wider">Explanation</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Page {page} of {totalPages} &middot; {totalCount.toLocaleString()} questions</span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="bg-white border border-slate-200 disabled:opacity-40 px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="bg-white border border-slate-200 disabled:opacity-40 px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
