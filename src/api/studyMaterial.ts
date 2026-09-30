import { apiFetch, toQueryString } from './client';

export interface ApiStudyMaterial {
  id: number;
  title: string;
  slug: string;
  categoryId: number;
  categoryName: string;
  description: string;
  materialType: string;
  filePath: string;
  fileSizeDisplay: string;
  downloadCount: number;
}

export interface UpsertStudyMaterialPayload {
  title: string;
  slug?: string;
  categoryId: number;
  description: string;
  materialType: string;
  filePath: string;
  fileSize: number;
  isActive: boolean;
}

export const searchStudyMaterials = (query: { categoryId?: number; materialType?: string; search?: string } = {}) =>
  apiFetch<ApiStudyMaterial[]>(`/api/study-materials${toQueryString(query)}`);

export const registerStudyMaterialDownload = (slug: string) =>
  apiFetch<{ downloadUrl: string }>(`/api/study-materials/${encodeURIComponent(slug)}/download`, { method: 'POST' });

export const adminGetAllStudyMaterials = () => apiFetch<ApiStudyMaterial[]>('/api/study-materials/admin/all', { auth: true });

export const createStudyMaterial = (payload: UpsertStudyMaterialPayload) =>
  apiFetch<ApiStudyMaterial>('/api/study-materials', { method: 'POST', auth: true, body: payload });

export const updateStudyMaterial = (id: number, payload: UpsertStudyMaterialPayload) =>
  apiFetch<ApiStudyMaterial>(`/api/study-materials/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteStudyMaterial = (id: number) =>
  apiFetch<void>(`/api/study-materials/${id}`, { method: 'DELETE', auth: true });
