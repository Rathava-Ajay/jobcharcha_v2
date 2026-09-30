import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, FileText, CreditCard, UserCircle, Bookmark } from 'lucide-react';
import { DashboardShell } from '../components/routing/DashboardShell';
import { MyApplicationsSection } from '../components/MyApplicationsSection';
import { MockTestHistorySection } from '../components/MockTestHistorySection';
import { PaymentHistorySection } from '../components/PaymentHistorySection';
import { SavedJobsSection } from '../components/aspirant/SavedJobsSection';
import { CareerHubTab } from '../components/aspirant/CareerHubTab';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

type Tab = 'career' | 'applications' | 'saved' | 'mock-tests' | 'payments';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
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
    TABS.some((t) => t.id === initial) ? (initial as Tab) : 'career',
  );
  if (!user) return null;

  return (
    <DashboardShell>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-2 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                tab === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'career' ? (
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
