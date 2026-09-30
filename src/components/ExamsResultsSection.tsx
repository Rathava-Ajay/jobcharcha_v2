import React, { useEffect, useState } from 'react';
import {
  Award,
  Download,
  Search,
  Calculator,
  CheckCircle2,
  Building2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { ApiAdmitCardListItem } from '../api/admitCards';
import { ApiResultListItem } from '../api/results';
import { getCutOffExams, ApiCutOffExamOption } from '../api/cutoffPredictor';

interface ExamsResultsSectionProps {
  admitCards: ApiAdmitCardListItem[];
  results: ApiResultListItem[];
  onSelectAdmitCard: (slug: string) => void;
  onSelectResult: (slug: string) => void;
  onViewAllAdmitCards: () => void;
  onViewAllResults: () => void;
  onOpenCutoffPredictor: (slug?: string) => void;
}

export const ExamsResultsSection: React.FC<ExamsResultsSectionProps> = ({
  admitCards,
  results,
  onSelectAdmitCard,
  onSelectResult,
  onViewAllAdmitCards,
  onViewAllResults,
  onOpenCutoffPredictor,
}) => {
  const [activeTab, setActiveTab] = useState<'admit' | 'results' | 'predictor'>('admit');
  const [searchTerm, setSearchTerm] = useState('');

  const [cutoffExams, setCutoffExams] = useState<ApiCutOffExamOption[]>([]);
  const [cutoffExamsLoading, setCutoffExamsLoading] = useState(true);

  useEffect(() => {
    getCutOffExams().then(setCutoffExams).catch(() => setCutoffExams([])).finally(() => setCutoffExamsLoading(false));
  }, []);

  const filteredAdmitCards = admitCards.filter((a) =>
    (a.examName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredResults = results.filter((r) =>
    (r.examName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="py-12 bg-gradient-to-b from-indigo-50 via-indigo-50/40 to-slate-50 border-t border-slate-200/80 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 -left-24 w-72 h-72 bg-violet-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-md mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Examination Intelligence & Merit</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Hall Tickets, Results & Cutoff Predictor
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Direct official download portals, verified result merit lists, and historical cutoff analytics.
            </p>
          </div>

          {/* Tab Selection */}
          <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 text-xs font-semibold self-start md:self-auto">
            <button
              onClick={() => setActiveTab('admit')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'admit' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admit Cards ({admitCards.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'results' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Results ({results.length})
            </button>
            <button
              onClick={() => setActiveTab('predictor')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'predictor' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-indigo-700 hover:bg-indigo-100/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Cutoff Predictor
            </button>
          </div>
        </div>

        {/* Tab 1: Admit Cards */}
        {activeTab === 'admit' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search hall ticket / admit card..."
                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button onClick={onViewAllAdmitCards} className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0">
                View all admit cards <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredAdmitCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500 font-semibold">No admit cards match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAdmitCards.map((ac) => (
                  <button
                    key={ac.id}
                    onClick={() => onSelectAdmitCard(ac.slug)}
                    className="card-3d card-3d-indigo text-left border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-white bg-slate-900 px-2.5 py-1 rounded-md truncate">
                          {ac.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                          ac.status === 'Released' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}>
                          {ac.status}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition-colors">{ac.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {ac.organizationName}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-700 pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Release Date</span>
                          <span className="font-bold text-slate-800">{ac.releaseDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Exam Date</span>
                          <span className="font-bold text-indigo-700">{ac.examDate || 'TBA'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Official Download Portal</span>
                      <span className="bg-indigo-600 group-hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-all shadow-md">
                        <Download className="w-3.5 h-3.5 text-white" />
                        Hall Ticket PDF
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Results & Historical Cutoffs */}
        {activeTab === 'results' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter official results & merit lists..."
                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 pl-10 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button onClick={onViewAllResults} className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0">
                View all results <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {filteredResults.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500 font-semibold">No results match your search.</div>
            ) : (
              <div className="space-y-6">
                {filteredResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => onSelectResult(res.slug)}
                    className="card-3d w-full text-left border border-slate-200/80 rounded-2xl p-6 group cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-slate-900 px-2 py-0.5 rounded">
                            {res.category} Official Result
                          </span>
                          <span className="text-xs text-slate-400">Published: {res.resultDate}</span>
                        </div>
                        <h3 className="font-heading font-bold text-slate-900 text-xl group-hover:text-emerald-700 transition-colors">{res.title}</h3>
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {res.organizationName}
                        </p>
                      </div>

                      <span className="bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 self-start md:self-auto shrink-0 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        View Full Result
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Cutoff Predictor Tool */}
        {activeTab === 'predictor' && (
          <div className="card-3d-dark text-white p-8 rounded-3xl border border-slate-800">
            <div className="max-w-3xl mx-auto">

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-3">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Historical Cutoff Analytics</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">Cutoff Predictor</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Category-wise historical cutoffs and a next-year trend estimate, computed from verified past results.
                </p>
              </div>

              {cutoffExamsLoading ? (
                <div className="py-10 text-center text-xs font-semibold text-slate-400">Loading cutoff data…</div>
              ) : cutoffExams.length === 0 ? (
                <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-8 text-center">
                  <p className="text-xs text-slate-400 mb-4">No historical cutoff data published yet — check back soon.</p>
                  <button
                    onClick={() => onOpenCutoffPredictor()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    Open Cutoff Predictor <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cutoffExams.slice(0, 5).map((exam) => (
                    <button
                      key={exam.slug}
                      onClick={() => onOpenCutoffPredictor(exam.slug)}
                      className="chip-3d-inset-dark w-full text-left bg-slate-800/80 hover:bg-slate-800 hover:-translate-y-0.5 rounded-2xl border border-slate-700 p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                    >
                      <div>
                        <h4 className="font-heading font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{exam.examName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{exam.organizationName} &middot; {exam.recordCount} year(s) of data</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                  <button
                    onClick={() => onOpenCutoffPredictor()}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <Calculator className="w-4 h-4" /> Open Full Cutoff Predictor
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
