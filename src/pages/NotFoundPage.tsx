import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SeoHead title="Page not found | JobCharcha" description="The page you are looking for does not exist or has moved." path="/404" noindex />
      <Navbar user={user} />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
          <Compass className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-heading font-extrabold text-slate-900">404 — Page not found</h1>
        <p className="text-sm text-slate-500 max-w-md">
          This page may have been removed, renamed, or the link is incorrect. The vacancy or result you
          were looking for might have expired.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs font-bold">
          <Link to="/" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl">Go to homepage</Link>
          <Link to="/jobs" className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl">Browse jobs</Link>
          <Link to="/results" className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl">Latest results</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
