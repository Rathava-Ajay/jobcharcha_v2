import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Crown,
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10">
      <div>
        {/* One dark membership strip: pitch + role switch on the left, compact pass cards on the right */}
        <div className="relative overflow-hidden rounded-3xl text-white p-4 sm:p-6 bg-[radial-gradient(520px_260px_at_100%_0%,rgba(99,102,241,0.45),transparent_65%),radial-gradient(420px_240px_at_0%_100%,rgba(245,158,11,0.18),transparent_65%),linear-gradient(135deg,#0b1430,#172554_60%,#1e3a8a)]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5" /> JobCharcha Pro
              </span>
              <h2 className="mt-2.5 text-[22px] sm:text-[26px] leading-tight font-extrabold tracking-tight">
                {activeRole === 'aspirant' ? 'Practise like the real exam.' : 'Hire verified candidates faster.'}
              </h2>
              <p className="mt-1.5 text-[13px] text-blue-100/80">
                {activeRole === 'aspirant' ? 'Unlock every paid mock test with one simple pass.' : 'Post jobs and unlock candidate contacts.'} No hidden fees · UPI, cards & net banking via Razorpay.
              </p>
              <div role="tablist" className="mt-4 inline-flex rounded-xl bg-white/10 border border-white/15 p-1 text-[13px] font-bold">
                {(['aspirant', 'employer'] as const).map((r) => (
                  <button key={r} type="button" role="tab" aria-selected={activeRole === r} onClick={() => setActiveRole(r)}
                    className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors ${activeRole === r ? 'bg-white text-slate-900' : 'text-blue-100 hover:text-white'}`}>
                    {r === 'aspirant' ? 'For aspirants' : 'For employers'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              {activeRole === 'aspirant' && aspirantPlans.slice(0, 2).map((plan, idx) => (
                <PassCard
                  key={plan.id}
                  highlight={idx === 0}
                  badge={plan.unlocksAllTests ? 'All tests unlocked' : undefined}
                  name={plan.name}
                  price={plan.price}
                  days={plan.durationDays}
                  features={(plan.description ?? '').split(/\n|\.\s+/).map((f) => f.trim().replace(/\.$/, '')).filter(Boolean)}
                  onBuy={() => handleAspirantCheckout(plan)}
                />
              ))}
              {activeRole === 'employer' && employerPlans.slice(0, 2).map((plan, idx) => (
                <PassCard
                  key={plan.id}
                  highlight={idx === 0}
                  badge={plan.isUnlimitedCredits ? 'Unlimited credits' : undefined}
                  name={plan.name}
                  price={plan.price}
                  days={plan.durationDays}
                  features={[
                    `${plan.isUnlimitedCredits ? 'Unlimited' : plan.includedCredits} candidate contact credits`,
                    `Up to ${plan.maxActiveJobs} active job postings`,
                    ...(plan.maxFeaturedJobs > 0 ? [`${plan.maxFeaturedJobs} featured job slot${plan.maxFeaturedJobs === 1 ? '' : 's'}`] : []),
                    ...(plan.description ? [plan.description] : []),
                  ]}
                  onBuy={() => handleEmployerCheckout(plan)}
                />
              ))}
              {/* A single plan: use the free column to spell out what the pass includes */}
              {(activeRole === 'aspirant' ? aspirantPlans.length : employerPlans.length) === 1 && (
                <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 min-w-0">
                  <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-blue-200">What you get</p>
                  <ul className="mt-2.5 space-y-2 text-[13px] text-blue-50/90">
                    {(activeRole === 'aspirant'
                      ? ['Real exam pattern with rank & analysis', 'Instant score with answer explanations', 'Practise anytime on mobile or desktop', 'One-time payment — no auto-renewal']
                      : ['Reach active job seekers in Gujarat', 'Unlock verified candidate contacts', 'Manage postings from your dashboard', 'One-time payment — no auto-renewal']
                    ).map((f) => (
                      <li key={f} className="flex gap-2"><Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((activeRole === 'aspirant' && aspirantPlans.length === 0) || (activeRole === 'employer' && employerPlans.length === 0)) && (
                <p className="sm:col-span-2 rounded-2xl border border-dashed border-white/25 px-4 py-8 text-center text-sm text-blue-100/80">
                  {(activeRole === 'aspirant' ? aspirantPlansLoading : employerPlansLoading) ? 'Loading plans…' : 'No plans available right now — please check back soon.'}
                </p>
              )}
            </div>
          </div>
        </div>

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

/** Compact "pass" card used inside the Pro strip. Shows at most three features so cards stay short. */
const PassCard: React.FC<{
  highlight: boolean;
  badge?: string;
  name: string;
  price: number;
  days: number;
  features: string[];
  onBuy: () => void;
}> = ({ highlight, badge, name, price, days, features, onBuy }) => (
  <div className={`relative min-w-0 rounded-2xl p-4 flex flex-col gap-3 ${highlight ? 'bg-white text-slate-900 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]' : 'bg-white/[0.07] border border-white/15 text-white'}`}>
    <div className="flex items-start justify-between gap-2 min-w-0">
      <h3 className="font-extrabold text-[15px] leading-snug line-clamp-2 break-words">{name}</h3>
      {badge && <span className="shrink-0 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold uppercase px-2 py-0.5 whitespace-nowrap">{badge}</span>}
    </div>
    <p className="flex items-baseline gap-1">
      <span className="text-[28px] leading-none font-black tracking-tight">₹{price.toLocaleString('en-IN')}</span>
      <span className={`text-[13px] font-semibold ${highlight ? 'text-slate-500' : 'text-blue-100/80'}`}>/ {days} days</span>
    </p>
    {features.length > 0 && (
      <ul className="space-y-1 text-[12.5px]">
        {features.slice(0, 3).map((f) => (
          <li key={f} className="flex gap-1.5 min-w-0">
            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${highlight ? 'text-emerald-600' : 'text-emerald-300'}`} />
            <span className={`line-clamp-2 break-words ${highlight ? 'text-slate-600' : 'text-blue-50/90'}`}>{f}</span>
          </li>
        ))}
      </ul>
    )}
    <button type="button" onClick={onBuy}
      className={`mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold cursor-pointer transition-colors ${highlight ? 'bg-amber-400 hover:bg-amber-300 text-slate-900' : 'bg-white/10 hover:bg-white/20 border border-white/25 text-white'}`}>
      <CreditCard className="w-4 h-4" /> Upgrade now
    </button>
  </div>
);
