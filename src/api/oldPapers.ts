import { apiFetch, toQueryString } from './client';

export interface ApiOldPaperListItem {
  id: number;
  title: string;
  slug: string;
  examName: string;
  categoryId?: number | null;
  categoryName: string;
  year: number;
  subject?: string | null;
  paperType?: string | null;
  downloads: number;
  isFeatured: boolean;
}

export interface ApiOldPaperDetail extends ApiOldPaperListItem {
  description?: string | null;
  paperPdfLink: string;
  solutionPdfLink?: string | null;
  totalQuestions?: number | null;
  totalMarks?: number | null;
  duration?: number | null;
  isActive: boolean;
}

export interface UpsertOldPaperPayload {
  title: string;
  titleGujarati?: string;
  slug?: string;
  examName: string;
  categoryId?: number | null;
  year: number;
  description?: string;
  paperPdfLink: string;
  solutionPdfLink?: string;
  totalQuestions?: number;
  totalMarks?: number;
  duration?: number;
  subject?: string;
  paperType?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

export const searchOldPapers = (query: { categoryId?: number; year?: number; search?: string } = {}) =>
  apiFetch<ApiOldPaperListItem[]>(`/api/old-papers${toQueryString(query)}`);

export const getOldPaperYears = () => apiFetch<number[]>('/api/old-papers/years');

export const getOldPaperBySlug = (slug: string) =>
  apiFetch<ApiOldPaperDetail>(`/api/old-papers/${encodeURIComponent(slug)}`);

export const registerOldPaperDownload = (slug: string) =>
  apiFetch<{ downloadUrl: string }>(`/api/old-papers/${encodeURIComponent(slug)}/download`, { method: 'POST' });

export const adminGetAllOldPapers = () =>
  apiFetch<ApiOldPaperDetail[]>('/api/old-papers/admin/all', { auth: true });

export const createOldPaper = (payload: UpsertOldPaperPayload) =>
  apiFetch<ApiOldPaperDetail>('/api/old-papers', { method: 'POST', auth: true, body: payload });

export const updateOldPaper = (id: number, payload: UpsertOldPaperPayload) =>
  apiFetch<ApiOldPaperDetail>(`/api/old-papers/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteOldPaper = (id: number) =>
  apiFetch<void>(`/api/old-papers/${id}`, { method: 'DELETE', auth: true });
