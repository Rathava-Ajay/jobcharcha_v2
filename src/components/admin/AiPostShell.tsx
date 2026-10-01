import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Shared chrome for the "Post via Mobile/AI" pages: a slim sticky bar (back to admin, logo,
 * account), a blue header with title and a stepper, and the page body. On phones the stepper
 * collapses to "Step x of n" with a progress bar so it never scrolls sideways.
 */
export const AiPostShell: React.FC<{
  title: string;
  subtitle?: string;
  steps: { key: string; label: string }[];
  stepIndex: number;
  badges?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, steps, stepIndex, badges, wide, children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = (user?.name ?? '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const current = steps[Math.max(0, stepIndex)];
  const pct = steps.length > 1 ? (Math.max(0, stepIndex) / (steps.length - 1)) * 100 : 100;

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dashboard/admin')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2.5 sm:px-3 py-2 text-[13px] font-bold text-slate-700 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Admin</span>
          </button>
          <Link to="/" aria-label="JobCharcha home" className="hidden sm:block"><img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-6 w-auto" /></Link>
          <span className="sm:hidden min-w-0 flex-1 truncate text-[14px] font-extrabold text-slate-900">{title}</span>
          <span className="ml-auto w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-extrabold text-[12px] shrink-0" title={user?.name}>{initials}</span>
        </div>
      </header>

      <section className="text-white bg-[radial-gradient(520px_240px_at_100%_0%,rgba(56,189,248,0.4),transparent_60%),linear-gradient(135deg,#0b1a3f,#1e3a8a_60%,#2563eb)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[12px] font-bold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI-assisted posting
            </span>
            {badges}
          </div>
          <h1 className="mt-3 text-[22px] sm:text-[28px] leading-tight font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-[13.5px] text-blue-100/85 max-w-2xl">{subtitle}</p>}

          {/* Desktop / tablet stepper */}
          <ol className="hidden sm:flex items-center mt-5">
            {steps.map((s, i) => {
              const done = i < stepIndex, on = i === stepIndex;
              return (
                <li key={s.key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`w-8 h-8 rounded-full grid place-items-center text-[13px] font-black border-2 ${on ? 'bg-amber-400 border-amber-400 text-slate-900' : done ? 'bg-emerald-400 border-emerald-400 text-slate-900' : 'border-white/30 text-blue-100'}`}>
                      {done ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    <span className={`text-[13px] font-bold whitespace-nowrap ${on ? 'text-white' : done ? 'text-emerald-200' : 'text-blue-100/70'}`}>{s.label}</span>
                  </span>
                  {i < steps.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-white/20'}`} />}
                </li>
              );
            })}
          </ol>

          {/* Phone stepper */}
          <div className="sm:hidden mt-4">
            <div className="flex items-center justify-between text-[12.5px] font-bold">
              <span className="text-blue-100">Step {Math.max(0, stepIndex) + 1} of {steps.length}</span>
              <span className="text-amber-300">{current?.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.max(8, pct)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>{children}</main>
    </div>
  );
};

/** Shared class strings so every AI posting page looks the same. */
export const aiUi = {
  card: 'bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4',
  label: 'text-[13px] font-bold text-slate-700 block mb-1.5',
  textarea: 'w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10',
  mono: 'font-mono text-[13px]',
  select: 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-slate-900',
  primary: 'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[15px] py-3.5 cursor-pointer shadow-[0_12px_24px_-14px_rgba(37,99,235,0.8)] transition-colors',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[14px] px-4 py-3.5 cursor-pointer',
  promptBox: 'bg-slate-950 text-slate-200 rounded-xl p-3.5 text-[12px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-mono',
};
