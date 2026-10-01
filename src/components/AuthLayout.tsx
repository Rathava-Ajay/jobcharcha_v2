import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, BookmarkCheck, PenLine, Ticket, ShieldCheck, Clock } from 'lucide-react';

const FEATURES: { icon: React.ElementType; tone: string; title: string; body: string }[] = [
  { icon: Bell, tone: 'bg-blue-500/20 text-sky-200', title: 'Job alerts', body: 'New jobs for your qualification, by email' },
  { icon: BookmarkCheck, tone: 'bg-emerald-500/20 text-emerald-200', title: 'Save & remind', body: 'A nudge before every last date' },
  { icon: PenLine, tone: 'bg-pink-500/20 text-pink-200', title: 'Mock tests', body: 'Real exam pattern with your rank' },
  { icon: Ticket, tone: 'bg-violet-500/20 text-violet-200', title: 'Results & admit cards', body: 'Track the exams you applied to' },
];

/**
 * Split layout for sign-in: a blue showcase on the left (desktop) and the form card on the
 * right. On phones the showcase collapses into a short blue header the card overlaps.
 */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-[#f3f6fb]">
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between text-white p-10 xl:p-14 bg-[radial-gradient(600px_380px_at_90%_0%,rgba(56,189,248,0.4),transparent_60%),radial-gradient(520px_360px_at_0%_100%,rgba(99,102,241,0.45),transparent_60%),linear-gradient(140deg,#0b1a3f,#1e3a8a_55%,#2563eb)]">
      <div aria-hidden className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(180deg,#000,transparent_85%)]" />

      <Link to="/" className="relative inline-flex self-start">
        <span className="bg-white rounded-xl px-3 py-2 shadow-lg">
          <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-7 w-auto" />
        </span>
      </Link>

      <div className="relative max-w-lg">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-[12.5px] font-semibold text-blue-100">
          <ShieldCheck className="w-4 h-4" /> Every post checked against the official notification
        </span>
        <h2 className="mt-4 text-[38px] xl:text-[44px] leading-[1.05] font-extrabold tracking-tight">
          One free account.<br /><span className="text-amber-300">Every Sarkari update.</span>
        </h2>

        {/* Mini dashboard preview — illustrates the features, no made-up numbers */}
        <div className="mt-8 rounded-3xl bg-white/[0.07] border border-white/15 backdrop-blur-sm p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 px-1 pb-3 text-[12px] font-bold uppercase tracking-wider text-blue-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.25)]" /> Your JobCharcha dashboard
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5">
                <span className={`w-9 h-9 rounded-xl grid place-items-center ${f.tone}`}><f.icon className="w-[18px] h-[18px]" /></span>
                <p className="mt-2.5 font-bold text-[14px]">{f.title}</p>
                <p className="text-[12.5px] text-blue-100/75 leading-snug">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-3 rounded-2xl bg-white text-slate-900 p-3">
            <span className="w-9 h-9 rounded-xl bg-red-50 text-red-600 grid place-items-center shrink-0"><Clock className="w-[18px] h-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">Last date reminder</span>
              <span className="block text-[12px] text-slate-500 truncate">We remind you before a saved job closes</span>
            </span>
            <span className="shrink-0 rounded-full bg-red-50 text-red-600 text-[11px] font-extrabold px-2.5 py-1">2 days left</span>
          </div>
        </div>
      </div>

      <p className="relative text-sm text-blue-100/70">Free for job seekers · No spam — unsubscribe anytime.</p>
    </aside>

    <div className="relative flex flex-col min-w-0">
      {/* Phone header */}
      <div className="lg:hidden relative overflow-hidden text-white px-4 pt-4 pb-16 bg-[radial-gradient(400px_220px_at_100%_0%,rgba(56,189,248,0.45),transparent_60%),linear-gradient(140deg,#0b1a3f,#1e40af_60%,#2563eb)]">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-100"><ArrowLeft className="w-4 h-4" /> Home</Link>
          <span className="bg-white rounded-lg px-2 py-1"><img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-5 w-auto" /></span>
        </div>
        <p className="mt-4 text-[22px] leading-tight font-extrabold tracking-tight">One free account.<br /><span className="text-amber-300">Every Sarkari update.</span></p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start lg:justify-center px-4 sm:px-8 pb-8 lg:py-10 -mt-11 lg:mt-0">
        <div className="w-full max-w-[440px]">
          <Link to="/" className="hidden lg:inline-flex items-center gap-1.5 mb-5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_24px_50px_-28px_rgba(15,23,42,0.35)] p-5 sm:p-8">
            {children}
          </div>
          <p className="mt-4 text-center text-[12px] text-slate-500">
            By continuing you agree to our <Link to="/terms" className="font-semibold text-slate-700 hover:underline">Terms</Link> and <Link to="/privacy" className="font-semibold text-slate-700 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  </div>
);
