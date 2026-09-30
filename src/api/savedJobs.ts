import { apiFetch } from './client';

export interface SavedJob {
  employerJobId: number;
  title: string;
  slug: string;
  companyName: string;
  city?: string;
  state?: string;
  jobType: string;
  workMode: string;
  lastDate?: string | null;
  hasApplied: boolean;
  savedAt: string;
}

export const getSavedJobs = () =>
  apiFetch<SavedJob[]>('/api/saved-jobs', { auth: true });

export const getSavedJobIds = () =>
  apiFetch<number[]>('/api/saved-jobs/ids', { auth: true });

export const saveJob = (employerJobId: number) =>
  apiFetch<void>('/api/saved-jobs', { method: 'POST', auth: true, body: { employerJobId } });

export const unsaveJob = (employerJobId: number) =>
  apiFetch<void>(`/api/saved-jobs/${employerJobId}`, { method: 'DELETE', auth: true });
