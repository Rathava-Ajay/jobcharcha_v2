import { apiFetch } from './client';

export interface ApiCategory {
  id: number;
  name: string;
  nameGujarati?: string | null;
  slug: string;
  description?: string | null;
  icon: string;
  displayOrder: number;
  showOnHomepage: boolean;
  homepageJobCount: number;
  isActive: boolean;
  jobCount: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}

export interface UpsertCategoryPayload {
  name: string;
  nameGujarati?: string;
  slug?: string;
  description?: string;
  icon: string;
  displayOrder?: number;
  showOnHomepage?: boolean;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export const getCategories = () => apiFetch<ApiCategory[]>('/api/categories');
export const getFeaturedCategories = () => apiFetch<ApiCategory[]>('/api/categories/featured');
export const getCategoryBySlug = (slug: string) => apiFetch<ApiCategory>(`/api/categories/${encodeURIComponent(slug)}`);

export const adminGetAllCategories = () => apiFetch<ApiCategory[]>('/api/categories/admin/all', { auth: true });

export const createCategory = (payload: UpsertCategoryPayload) =>
  apiFetch<ApiCategory>('/api/categories', { method: 'POST', auth: true, body: payload });

export const updateCategory = (id: number, payload: UpsertCategoryPayload) =>
  apiFetch<ApiCategory>(`/api/categories/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteCategory = (id: number) =>
  apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE', auth: true });
