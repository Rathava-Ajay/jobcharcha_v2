import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { unsubscribeAlerts } from '../api/alerts';

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    unsubscribeAlerts(token)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
      {status === 'loading' && <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />}

      {status === 'done' && (
        <>
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">You've been unsubscribed</h1>
          <p className="text-sm text-slate-500 max-w-md">You won't receive any more job alert emails. You can re-subscribe anytime.</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">Link invalid or expired</h1>
          <p className="text-sm text-slate-500 max-w-md">This unsubscribe link is no longer valid.</p>
        </>
      )}

      <Link to="/job-alerts" className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">Manage Job Alerts</Link>
    </div>
  );
}
