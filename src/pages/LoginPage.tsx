import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, User, Building2, UserCheck, Mail, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AcknowledgmentCheckbox } from '../components/employer/AcknowledgmentCheckbox';

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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Aurora backdrop — layered radial washes so the empty space isn't a flat white void */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 14% 16%, rgba(16,185,129,0.42), transparent 60%),' +
            'radial-gradient(52% 52% at 90% 8%, rgba(56,189,248,0.34), transparent 60%),' +
            'radial-gradient(55% 60% at 82% 96%, rgba(217,70,239,0.30), transparent 60%),' +
            'radial-gradient(48% 48% at 22% 100%, rgba(129,140,248,0.34), transparent 60%),' +
            'radial-gradient(40% 40% at 50% 50%, rgba(16,185,129,0.14), transparent 70%)',
        }}
      />
      {/* Slow-drifting colour orbs */}
      <div className="auth-blob pointer-events-none absolute -top-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-emerald-500/40 blur-3xl" />
      <div className="auth-blob-slow pointer-events-none absolute -bottom-44 -right-24 h-[32rem] w-[32rem] rounded-full bg-sky-500/25 blur-3xl" />
      <div
        className="auth-blob pointer-events-none absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-fuchsia-500/25 blur-3xl"
        style={{ animationDelay: '-12s' }}
      />
      <div
        className="auth-blob-slow pointer-events-none absolute bottom-10 left-1/4 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
        style={{ animationDelay: '-8s' }}
      />
      {/* Faint grid, faded out toward the edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />
      {/* Vignette to seat the card */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.6)_100%)]" />

      <div className="relative z-10 bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.65)] ring-1 ring-white/10 border border-slate-200">

        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900">
            {step === 'role' ? 'Sign in to JobCharcha' : mode === 'register' ? `Join as ${role}` : mode === 'forgot' || mode === 'reset' ? 'Reset Password' : `${role[0].toUpperCase()}${role.slice(1)} Login`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'role' ? 'Choose how you want to access the portal.' : 'Access job alerts, CBT tests, and your dashboard.'}
          </p>
        </div>

        {step === 'role' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLE_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  onClick={() => handleSelectRole(tile.id)}
                  className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white transition-all group cursor-pointer"
                >
                  <Icon className="w-6 h-6 text-emerald-600 group-hover:text-emerald-400" />
                  <span className="text-xs font-extrabold">{tile.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300">{tile.blurb}</span>
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer">
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow active:scale-95 cursor-pointer">
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
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer mt-2 flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}
