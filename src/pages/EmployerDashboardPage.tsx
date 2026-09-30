import React from 'react';
import { DashboardShell } from '../components/routing/DashboardShell';
import { EmployerDashboardSection } from '../components/EmployerDashboardSection';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

export default function EmployerDashboardPage() {
  const { user, setUser } = useAuth();

  if (!user) return null;

  return (
    <DashboardShell>
      <EmployerDashboardSection
        user={user}
        setUser={setUser as React.Dispatch<React.SetStateAction<UserProfile>>}
      />
    </DashboardShell>
  );
}
