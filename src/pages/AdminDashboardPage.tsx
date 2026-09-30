import React from 'react';
import { DashboardShell } from '../components/routing/DashboardShell';
import { AdminDashboardSection } from '../components/AdminDashboardSection';

export default function AdminDashboardPage() {
  return (
    <DashboardShell>
      <AdminDashboardSection />
    </DashboardShell>
  );
}
