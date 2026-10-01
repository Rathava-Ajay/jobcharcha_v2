import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { JobAlertSubscription } from '../components/JobAlertSubscription';
import { useAuth } from '../context/AuthContext';

export default function JobAlertsPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Job Alerts | JobCharcha';
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="bg-white border-b border-slate-200 py-8 sm:py-10 px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <Bell className="w-3.5 h-3.5" /> Job Alerts
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 text-slate-900">Never Miss Official Vacancies</h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Set up category and region-specific alerts, delivered by email the moment a matching job is posted.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <JobAlertSubscription />
        </div>
      </main>

      <Footer />
    </div>
  );
}
