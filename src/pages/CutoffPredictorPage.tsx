import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Loader2, TrendingUp, TrendingDown, Minus, Building2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  getCutOffExams, getCutOffPostNames, predictCutOff,
  ApiCutOffExamOption, ApiCutOffPrediction, CUTOFF_CATEGORIES,
} from '../api/cutoffPredictor';
import { ApiError } from '../api/client';

const TREND_STYLE: Record<string, { icon: React.ElementType; className: string }> = {
  Rising: { icon: TrendingUp, className: 'text-rose-700 bg-rose-50 border-rose-200' },
  Falling: { icon: TrendingDown, className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  Stable: { icon: Minus, className: 'text-slate-700 bg-slate-100 border-slate-200' },
};

export default function CutoffPredictorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug');

  const [exams, setExams] = useState<ApiCutOffExamOption[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [postNames, setPostNames] = useState<string[]>([]);
  const [selectedPostName, setSelectedPostName] = useState('');
  const [category, setCategory] = useState<string>('General');

  const [prediction, setPrediction] = useState<ApiCutOffPrediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Cutoff Predictor | JobCharcha';
    getCutOffExams().then((data) => {
      setExams(data);
      const preselect = (initialSlug && data.some((e) => e.slug === initialSlug)) ? initialSlug : data[0]?.slug;
      if (preselect) setSelectedSlug(preselect);
    })
      .catch(() => setExams([]))
      .finally(() => setExamsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSlug) { setPostNames([]); return; }
    setPrediction(null);
    getCutOffPostNames(selectedSlug)
      .then((names) => { setPostNames(names); setSelectedPostName(names[0] || ''); })
      .catch(() => setPostNames([]));
  }, [selectedSlug]);

  const selectedExam = exams.find((e) => e.slug === selectedSlug);

  const handlePredict = async () => {
    if (!selectedSlug || !selectedPostName) return;
    setPredicting(true);
    setErrorMessage(null);
    setPrediction(null);
    try {
      const result = await predictCutOff(selectedSlug, selectedPostName, category);
      setPrediction(result);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not generate a prediction.');
    } finally {
      setPredicting(false);
    }
  };

  const trendMeta = prediction ? TREND_STYLE[prediction.trend] : null;
  const TrendIcon = trendMeta?.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Calculator className="w-3.5 h-3.5" /> Historical Cutoff Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Cutoff Predictor</h1>
          <p className="text-[13px] sm:text-sm text-slate-500">
            Category-wise historical cutoffs and a next-year trend estimate, computed from verified past results.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        {examsLoading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No cutoff data published yet</h3>
            <p className="text-xs text-slate-500 mt-1">Check back once historical cutoffs are added for your exam.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Exam</label>
                  <select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    {exams.map((e) => <option key={e.slug} value={e.slug}>{e.examName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Post</label>
                  <select
                    value={selectedPostName}
                    onChange={(e) => setSelectedPostName(e.target.value)}
                    disabled={postNames.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {postNames.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    {CUTOFF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {selectedExam && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {selectedExam.organizationName} &middot; {selectedExam.recordCount} historical record{selectedExam.recordCount === 1 ? '' : 's'}
                </p>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3">{errorMessage}</div>
              )}

              <button
                onClick={handlePredict}
                disabled={predicting || !selectedPostName}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {predicting && <Loader2 className="w-4 h-4 animate-spin" />}
                Predict Next-Year Cutoff
              </button>
            </div>

            {prediction && (
              <div className="mt-6 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">{prediction.examName} &middot; {prediction.postName} &middot; {prediction.category}</span>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Predicted {prediction.predictedYear} Cutoff</span>
                    <span className="text-3xl sm:text-4xl font-heading font-black">{prediction.predictedCutOff}</span>
                  </div>
                  {trendMeta && TrendIcon && (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${trendMeta.className}`}>
                      <TrendIcon className="w-3.5 h-3.5" /> {prediction.trend}
                    </span>
                  )}
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300">
                    {prediction.confidence} Confidence
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">Historical Cutoffs</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {prediction.historicalPoints.map((p) => (
                      <div key={p.year} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-slate-400 block font-bold">{p.year}</span>
                        <span className="text-sm font-mono font-bold">{p.cutOff}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-4">
                  Estimate only, based on a simple year-over-year trend across {prediction.historicalPoints.length} year(s) of verified data — not an official cutoff.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
