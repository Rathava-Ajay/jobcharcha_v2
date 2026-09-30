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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="bg-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            {eyebrow}
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-300">{subtitle}</p>}
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed [&_h2]:font-heading [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:text-lg [&_h2]:mt-2 [&_p]:text-slate-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-slate-600 [&_li]:marker:text-emerald-500">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};
