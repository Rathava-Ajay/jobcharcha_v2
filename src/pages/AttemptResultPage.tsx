import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AttemptResultView } from '../components/AttemptResultView';
import { useAuth } from '../context/AuthContext';
import { getAttemptResult, ApiAttemptResult } from '../api/tests';

export default function AttemptResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [result, setResult] = useState<ApiAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || authLoading || !isAuthenticated) return;
    setLoading(true);
    getAttemptResult(Number(id))
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, authLoading, isAuthenticated]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center">
          <LogIn className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-slate-900">Login to view this result</h1>
        <button
          onClick={() => navigate('/login', { state: { from: location.pathname } })}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer"
        >
          Login / Register
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
      ) : notFound || !result ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-xl font-heading font-extrabold text-slate-900">Result not available</h1>
          <p className="text-sm text-slate-500">This attempt may not exist, or hasn't been submitted yet.</p>
          <button onClick={() => navigate('/mock-tests')} className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Browse Mock Tests</button>
        </div>
      ) : (
        <AttemptResultView result={result} onBack={() => navigate('/dashboard/aspirant')} backLabel="Back to Dashboard" />
      )}
      <Footer />
    </div>
  );
}
