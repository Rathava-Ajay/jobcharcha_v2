import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, FileText, CreditCard, UserCircle, Bookmark, LayoutDashboard } from 'lucide-react';
import { DashboardLayout, DashNavGroup } from '../components/dashboard/DashboardLayout';
import { MyApplicationsSection } from '../components/MyApplicationsSection';
import { MockTestHistorySection } from '../components/MockTestHistorySection';
import { PaymentHistorySection } from '../components/PaymentHistorySection';
import { SavedJobsSection } from '../components/aspirant/SavedJobsSection';
import { CareerHubTab } from '../components/aspirant/CareerHubTab';
import { DashboardOverview } from '../components/aspirant/DashboardOverview';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

type Tab = 'overview' | 'career' | 'applications' | 'saved' | 'mock-tests' | 'payments';

const GROUPS: DashNavGroup[] = [
  { items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  { title: 'My career', items: [
    { id: 'career', label: 'Career Hub', icon: UserCircle },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'saved', label: 'Saved Jobs', icon: Bookmark },
  ] },
  { title: 'Practice & billing', items: [
    { id: 'mock-tests', label: 'Mock Tests', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ] },
];
const TAB_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));
const SUBTITLES: Record<Tab, string> = {
  overview: 'Your deadlines, matching jobs and progress at a glance',
  career: 'Profile, résumé and job preferences employers see',
  applications: 'Track every job you applied to',
  saved: 'Jobs you bookmarked, with their last dates',
  'mock-tests': 'Your attempts, scores and ranks',
  payments: 'Plans and receipts',
};

export default function AspirantDashboardPage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(
    TAB_IDS.includes(initial ?? '') ? (initial as Tab) : 'overview',
  );
  if (!user) return null;

  return (
    <DashboardLayout groups={GROUPS} active={tab} onSelect={(id) => setTab(id as Tab)} subtitle={SUBTITLES[tab]}>
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
    </DashboardLayout>
  );
}
