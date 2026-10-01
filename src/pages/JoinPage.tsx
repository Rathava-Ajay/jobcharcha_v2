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
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f8] text-slate-500 text-sm font-semibold">
        Redirecting you to sign up…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col items-center px-4 py-6 sm:py-12">
      <Link to="/" className="mb-6 sm:mb-10" aria-label="JobCharcha home">
        <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-8 w-auto" />
      </Link>
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Join JobCharcha — free
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-xl mx-auto">
            One account for Gujarat's government &amp; private jobs. Create yours in under a minute,
            then start browsing or hiring right away.
          </p>
          {campaign && (
            <p className="text-xs text-emerald-700 font-semibold mt-2">You're joining via {campaign}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Job seekers */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">For Job Seekers</h2>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {ASPIRANT_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {text}
                </li>
              ))}
            </ul>
            <Link
              to={registerHref('aspirant')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Create free job-seeker account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Employers */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">For Employers</h2>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {EMPLOYER_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Icon className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" /> {text}
                </li>
              ))}
            </ul>
            <Link
              to={registerHref('employer')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Create free employer account <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Employers verify their email before posting — takes a minute.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
