import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Layers,
  CreditCard,
  X,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { EmployerPlan } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPlans, ApiAspirantPlan } from '../api/plans';
import { getEmployerPlans } from '../api/employerBilling';
import { startRazorpayCheckout } from '../utils/razorpayCheckout';
import { startEmployerRazorpayCheckout } from '../utils/employerRazorpayCheckout';

interface PricingSectionProps {
  activeRole: 'aspirant' | 'employer';
  setActiveRole: (role: 'aspirant' | 'employer') => void;
}

type CheckoutStatus = 'idle' | 'processing' | 'success' | 'failed';

export const PricingSection: React.FC<PricingSectionProps> = ({
  activeRole,
  setActiveRole,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshProfile } = useAuth();

  const [aspirantPlans, setAspirantPlans] = useState<ApiAspirantPlan[]>([]);
  const [aspirantPlansLoading, setAspirantPlansLoading] = useState(true);
  const [selectedAspirantPlan, setSelectedAspirantPlan] = useState<ApiAspirantPlan | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('idle');
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const [employerPlans, setEmployerPlans] = useState<EmployerPlan[]>([]);
  const [employerPlansLoading, setEmployerPlansLoading] = useState(true);
  const [selectedEmployerPlan, setSelectedEmployerPlan] = useState<EmployerPlan | null>(null);
  const [employerCheckoutStatus, setEmployerCheckoutStatus] = useState<CheckoutStatus>('idle');
  const [employerCheckoutMessage, setEmployerCheckoutMessage] = useState<string | null>(null);

  useEffect(() => {
    getPlans().then(setAspirantPlans).catch(() => setAspirantPlans([])).finally(() => setAspirantPlansLoading(false));
    getEmployerPlans()
      .then((plans) => setEmployerPlans(plans.filter((p) => !p.isTopUp)))
      .catch(() => setEmployerPlans([]))
      .finally(() => setEmployerPlansLoading(false));
  }, []);

  const handleAspirantCheckout = (plan: ApiAspirantPlan) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/#pricing-section' } });
      return;
    }
    setSelectedAspirantPlan(plan);
    setCheckoutStatus('idle');
    setCheckoutMessage(null);
  };

  const runAspirantPayment = async () => {
    if (!selectedAspirantPlan) return;
    setCheckoutStatus('processing');
    const outcome = await startRazorpayCheckout(
      { paymentFor: 'Plan', planId: selectedAspirantPlan.id },
      { name: 'JobCharcha', description: selectedAspirantPlan.name, prefillName: user?.name, prefillEmail: user?.email },
    );

    if (outcome.status === 'success') {
      setCheckoutStatus('success');
      setCheckoutMessage(`Plan activated — unlocks all premium mock tests for ${selectedAspirantPlan.durationDays} days.`);
      refreshProfile().catch(() => {});
    } else if (outcome.status === 'failed') {
      setCheckoutStatus('failed');
      setCheckoutMessage(outcome.message);
    } else {
      setCheckoutStatus('idle');
    }
  };

  const closeAspirantModal = () => {
    setSelectedAspirantPlan(null);
    setCheckoutStatus('idle');
    setCheckoutMessage(null);
  };

  const handleEmployerCheckout = (plan: EmployerPlan) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/#pricing-section' } });
      return;
    }
    setSelectedEmployerPlan(plan);
    setEmployerCheckoutStatus('idle');
    setEmployerCheckoutMessage(null);
  };

  const runEmployerPayment = async () => {
    if (!selectedEmployerPlan) return;
    setEmployerCheckoutStatus('processing');
    const outcome = await startEmployerRazorpayCheckout('renew', selectedEmployerPlan.id, {
      name: 'JobCharcha', description: selectedEmployerPlan.name, prefillName: user?.name, prefillEmail: user?.email,
    });

    if (outcome.status === 'success') {
      setEmployerCheckoutStatus('success');
      setEmployerCheckoutMessage(`Plan activated — ${outcome.result.creditsGranted} contact credits added for ${selectedEmployerPlan.durationDays} days.`);
      refreshProfile().catch(() => {});
    } else if (outcome.status === 'failed') {
      setEmployerCheckoutStatus('failed');
      setEmployerCheckoutMessage(outcome.message);
    } else {
      setEmployerCheckoutStatus('idle');
    }
  };

  const closeEmployerModal = () => {
    setSelectedEmployerPlan(null);
    setEmployerCheckoutStatus('idle');
    setEmployerCheckoutMessage(null);
  };

  // Nothing to sell yet: don't leave an empty block on the home page.
  if (!aspirantPlansLoading && !employerPlansLoading && aspirantPlans.length === 0 && employerPlans.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 relative">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Transparent Subscription & Job Posting Plans</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Choose the Perfect Plan for Your Journey
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            No hidden fees. Instant access to 800+ CBT Mock Test Series or Employer Candidate Resume Unlocks.
          </p>

          {/* Role & Billing Toggles */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Role Switcher */}
            <div className="bg-slate-200/60 p-1 rounded-xl text-[13px] font-semibold flex items-center">
              <button
                onClick={() => setActiveRole('aspirant')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeRole === 'aspirant' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                For Job Aspirants
              </button>
              <button
                onClick={() => setActiveRole('employer')}
                className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeRole === 'employer' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                For Employers & Recruiters
              </button>
            </div>

          </div>
        </div>

        {/* Aspirant plans — real AspirantPlan data + Razorpay */}
        {activeRole === 'aspirant' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {aspirantPlans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`bg-white border rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative ${
                  idx === 0 ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-200'
                }`}
              >
                {plan.unlocksAllTests && (
                  <span className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                    All Tests Unlocked
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                    <span className="text-sm text-slate-500 font-semibold">/ {plan.durationDays} days</span>
                  </div>

                  {plan.description && (
                    <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                      {plan.description.split(/\n|\.\s+/).filter(Boolean).map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleAspirantCheckout(plan)}
                    className={`w-full text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      idx === 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Upgrade Plan Now</span>
                  </button>
                </div>
              </div>
            ))}
            {aspirantPlans.length === 0 && (
              <div className="col-span-full text-center text-sm text-slate-400 py-8 bg-white border border-dashed border-slate-200 rounded-2xl">
                {aspirantPlansLoading ? 'Loading plans…' : 'No subscription plans are available right now. Please check back soon.'}
              </div>
            )}
          </div>
        )}

        {/* Employer plans — real EmployerPlan catalog data + Razorpay */}
        {activeRole === 'employer' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {employerPlans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`bg-white border rounded-2xl p-6 sm:p-7 flex flex-col justify-between relative ${
                  idx === 0 ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-200'
                }`}
              >
                {plan.isUnlimitedCredits && (
                  <span className="absolute -top-3.5 right-6 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                    Unlimited Credits
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                    <span className="text-sm text-slate-500 font-semibold">/ {plan.durationDays} days</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    {plan.description && (
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>{plan.description}</span></li>
                    )}
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{plan.isUnlimitedCredits ? 'Unlimited' : plan.includedCredits} candidate contact credits</span>
                    </li>
                    <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>Up to {plan.maxActiveJobs} active job postings</span></li>
                    {plan.maxFeaturedJobs > 0 && (
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>{plan.maxFeaturedJobs} featured job slot{plan.maxFeaturedJobs === 1 ? '' : 's'}</span></li>
                    )}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleEmployerCheckout(plan)}
                    className={`w-full text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      idx === 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Upgrade Plan Now</span>
                  </button>
                </div>
              </div>
            ))}
            {employerPlans.length === 0 && (
              <div className="col-span-full text-center text-sm text-slate-400 py-8 bg-white border border-dashed border-slate-200 rounded-2xl">
                {employerPlansLoading ? 'Loading plans…' : 'No employer plans are available right now. Please check back soon.'}
              </div>
            )}
          </div>
        )}

        {/* Employer checkout — real Razorpay order/verify flow */}
        {selectedEmployerPlan && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-200">
              {employerCheckoutStatus !== 'processing' && (
                <button onClick={closeEmployerModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Razorpay Secure Checkout</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{selectedEmployerPlan.name}</h3>
                <p className="text-xs text-slate-500">
                  Total Amount: <span className="font-bold text-slate-900">₹{selectedEmployerPlan.price}</span>
                </p>
              </div>

              {employerCheckoutStatus === 'success' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-2">
                  <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-black text-sm">Payment Received Successfully!</div>
                  <div className="text-xs text-emerald-700">{employerCheckoutMessage}</div>
                  <button onClick={closeEmployerModal} className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer">Close</button>
                </div>
              ) : employerCheckoutStatus === 'failed' ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                  <div className="font-black text-sm">Payment Failed or Cancelled</div>
                  <div className="text-xs text-red-700">{employerCheckoutMessage}</div>
                  <button
                    onClick={runEmployerPayment}
                    className="mt-2 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Option</span>
                      <span className="font-bold text-slate-800">UPI / GPay / NetBanking / Cards</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold text-slate-800">{selectedEmployerPlan.durationDays} days</span>
                    </div>
                  </div>

                  <button
                    onClick={runEmployerPayment}
                    disabled={employerCheckoutStatus === 'processing'}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {employerCheckoutStatus === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Waiting for payment…
                      </>
                    ) : (
                      'Pay & Activate Plan'
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    256-Bit SSL Encrypted • Powered by Razorpay
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aspirant checkout — real Razorpay order/verify flow */}
        {selectedAspirantPlan && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-200">
              {checkoutStatus !== 'processing' && (
                <button onClick={closeAspirantModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Razorpay Secure Checkout</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{selectedAspirantPlan.name}</h3>
                <p className="text-xs text-slate-500">
                  Total Amount: <span className="font-bold text-slate-900">₹{selectedAspirantPlan.price}</span>
                </p>
              </div>

              {checkoutStatus === 'success' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-2">
                  <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-black text-sm">Payment Received Successfully!</div>
                  <div className="text-xs text-emerald-700">{checkoutMessage}</div>
                  <button onClick={closeAspirantModal} className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer">Close</button>
                </div>
              ) : checkoutStatus === 'failed' ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                  <div className="font-black text-sm">Payment Failed or Cancelled</div>
                  <div className="text-xs text-red-700">{checkoutMessage}</div>
                  <button
                    onClick={runAspirantPayment}
                    className="mt-2 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Option</span>
                      <span className="font-bold text-slate-800">UPI / GPay / NetBanking / Cards</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold text-slate-800">{selectedAspirantPlan.durationDays} days</span>
                    </div>
                  </div>

                  <button
                    onClick={runAspirantPayment}
                    disabled={checkoutStatus === 'processing'}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {checkoutStatus === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Waiting for payment…
                      </>
                    ) : (
                      'Pay & Activate Plan'
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    256-Bit SSL Encrypted • Powered by Razorpay
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
