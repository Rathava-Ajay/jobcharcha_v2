import { apiFetch } from './client';

export interface ApiMyApplication {
  id: number;
  employerJobId: number;
  jobTitle: string;
  jobSlug: string;
  companyName: string;
  status: string;
  interviewDate?: string | null;
  interviewLocation?: string | null;
  interviewMode?: string | null;
  createdDate: string;
}

export interface ApiJobApplication {
  id: number;
  employerJobId: number;
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  expectedSalary?: string | null;
  currentSalary?: string | null;
  noticePeriod?: string | null;
  status: string;
  employerNotes?: string | null;
  interviewDate?: string | null;
  interviewLocation?: string | null;
  interviewMode?: string | null;
  isRead: boolean;
  isStarred: boolean;
  createdDate: string;
}

export interface ApplyToJobPayload {
  coverLetter?: string;
  expectedSalary?: string;
  currentSalary?: string;
  noticePeriod?: string;
}

export interface UpdateApplicationStatusPayload {
  status: string;
  employerNotes?: string;
  interviewDate?: string;
  interviewLocation?: string;
  interviewMode?: string;
}

export const applyToJob = (employerJobId: number, payload: ApplyToJobPayload) =>
  apiFetch<ApiMyApplication>(`/api/job-applications/${employerJobId}`, { method: 'POST', auth: true, body: payload });

export const getMyApplications = () =>
  apiFetch<ApiMyApplication[]>('/api/job-applications/mine', { auth: true });

export const getEmployerJobApplications = (employerJobId: number) =>
  apiFetch<ApiJobApplication[]>(`/api/employer/jobs/${employerJobId}/applications`, { auth: true });

export const updateApplicationStatus = (applicationId: number, payload: UpdateApplicationStatusPayload) =>
  apiFetch<ApiJobApplication>(`/api/job-applications/${applicationId}/status`, { method: 'PUT', auth: true, body: payload });
