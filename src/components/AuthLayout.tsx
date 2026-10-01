import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

const BENEFITS = [
  'Job alerts for your qualification by email',
  'Save jobs and get a reminder before the last date',
  'Free daily quiz and mock tests with your rank',
  'Track results & admit cards for exams you applied to',
];

/**
 * Split layout for login / join: a calm form card on the right, and on desktop a short
 * "why sign up" panel on the left. Phones get just the card, full width.
 */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-[#f5f7f8]">
    <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white p-12 xl:p-16">
      <Link to="/" className="inline-flex">
        <span className="bg-white rounded-xl px-3 py-2">
          <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-7 w-auto" />
        </span>
      </Link>
      <div>
        <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">One free account.<br />Every Gujarat govt job.</h2>
        <ul className="mt-8 space-y-3.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-emerald-50 text-[15px]">
              <span className="w-6 h-6 rounded-full bg-white/15 grid place-items-center shrink-0"><Check className="w-3.5 h-3.5 text-amber-300" /></span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-emerald-200">Free for job seekers. No spam — unsubscribe anytime.</p>
    </aside>

    <div className="flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5 lg:mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <img src="/icons/jobcharcha_logo_transparent.png" alt="JobCharcha" width={570} height={100} className="h-7 w-auto lg:hidden" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)] p-5 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  </div>
);
