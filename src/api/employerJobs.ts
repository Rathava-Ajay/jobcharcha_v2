import { apiFetch, toQueryString } from './client';

export interface ApiEmployerJobListItem {
  id: number;
  title: string;
  slug: string;
  department?: string | null;
  jobType: string;
  city: string;
  state: string;
  openings?: number | null;
  lastDate?: string | null;
  isFeatured: boolean;
  status: string;
  isActive: boolean;
  viewCount: number;
  applicationCount: number;
  createdDate: string;
}

export interface ApiEmployerJobDetail extends ApiEmployerJobListItem {
  workMode: string;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  skills?: string | null;
  qualification: string;
  experienceRequired?: string | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  isSalaryNegotiable: boolean;
  hideSalary: boolean;
  isUrgent: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface ApiPublicEmployerJobListItem {
  id: number;
  title: string;
  slug: string;
  companyName: string;
  companyLogo?: string | null;
  isCompanyVerified: boolean;
  jobType: string;
  workMode: string;
  city: string;
  state: string;
  salaryMin?: string | null;
  salaryMax?: string | null;
  hideSalary: boolean;
  isFeatured: boolean;
  isUrgent: boolean;
  lastDate?: string | null;
  createdDate: string;
}

export interface ApiPublicEmployerJobDetail extends ApiPublicEmployerJobListItem {
  department?: string | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  skills?: string | null;
  qualification: string;
  experienceRequired?: string | null;
  isSalaryNegotiable: boolean;
  openings?: number | null;
  hasApplied: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface UpsertEmployerJobPayload {
  title: string;
  slug?: string;
  department?: string;
  jobType: string;
  workMode: string;
  description: string;
  requirements?: string;
  benefits?: string;
  skills?: string;
  qualification: string;
  experienceRequired?: string;
  salaryMin?: string;
  salaryMax?: string;
  isSalaryNegotiable?: boolean;
  hideSalary?: boolean;
  city: string;
  state: string;
  openings?: number;
  isUrgent?: boolean;
  lastDate?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export const searchPublicEmployerJobs = (query: { search?: string; city?: string; jobType?: string } = {}) =>
  apiFetch<ApiPublicEmployerJobListItem[]>(`/api/employer/jobs/public${toQueryString(query)}`);

// auth:true attaches a token when the visitor is logged in (so the backend can flag
// hasApplied); the endpoint itself is anonymous-allowed and works fine without one.
export const getPublicEmployerJobBySlug = (slug: string) =>
  apiFetch<ApiPublicEmployerJobDetail>(`/api/employer/jobs/public/${encodeURIComponent(slug)}`, { auth: true });

export const getMyEmployerJobs = () =>
  apiFetch<ApiEmployerJobListItem[]>('/api/employer/jobs', { auth: true });

export const getMyEmployerJobById = (id: number) =>
  apiFetch<ApiEmployerJobDetail>(`/api/employer/jobs/${id}`, { auth: true });

export const createEmployerJob = (payload: UpsertEmployerJobPayload) =>
  apiFetch<ApiEmployerJobDetail>('/api/employer/jobs', { method: 'POST', auth: true, body: payload });

export const updateEmployerJob = (id: number, payload: UpsertEmployerJobPayload) =>
  apiFetch<ApiEmployerJobDetail>(`/api/employer/jobs/${id}`, { method: 'PUT', auth: true, body: payload });

export const closeEmployerJob = (id: number) =>
  apiFetch<void>(`/api/employer/jobs/${id}/close`, { method: 'POST', auth: true });

// --- Admin moderation of first-time employer postings ---

export interface ApiAdminPendingEmployerJob {
  id: number;
  title: string;
  slug: string;
  status: string;
  employerProfileId: number;
  companyName: string;
  employerEmail?: string | null;
  employerEmailVerified: boolean;
  city: string;
  state: string;
  jobType: string;
  workMode: string;
  department?: string | null;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  skills?: string | null;
  qualification: string;
  experienceRequired?: string | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  openings?: number | null;
  isUrgent: boolean;
  lastDate?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdDate: string;
  priorApprovedPostings: number;
}

export const adminGetPendingEmployerJobs = () =>
  apiFetch<ApiAdminPendingEmployerJob[]>('/api/admin/employer-jobs/pending', { auth: true });

export const adminApproveEmployerJob = (id: number) =>
  apiFetch<void>(`/api/admin/employer-jobs/${id}/approve`, { method: 'POST', auth: true });

export const adminRejectEmployerJob = (id: number, reason: string) =>
  apiFetch<void>(`/api/admin/employer-jobs/${id}/reject`, { method: 'POST', auth: true, body: { reason } });
