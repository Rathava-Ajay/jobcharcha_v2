import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useAuth } from '../context/AuthContext';

interface StaticPageProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Shared shell for prose/legal pages (About, Privacy, Terms, Employer Rules) — matches the site's slate/emerald visual language. */
export const StaticPage: React.FC<StaticPageProps> = ({ eyebrow, title, subtitle, children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <div className="bg-white border-b border-slate-200 py-5 sm:py-7">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            {eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">{title}</h1>
          {subtitle && <p className="text-[13px] sm:text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed [&_h2]:font-heading [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:text-lg [&_h2]:mt-2 [&_p]:text-slate-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-slate-600 [&_li]:marker:text-emerald-500">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};
