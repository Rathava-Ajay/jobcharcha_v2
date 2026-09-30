import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, ShieldCheck, Sparkles, XCircle, RotateCcw } from 'lucide-react';
import { getPaymentHistory, ApiPaymentHistory } from '../api/payments';

const statusStyle: Record<string, string> = {
  Paid: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Pending: 'bg-amber-50 border-amber-200 text-amber-800',
  Failed: 'bg-red-50 border-red-200 text-red-700',
  Refunded: 'bg-slate-100 border-slate-200 text-slate-600',
};

export const PaymentHistorySection: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ApiPaymentHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentHistory().then(setHistory).catch(() => setHistory(null)).finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-2">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Payments & Subscription</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Payment History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {history?.payments.length ? `${history.payments.length} transactions` : 'Your plan purchases and single-test unlocks will appear here.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/#pricing-section')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> View Plans
          </button>
        </div>

        {history?.activeSubscription && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">Active Plan: {history.activeSubscription.planName}</h3>
              <p className="text-xs text-emerald-700">Unlocks all premium mock tests until {new Date(history.activeSubscription.expiresAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : !history || history.payments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No payments yet</h3>
            <p className="text-xs text-slate-500 mt-1">Unlock a premium plan or a single mock test to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.payments.map((p) => (
              <div
                key={p.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-md">
                      {p.paymentFor}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusStyle[p.status] || 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      {p.status === 'Failed' && <XCircle className="w-3 h-3" />}
                      {p.status === 'Pending' && <RotateCcw className="w-3 h-3" />}
                      {p.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 text-base truncate">{p.planName || p.testTitle || 'JobCharcha Purchase'}</h3>
                  <p className="text-xs text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()} {p.razorpayPaymentId ? `· ${p.razorpayPaymentId}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount</span>
                  <span className="font-black text-slate-900">₹{p.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
