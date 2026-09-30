import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, Plus, X, Sparkles, BookOpen, AlertCircle, ChevronRight, FileText } from 'lucide-react';

interface SavedExam {
  id: string;
  name: string;
  category: string;
  examDate: string; // ISO date format YYYY-MM-DD or full date string
  status: 'Admit Card Released' | 'Form Submitted' | 'Upcoming Exam';
  syllabusProgress: number; // 0 - 100
  targetScore: number;
}

const DEFAULT_SAVED_EXAMS: SavedExam[] = [
  {
    id: 'e-1',
    name: 'SSC CGL Tier-II Computer Based Test',
    category: 'SSC',
    examDate: '2026-08-28T09:00:00',
    status: 'Admit Card Released',
    syllabusProgress: 85,
    targetScore: 320,
  },
  {
    id: 'e-2',
    name: 'UPSC Civil Services Prelims 2026',
    category: 'UPSC',
    examDate: '2026-09-28T09:30:00',
    status: 'Form Submitted',
    syllabusProgress: 70,
    targetScore: 110,
  },
  {
    id: 'e-3',
    name: 'IBPS PO XVI Mains Examination',
    category: 'Banking',
    examDate: '2026-10-15T08:30:00',
    status: 'Upcoming Exam',
    syllabusProgress: 60,
    targetScore: 105,
  },
];

interface ExamTrackerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMockTest?: () => void;
}

export const ExamTrackerSidebar: React.FC<ExamTrackerSidebarProps> = ({ isOpen, onClose, onOpenMockTest }) => {
  const [exams, setExams] = useState<SavedExam[]>(DEFAULT_SAVED_EXAMS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New exam form state
  const [newExamName, setNewExamName] = useState('');
  const [newExamCategory, setNewExamCategory] = useState('SSC');
  const [newExamDate, setNewExamDate] = useState('2026-10-31');
  const [newTargetScore, setNewTargetScore] = useState(150);

  // Live timer tick state
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateCountdown = (targetDateStr: string) => {
    const target = new Date(targetDateStr).getTime();
    const current = now.getTime();
    const diff = target - current;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isPast: false };
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName) return;

    const newExam: SavedExam = {
      id: `custom-e-${Date.now()}`,
      name: newExamName,
      category: newExamCategory,
      examDate: `${newExamDate}T09:00:00`,
      status: 'Form Submitted',
      syllabusProgress: 50,
      targetScore: newTargetScore,
    };

    setExams([newExam, ...exams]);
    setNewExamName('');
    setShowAddModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-white">Personal Exam Tracker</h3>
              <p className="text-[11px] text-slate-300">Live countdowns & preparation metrics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exam List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Saved Exam Targets ({exams.length})
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Target
            </button>
          </div>

          {/* Add Exam Modal inline overlay */}
          {showAddModal && (
            <form onSubmit={handleAddExam} className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-md space-y-3 animate-in zoom-in-95">
              <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Add Custom Exam Target</span>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Exam Name (e.g. RRB NTPC Phase 1)"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Category</label>
                  <select
                    value={newExamCategory}
                    onChange={(e) => setNewExamCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800"
                  >
                    <option value="SSC">SSC</option>
                    <option value="UPSC">UPSC</option>
                    <option value="Banking">Banking</option>
                    <option value="Railways">Railways</option>
                    <option value="Defense">Defense</option>
                    <option value="State PSC">State PSC</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold text-xs py-2 rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                Save Exam Target
              </button>
            </form>
          )}

          {/* Exam Target Cards */}
          {exams.map((exam) => {
            const cd = calculateCountdown(exam.examDate);

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {exam.category}
                    </span>
                    <h4 className="font-heading font-extrabold text-sm text-slate-900 mt-1 leading-snug">
                      {exam.name}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    exam.status === 'Admit Card Released'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {exam.status}
                  </span>
                </div>

                {/* Countdown Timer Display */}
                <div className="bg-slate-900 text-white p-3 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Time Remaining</span>
                    <span className="text-emerald-400 font-mono">
                      {new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {cd.isPast ? (
                    <div className="text-xs font-bold text-amber-400">Exam Concluded / Ongoing</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="bg-slate-800/80 p-1.5 rounded-lg">
                        <span className="text-base font-mono font-black text-emerald-400 block">{cd.days}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Days</span>
                      </div>
                      <div className="bg-slate-800/80 p-1.5 rounded-lg">
                        <span className="text-base font-mono font-black text-white block">{cd.hours}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Hours</span>
                      </div>
                      <div className="bg-slate-800/80 p-1.5 rounded-lg">
                        <span className="text-base font-mono font-black text-white block">{cd.minutes}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Mins</span>
                      </div>
                      <div className="bg-slate-800/80 p-1.5 rounded-lg">
                        <span className="text-base font-mono font-black text-indigo-400 block">{cd.seconds}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Secs</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preparation progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Syllabus Completed</span>
                    <span className="font-bold text-slate-900">{exam.syllabusProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${exam.syllabusProgress}%` }}
                    />
                  </div>
                </div>

                {/* Quick actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">
                    Target: <strong className="text-slate-800">{exam.targetScore} Marks</strong>
                  </span>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenMockTest) onOpenMockTest();
                    }}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Take Practice Mock <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="p-4 bg-white border-t border-slate-200 text-center space-y-2">
          <button
            onClick={() => {
              onClose();
              if (onOpenMockTest) onOpenMockTest();
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Launch CBT Mock Test Series</span>
          </button>
          <p className="text-[10px] text-slate-400">Sync with Google Calendar for instant mobile reminders</p>
        </div>

      </div>
    </div>
  );
};
