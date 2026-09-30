import React, { useState } from 'react';
import { MailWarning, Loader2, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { confirmEmail, resendConfirmation } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';

/**
 * Shown at the top of the employer dashboard while the employer's email is unverified — a job
 * posting can't be created until it is. Renders nothing once the email is confirmed. (Whether a
 * given posting is held for admin review is a separate, per-posting concern surfaced after submit.)
 */
export const EmployerVerificationBanner: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // treat undefined (stale cache) as "not blocking" — the AuthProvider refreshes /me on mount
  if (user.emailConfirmed !== false) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    try {
      await confirmEmail(user.id, code.trim());
      await refreshProfile();
      setMsg('Email verified — you can post a job now.');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'That code was not accepted. Request a new one and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await resendConfirmation(user.email);
      setMsg('A new confirmation code has been sent to your email.');
    } catch {
      setErr('Could not resend the code. Please try again shortly.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-3">
      <div className="flex items-start gap-3">
        <MailWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-extrabold text-sm text-amber-900">Verify your email to start posting</h3>
          <p className="text-xs text-amber-800 mt-0.5">
            We sent a confirmation code to <span className="font-bold">{user.email}</span>. Enter it below.
            Your first job posting is also reviewed by our team before it goes live.
          </p>
        </div>
      </div>
      <form onSubmit={handleConfirm} className="flex flex-wrap items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Confirmation code"
          className="bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold flex-1 min-w-[180px] focus:outline-none focus:border-amber-500"
        />
        <button type="submit" disabled={busy || !code.trim()}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirm
        </button>
        <button type="button" onClick={handleResend} disabled={busy}
          className="bg-white border border-amber-300 text-amber-800 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50">
          Resend code
        </button>
      </form>
      {msg && <p className="text-xs font-semibold text-emerald-700">{msg}</p>}
      {err && <p className="text-xs font-semibold text-rose-700">{err}</p>}
    </div>
  );
};
