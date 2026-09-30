import React, { useEffect, useState } from 'react';
import { CreditCard, X, Check, AlertTriangle, Loader2, RotateCcw, CalendarClock, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmployerPlan, EmployerSubscriptionInfo, EmployerCreditsInfo, ContactHistoryItem, EmployerAcknowledgmentStatus } from '../../types';
import { getEmployerPlans, getSubscription, getCredits, getContactHistory, getAcknowledgmentStatus, acknowledgeTerms } from '../../api/employerBilling';
import { startEmployerRazorpayCheckout, EmployerCheckoutOutcome } from '../../utils/employerRazorpayCheckout';
import { AcknowledgmentCheckbox } from './AcknowledgmentCheckbox';

type CheckoutStatus = 'idle' | 'processing' | 'success' | 'failed';

const STATUS_LABEL: Record<string, string> = {
  success: 'Unlocked',
  blocked_expired: 'Blocked — plan expired',
  blocked_no_credits: 'Blocked — no credits',
  blocked_both: 'Blocked — expired & no credits',
};

export const EmployerBillingPanel: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<EmployerPlan[]>([]);
  const [subscription, setSubscription] = useState<EmployerSubscriptionInfo | null>(null);
  const [credits, setCredits] = useState<EmployerCreditsInfo | null>(null);
  const [history, setHistory] = useState<ContactHistoryItem[]>([]);
  const [ackStatus, setAckStatus] = useState<EmployerAcknowledgmentStatus | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<EmployerPlan | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('idle');
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getEmployerPlans(), getSubscription(), getCredits(), getContactHistory(1, 10), getAcknowledgmentStatus(),
    ]).then(([p, s, c, h, a]) => {
      setPlans(p);
      setSubscription(s);
      setCredits(c);
      setHistory(h.items);
      setAckStatus(a);
    }).finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const openCheckout = (plan: EmployerPlan) => {
    if (ackStatus && !ackStatus.hasAcknowledgedLatest) return;
    setSelectedPlan(plan);
    setCheckoutStatus('idle');
    setCheckoutMessage(null);
  };

  const closeCheckout = () => {
    setSelectedPlan(null);
    setCheckoutStatus('idle');
    setCheckoutMessage(null);
  };

  const runPayment = async () => {
    if (!selectedPlan) return;
    setCheckoutStatus('processing');
    const outcome: EmployerCheckoutOutcome = await startEmployerRazorpayCheckout(
      selectedPlan.isTopUp ? 'top-up' : 'renew', selectedPlan.id,
      { name: 'JobCharcha', description: selectedPlan.name, prefillName: user?.name, prefillEmail: user?.email },
    );

    if (outcome.status === 'success') {
      setCheckoutStatus('success');
      setCheckoutMessage(`${outcome.result.creditsGranted} contact credits added${outcome.result.isTopUp ? '' : ` — plan active for ${selectedPlan.durationDays} days`}.`);
      refreshProfile().catch(() => {});
      loadAll();
    } else if (outcome.status === 'failed') {
      setCheckoutStatus('failed');
      setCheckoutMessage(outcome.message);
    } else {
      setCheckoutStatus('idle');
    }
  };

  const handleAcknowledge = async () => {
    if (!ackStatus) return;
    await acknowledgeTerms(ackStatus.currentPlanVersion);
    const fresh = await getAcknowledgmentStatus();
    setAckStatus(fresh);
  };

  if (loading || !subscription || !credits || !ackStatus) {
    return <div className="bg-white rounded-3xl border border-slate-200 p-10 flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-600 animate-spin" /></div>;
  }

  const subscriptionPlans = plans.filter((p) => !p.isTopUp);
  const topUpPlans = plans.filter((p) => p.isTopUp);
  const usageRatio = credits.isUnlimited ? 1 : credits.totalCredits > 0 ? Math.max(0, credits.creditsRemaining / credits.totalCredits) : 0;

  return (
    <div className="space-y-6">
      {!ackStatus.hasAcknowledgedLatest && (
        <div className="bg-white rounded-3xl border border-amber-300 p-6 space-y-3">
          <p className="text-xs font-extrabold text-amber-800">Accept the updated employer terms to renew your plan or buy credits.</p>
          <AcknowledgmentCheckbox checked={ackChecked} onChange={setAckChecked} />
          <button
            onClick={handleAcknowledge}
            disabled={!ackChecked}
            className="bg-slate-900 disabled:opacity-40 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer"
          >
            Accept & Continue
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-400"><CalendarClock className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Current Plan</span></div>
          {subscription.status === 'none' || subscription.status === 'expired' ? (
            <p className="text-sm font-extrabold text-slate-900">No active plan</p>
          ) : (
            <>
              <p className="text-lg font-heading font-extrabold text-slate-900">{subscription.planName}</p>
              <p className="text-xs text-slate-500 font-semibold">
                {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? '' : 's'} remaining · expires {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-IN') : '—'}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-400"><Zap className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Contact Credits</span></div>
          {credits.isUnlimited ? (
            <p className="text-lg font-heading font-extrabold text-emerald-700">Unlimited</p>
          ) : (
            <>
              <p className="text-lg font-heading font-extrabold text-slate-900">{credits.creditsRemaining} / {credits.totalCredits}</p>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${usageRatio < 0.1 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.round(usageRatio * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <h3 className="text-lg font-heading font-extrabold text-slate-900">Renew or Upgrade Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
              <div>
                <p className="font-heading font-extrabold text-sm text-slate-900">{plan.name}</p>
                <p className="text-xl font-black text-slate-900 mt-1">₹{plan.price}<span className="text-[11px] text-slate-400 font-semibold"> / {plan.durationDays} days</span></p>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">{plan.isUnlimitedCredits ? 'Unlimited' : plan.includedCredits} contact credits · {plan.maxActiveJobs} active jobs</p>
              </div>
              <button onClick={() => openCheckout(plan)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer">Renew / Upgrade</button>
            </div>
          ))}
          {subscriptionPlans.length === 0 && <p className="text-xs text-slate-500 font-semibold col-span-full">No plans available yet.</p>}
        </div>

        {topUpPlans.length > 0 && (
          <>
            <h3 className="text-lg font-heading font-extrabold text-slate-900 pt-2">Buy Credit Top-ups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topUpPlans.map((plan) => (
                <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <p className="font-heading font-extrabold text-sm text-slate-900">{plan.name}</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{plan.price}</p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">+{plan.includedCredits} contact credits, no expiry tied to plan</p>
                  </div>
                  <button onClick={() => openCheckout(plan)} className="bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer">Buy Credits</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-heading font-extrabold text-slate-900">Recent Contact History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold">No contact attempts yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{h.candidateName}</p>
                  <p className="text-slate-400 font-semibold">{new Date(h.createdDate).toLocaleString('en-IN')}</p>
                </div>
                <span className={`font-extrabold ${h.status === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {STATUS_LABEL[h.status] || h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-200">
            {checkoutStatus !== 'processing' && (
              <button onClick={closeCheckout} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            )}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3"><CreditCard className="w-6 h-6" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Razorpay Secure Checkout</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{selectedPlan.name}</h3>
              <p className="text-xs text-slate-500">Total Amount: <span className="font-bold text-slate-900">₹{selectedPlan.price}</span></p>
            </div>

            {checkoutStatus === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-black text-sm">Payment Received Successfully!</div>
                <div className="text-xs text-emerald-700">{checkoutMessage}</div>
                <button onClick={closeCheckout} className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer">Close</button>
              </div>
            ) : checkoutStatus === 'failed' ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                <div className="font-black text-sm">Payment Failed or Cancelled</div>
                <div className="text-xs text-red-700">{checkoutMessage}</div>
                <button onClick={runPayment} className="mt-2 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={runPayment}
                  disabled={checkoutStatus === 'processing'}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {checkoutStatus === 'processing' ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for payment…</> : 'Pay & Activate'}
                </button>
                <p className="text-[10px] text-center text-slate-400">256-Bit SSL Encrypted • Powered by Razorpay</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
