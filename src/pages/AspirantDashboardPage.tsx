import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, FileText, CreditCard, UserCircle, Bookmark, LayoutDashboard } from 'lucide-react';
import { DashboardShell } from '../components/routing/DashboardShell';
import { MyApplicationsSection } from '../components/MyApplicationsSection';
import { MockTestHistorySection } from '../components/MockTestHistorySection';
import { PaymentHistorySection } from '../components/PaymentHistorySection';
import { SavedJobsSection } from '../components/aspirant/SavedJobsSection';
import { CareerHubTab } from '../components/aspirant/CareerHubTab';
import { DashboardOverview } from '../components/aspirant/DashboardOverview';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

type Tab = 'overview' | 'career' | 'applications' | 'saved' | 'mock-tests' | 'payments';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'career', label: 'Career Hub', icon: UserCircle },
  { id: 'applications', label: 'Applications', icon: Briefcase },
  { id: 'saved', label: 'Saved Jobs', icon: Bookmark },
  { id: 'mock-tests', label: 'Mock Tests', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
];

export default function AspirantDashboardPage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initial) ? (initial as Tab) : 'overview',
  );
  if (!user) return null;

  return (
    <DashboardShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`px-3 py-3 text-[13.5px] font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                tab === id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' ? (
        <DashboardOverview user={user} onOpenTab={setTab} />
      ) : tab === 'career' ? (
        <CareerHubTab />
      ) : tab === 'applications' ? (
        <MyApplicationsSection
          user={user}
          setUser={setUser as React.Dispatch<React.SetStateAction<UserProfile>>}
        />
      ) : tab === 'saved' ? (
        <SavedJobsSection />
      ) : tab === 'mock-tests' ? (
        <MockTestHistorySection />
      ) : (
        <PaymentHistorySection />
      )}
    </DashboardShell>
  );
}
