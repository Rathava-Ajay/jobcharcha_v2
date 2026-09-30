import React from 'react';
import { FileText, Sparkles, Download, ListChecks, ArrowRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  {
    title: 'Mock Tests',
    description: 'Full-length CBT exams with instant scoring, rank and percentile.',
    icon: FileText,
    color: 'emerald',
    path: '/mock-tests',
  },
  {
    title: 'Daily Quiz',
    description: 'A fresh 5-question speed quiz published every day.',
    icon: Sparkles,
    color: 'amber',
    path: '/daily-quiz',
  },
  {
    title: 'Old Papers',
    description: 'Official previous-year question papers with answer keys.',
    icon: Download,
    color: 'indigo',
    path: '/old-papers',
  },
  {
    title: 'Practice Questions',
    description: 'Browse solved questions by exam, subject and topic.',
    icon: ListChecks,
    color: 'rose',
    path: '/practice-questions',
  },
] as const;

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-100',
};

export const LearningResourcesSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-md mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Learning Resources</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Prepare
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Mock tests, daily quizzes, previous-year papers and a solved question bank — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className="card-3d text-left bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-slate-300 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className={`icon-badge-3d w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 transition-colors ${COLOR_CLASSES[card.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-base mb-1">{card.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                </div>
                <span className="mt-4 text-xs font-bold text-slate-700 group-hover:text-slate-900 flex items-center gap-1">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
