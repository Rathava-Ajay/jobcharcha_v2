import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { User, Building2, ShieldCheck, Mail, KeyRound, ArrowRight, ArrowLeft, Eye, EyeOff, UserRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AcknowledgmentCheckbox } from '../components/employer/AcknowledgmentCheckbox';
import { AuthLayout } from '../components/AuthLayout';
import { trackSignUp } from '../utils/analytics';

type Role = 'aspirant' | 'employer' | 'admin';

const ROLE_TABS: { id: Exclude<Role, 'admin'>; label: string; icon: React.ElementType; blurb: string }[] = [
  { id: 'aspirant', label: 'Job seeker', icon: User, blurb: 'Jobs, alerts, mock tests & your applications' },
  { id: 'employer', label: 'Employer', icon: Building2, blurb: 'Post vacancies & manage applicants' },
];

const ATTRIBUTION_KEY = 'jobcharcha.signup_attribution';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const deepLinkRole = searchParams.get('role');
  const deepLinkIsRole = deepLinkRole === 'aspirant' || deepLinkRole === 'employer';
  const deepLinkRegister = deepLinkIsRole && searchParams.get('mode') === 'register';

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
  const [showPassword, setShowPassword] = useState(false);

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
    if (r === 'admin') setMode('login');
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
        trackSignUp(role as 'aspirant' | 'employer');
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

  const isAuthForm = mode === 'login' || mode === 'register';
  const heading = mode === 'forgot' || mode === 'reset'
    ? 'Reset your password'
    : role === 'admin' ? 'Admin sign in' : mode === 'register' ? 'Create your free account' : 'Welcome back 👋';
  const subheading = mode === 'forgot'
    ? "Enter your email and we'll send you a reset code."
    : mode === 'reset' ? 'Enter the code from your email and choose a new password.'
    : role === 'admin' ? 'Restricted to JobCharcha staff.'
    : mode === 'register' ? (role === 'employer' ? 'Post jobs and reach verified candidates.' : 'Save jobs, get alerts and practise for free.')
    : 'Sign in to your dashboard, saved jobs and tests.';

  return (
    <AuthLayout>
      <div className="mb-5">
        <h1 className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-slate-900">{heading}</h1>
        <p className="mt-1 text-[14px] text-slate-500">{subheading}</p>
      </div>

      {isAuthForm && role !== 'admin' && (
        <div role="tablist" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 mb-5">
          {ROLE_TABS.map((tab) => {
            const active = role === tab.id;
            return (
              <button key={tab.id} type="button" role="tab" aria-selected={active} onClick={() => handleSelectRole(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold cursor-pointer transition-all ${active ? 'bg-white text-blue-700 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)]' : 'text-slate-500 hover:text-slate-800'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>
      )}

      {role === 'admin' && isAuthForm && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 text-white p-3.5 mb-5">
          <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center shrink-0"><ShieldCheck className="w-5 h-5 text-amber-300" /></span>
          <span className="flex-1 min-w-0 text-[13px] text-slate-300">Admin area — sign in with your staff account.</span>
          <button type="button" onClick={() => handleSelectRole('aspirant')} className="shrink-0 text-[12.5px] font-bold text-white/90 hover:text-white underline-offset-2 hover:underline cursor-pointer">Not staff?</button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold rounded-xl px-3.5 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}
      {info && (
        <div role="status" className="flex gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold rounded-xl px-3.5 py-3 mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{info}
        </div>
      )}

      {mode === 'forgot' ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <Field label="Registered email address" icon={Mail}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className={INPUT} />
          </Field>
          <PrimaryButton disabled={submitting}>{submitting ? 'Sending…' : 'Send reset code'}</PrimaryButton>
          <BackLink onClick={() => setMode('login')} />
        </form>
      ) : mode === 'reset' ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Field label="Reset code" icon={KeyRound}>
            <input type="text" required value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Paste the code emailed to you" autoComplete="one-time-code" className={INPUT} />
          </Field>
          <Field label="New password" icon={KeyRound}>
            <input type={showPassword ? 'text' : 'password'} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className={INPUT + ' pr-11'} />
            <EyeToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </Field>
          <PrimaryButton disabled={submitting}>{submitting ? 'Resetting…' : 'Reset password'}</PrimaryButton>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMode('forgot')} className="text-[13px] text-slate-500 hover:text-slate-900 font-semibold cursor-pointer">Didn't get a code? Resend</button>
            <BackLink onClick={() => setMode('login')} inline />
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" icon={UserRound}>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ajay" autoComplete="given-name" className={INPUT} />
              </Field>
              <Field label="Last name">
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rathava" autoComplete="family-name" className={INPUT_PLAIN} />
              </Field>
            </div>
          )}

          {mode === 'register' && role === 'employer' && (
            <Field label="Company / organisation name" icon={Building2}>
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. EdTech Solutions" autoComplete="organization" className={INPUT} />
            </Field>
          )}

          <Field label="Email address" icon={Mail}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className={INPUT} />
          </Field>

          <Field
            label="Password"
            icon={KeyRound}
            action={mode === 'login' && role !== 'admin' ? (
              <button type="button" onClick={() => setMode('forgot')} className="text-[12.5px] text-blue-700 font-bold hover:underline cursor-pointer">Forgot password?</button>
            ) : undefined}
          >
            <input type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className={INPUT + ' pr-11'} />
            <EyeToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </Field>

          {mode === 'register' && role === 'employer' && (
            <AcknowledgmentCheckbox checked={acknowledgedTerms} onChange={setAcknowledgedTerms} />
          )}

          <PrimaryButton disabled={submitting || (mode === 'register' && role === 'employer' && !acknowledgedTerms)}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create free account'}
          </PrimaryButton>
        </form>
      )}

      {isAuthForm && role !== 'admin' && (
        <p className="mt-5 text-center text-[14px] text-slate-500">
          {mode === 'login' ? "New to JobCharcha? " : 'Already have an account? '}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setInfo(null); }}
            className="font-extrabold text-blue-700 hover:underline cursor-pointer">
            {mode === 'login' ? 'Create a free account' : 'Sign in'}
          </button>
        </p>
      )}

      {isAuthForm && role !== 'admin' && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button type="button" onClick={() => handleSelectRole('admin')} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin sign in
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-3 text-[14.5px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
const INPUT_PLAIN = INPUT.replace('pl-10', 'pl-3.5');

const Field: React.FC<{ label: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ label, icon: Icon, action, children }) => (
  <label className="block">
    <span className="flex items-center justify-between mb-1.5">
      <span className="text-[13px] font-bold text-slate-700">{label}</span>
      {action}
    </span>
    <span className="relative block">
      {Icon && <Icon className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />}
      {children}
    </span>
  </label>
);

const EyeToggle: React.FC<{ shown: boolean; onToggle: () => void }> = ({ shown, onToggle }) => (
  <button type="button" onClick={onToggle} aria-label={shown ? 'Hide password' : 'Show password'}
    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
    {shown ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
  </button>
);

const PrimaryButton: React.FC<{ disabled?: boolean; children: React.ReactNode }> = ({ disabled, children }) => (
  <button type="submit" disabled={disabled}
    className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-extrabold text-white bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 shadow-[0_12px_24px_-12px_rgba(37,99,235,0.8)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors">
    {children} <ArrowRight className="w-4 h-4" />
  </button>
);

const BackLink: React.FC<{ onClick: () => void; inline?: boolean }> = ({ onClick, inline }) => (
  <button type="button" onClick={onClick} className={`${inline ? '' : 'w-full justify-center'} inline-flex items-center gap-1 text-[13px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer`}>
    <ArrowLeft className="w-4 h-4" /> Back to sign in
  </button>
);
