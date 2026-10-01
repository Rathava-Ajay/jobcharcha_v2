import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, User, Building2, UserCheck, Mail, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AcknowledgmentCheckbox } from '../components/employer/AcknowledgmentCheckbox';
import { AuthLayout } from '../components/AuthLayout';

type Role = 'aspirant' | 'employer' | 'admin';

const ROLE_TILES: { id: Role; label: string; icon: React.ElementType; blurb: string }[] = [
  { id: 'aspirant', label: 'Aspirant', icon: User, blurb: 'Browse jobs, take mock tests, track applications' },
  { id: 'employer', label: 'Employer', icon: Building2, blurb: 'Post vacancies & manage applicants' },
  { id: 'admin', label: 'Admin', icon: UserCheck, blurb: 'Manage the portal & content' },
];

const ATTRIBUTION_KEY = 'jobcharcha.signup_attribution';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const deepLinkRole = searchParams.get('role');
  const deepLinkIsRole = deepLinkRole === 'aspirant' || deepLinkRole === 'employer';
  const deepLinkRegister = deepLinkIsRole && searchParams.get('mode') === 'register';

  const [step, setStep] = useState<'role' | 'form'>(deepLinkIsRole ? 'form' : 'role');
  const [role, setRole] = useState<Role>(deepLinkIsRole ? (deepLinkRole as Role) : 'aspirant');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(deepLinkRegister ? 'register' : 'login');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [acknowledgedTerms, setAcknowledgedTerms] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from;

  // Capture campaign attribution from the join deep link once, and keep it across the
  // role/mode toggles + refreshes until the account is actually created.
  useEffect(() => {
    const source = searchParams.get('ref') || searchParams.get('utm_source');
    const campaign = searchParams.get('utm_campaign');
    if (source || campaign) {
      try {
        sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ source: source || undefined, campaign: campaign || undefined }));
      } catch { /* private mode / storage disabled */ }
    }
  }, [searchParams]);

  const goToDashboard = (userRole: string) => {
    const target = redirectTo || `/dashboard/${userRole === 'superadmin' ? 'admin' : userRole}`;
    navigate(target, { replace: true });
  };

  const handleSelectRole = (r: Role) => {
    setRole(r);
    setStep('form');
    setMode('login');
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await login({ email, password, role: role as 'aspirant' | 'employer' | 'admin' });
        goToDashboard(user.role);
      } else if (mode === 'register') {
        let attribution: { source?: string; campaign?: string } = {};
        try { attribution = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}'); } catch { /* ignore */ }
        const user = await register({
          firstName, lastName, email, password,
          role: role as 'aspirant' | 'employer',
          companyName: role === 'employer' ? companyName : undefined,
          acknowledgedTerms: role === 'employer' ? acknowledgedTerms : undefined,
          source: attribution.source,
          campaign: attribution.campaign,
        });
        try { sessionStorage.removeItem(ATTRIBUTION_KEY); } catch { /* ignore */ }
        goToDashboard(user.role);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { forgotPassword } = await import('../api/auth');
      await forgotPassword(email);
      setInfo('If an account exists for this email, a reset code has been sent. Enter it below along with your new password.');
      setMode('reset');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { resetPassword } = await import('../api/auth');
      await resetPassword(email, resetToken.trim(), newPassword);
      setResetToken('');
      setNewPassword('');
      setMode('login');
      setPassword('');
      setInfo('Password reset successfully. Sign in with your new password.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password. Check your code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {step === 'role' ? 'Sign in to JobCharcha' : mode === 'register' ? `Join as ${role}` : mode === 'forgot' || mode === 'reset' ? 'Reset Password' : `${role[0].toUpperCase()}${role.slice(1)} Login`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'role' ? 'Choose how you want to access the portal.' : 'Access job alerts, CBT tests, and your dashboard.'}
          </p>
        </div>

        {step === 'role' ? (
          <div className="grid grid-cols-1 gap-2.5">
            {ROLE_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleSelectRole(tile.id)}
                  className="flex items-center text-left gap-3.5 p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors group cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"><Icon className="w-5 h-5" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold text-slate-900">{tile.label}</span>
                    <span className="block text-[13px] text-slate-500">{tile.blurb}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <button
              onClick={() => setStep('role')}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Change role
            </button>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5 mb-4">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl px-3 py-2.5 mb-4">
                {info}
              </div>
            )}

            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md cursor-pointer">
                  {submitting ? 'Sending…' : 'Send Password Reset Code'}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setMode('login')} className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer">
                    ← Back to Login
                  </button>
                </div>
              </form>
            ) : mode === 'reset' ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reset Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text" required value={resetToken} onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste the code emailed to you"
                      autoComplete="one-time-code"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow active:scale-95 cursor-pointer">
                  {submitting ? 'Resetting…' : 'Reset Password'}
                </button>
                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => setMode('forgot')} className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold cursor-pointer">
                    Didn't get a code? Resend
                  </button>
                  <button type="button" onClick={() => setMode('login')} className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer">
                    ← Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">First Name</label>
                      <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ajay"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Last Name</label>
                      <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                        placeholder="Rathava"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                  </div>
                )}

                {mode === 'register' && role === 'employer' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Company / Organization Name</label>
                    <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. EdTech Solutions"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    {mode === 'login' && role !== 'admin' && (
                      <button type="button" onClick={() => setMode('forgot')} className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer">
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                  </div>
                </div>

                {mode === 'register' && role === 'employer' && (
                  <AcknowledgmentCheckbox checked={acknowledgedTerms} onChange={setAcknowledgedTerms} />
                )}

                <button
                  type="submit"
                  disabled={submitting || (mode === 'register' && role === 'employer' && !acknowledgedTerms)}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all cursor-pointer mt-2 flex items-center justify-center gap-2">
                  <span>{submitting ? 'Please wait…' : mode === 'login' ? `Sign In as ${role.toUpperCase()}` : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {role !== 'admin' && mode !== 'forgot' && mode !== 'reset' && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                {mode === 'login' ? (
                  <>
                    <span className="text-slate-500">Don't have an account?</span>
                    <button type="button" onClick={() => setMode('register')} className="font-bold text-emerald-700 hover:underline cursor-pointer">
                      Register Free
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">Already registered?</span>
                    <button type="button" onClick={() => setMode('login')} className="font-bold text-emerald-700 hover:underline cursor-pointer">
                      Sign In Instead
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
    </AuthLayout>
  );
}
