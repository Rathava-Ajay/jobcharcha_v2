import { apiFetch } from './client';
import { ApiJobListItem } from './jobs';

export interface CategoryCount {
  name: string;
  count: number;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  expiredJobs: number;
  draftJobs: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalCategories: number;
  topCategories: CategoryCount[];
  recentJobs: ApiJobListItem[];
}

export const getDashboardStats = () => apiFetch<DashboardStats>('/api/dashboard/stats', { auth: true });
