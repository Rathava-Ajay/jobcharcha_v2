import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Trophy, PlayCircle, Sparkles } from 'lucide-react';
import { getMyAttempts, ApiAttemptHistoryItem } from '../api/tests';

export const MockTestHistorySection: React.FC = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<ApiAttemptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAttempts().then(setAttempts).catch(() => setAttempts([])).finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-2">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mock Test History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              My Mock Tests
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {attempts.length > 0 ? `${attempts.length} attempts recorded` : 'Your attempted and in-progress mock tests will appear here.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/mock-tests')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> Browse Mock Tests
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : attempts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No mock tests attempted yet</h3>
            <p className="text-xs text-slate-500 mt-1">Start a free mock test to see your scorecard here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => (
              <button
                key={a.attemptId}
                onClick={() => navigate(a.isCompleted ? `/attempts/${a.attemptId}/result` : `/mock-tests/${a.testSlug}`)}
                className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-md">
                      {a.categoryName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      a.isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      {a.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-base truncate">{a.testTitle}</h3>
                  <p className="text-xs text-slate-500">{a.examName} · Started {new Date(a.startedAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {a.isCompleted ? (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1 justify-end"><Trophy className="w-3 h-3" /> Score</span>
                      <span className="font-black text-slate-900">{a.score} / {a.maxScore}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1"><PlayCircle className="w-4 h-4" /> Resume</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
