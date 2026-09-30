import React, { useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, User, Building2, ArrowRight, BriefcaseBusiness, BellRing,
  FileCheck2, LineChart, Users2, Sparkles,
} from 'lucide-react';

type JoinRole = 'aspirant' | 'employer';

const ASPIRANT_POINTS = [
  { icon: BriefcaseBusiness, text: 'Browse verified government & private job vacancies' },
  { icon: BellRing, text: 'Free job alerts by email — never miss a deadline' },
  { icon: FileCheck2, text: 'CBT mock tests with instant scoring & analytics' },
  { icon: LineChart, text: 'Track every application from one dashboard' },
];

const EMPLOYER_POINTS = [
  { icon: BriefcaseBusiness, text: 'Post up to 5 job openings free — no card needed' },
  { icon: Users2, text: 'Reach active job seekers across Gujarat' },
  { icon: FileCheck2, text: 'Shortlist with résumés attached to every application' },
  { icon: Sparkles, text: 'Unlock candidate contact details when you need them' },
];

export default function JoinPage() {
  const { role } = useParams<{ role?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => { document.title = 'Join JobCharcha — Free Account for Job Seekers & Employers'; }, []);

  // /join/aspirant and /join/employer skip the landing and go straight to the pre-filled
  // register form, carrying every campaign param (ref, utm_*) through untouched.
  useEffect(() => {
    if (role === 'aspirant' || role === 'employer') {
      const qs = searchParams.toString();
      navigate(`/login?role=${role}&mode=register${qs ? `&${qs}` : ''}`, { replace: true });
    }
  }, [role, searchParams, navigate]);

  const registerHref = (r: JoinRole) => {
    const qs = searchParams.toString();
    return `/login?role=${r}&mode=register${qs ? `&${qs}` : ''}`;
  };

  const campaign = searchParams.get('utm_campaign');

  if (role === 'aspirant' || role === 'employer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm font-semibold">
        Redirecting you to sign up…
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-10 overflow-hidden bg-slate-950">
      {/* Aurora backdrop — same treatment as the login screen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 14% 16%, rgba(16,185,129,0.42), transparent 60%),' +
            'radial-gradient(52% 52% at 90% 8%, rgba(56,189,248,0.34), transparent 60%),' +
            'radial-gradient(55% 60% at 82% 96%, rgba(217,70,239,0.30), transparent 60%),' +
            'radial-gradient(48% 48% at 22% 100%, rgba(129,140,248,0.34), transparent 60%)',
        }}
      />
      <div className="auth-blob pointer-events-none absolute -top-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-emerald-500/40 blur-3xl" />
      <div className="auth-blob-slow pointer-events-none absolute -bottom-44 -right-24 h-[32rem] w-[32rem] rounded-full bg-sky-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.6)_100%)]" />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            Join JobCharcha — free
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            One account for Gujarat's government &amp; private jobs. Create yours in under a minute,
            then start browsing or hiring right away.
          </p>
          {campaign && (
            <p className="text-[11px] text-emerald-400/80 font-semibold mt-2">You're joining via {campaign}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Job seekers */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.65)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </span>
              <h2 className="text-base font-heading font-extrabold text-slate-900">For Job Seekers</h2>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {ASPIRANT_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {text}
                </li>
              ))}
            </ul>
            <Link
              to={registerHref('aspirant')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Create free job-seeker account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Employers */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.65)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </span>
              <h2 className="text-base font-heading font-extrabold text-slate-900">For Employers</h2>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {EMPLOYER_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                  <Icon className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" /> {text}
                </li>
              ))}
            </ul>
            <Link
              to={registerHref('employer')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Create free employer account <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Employers verify their email before posting — takes a minute.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
