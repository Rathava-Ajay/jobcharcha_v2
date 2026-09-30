import { apiFetch, toQueryString } from './client';

export interface ApiProduct {
  productId: number;
  title: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  category: string;
  subCategory?: string | null;
  googleDriveDownloadUrl?: string | null;
  googleDriveViewUrl?: string | null;
  coverImageUrl?: string | null;
  fileSize?: number | null;
  pageCount?: number | null;
  language?: string | null;
  isFree: boolean;
  price?: number | null;
  originalPrice?: number | null;
  whatIncluded?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  totalDownloads: number;
  totalSales: number;
}

export interface UpsertProductPayload {
  title: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  category: string;
  subCategory?: string;
  googleDriveFileId?: string;
  googleDriveDownloadUrl?: string;
  googleDriveViewUrl?: string;
  coverImageUrl?: string;
  fileSize?: number;
  pageCount?: number;
  language?: string;
  isFree: boolean;
  price?: number;
  originalPrice?: number;
  whatIncluded?: string;
  isActive: boolean;
  isFeatured: boolean;
}

export const searchProducts = (query: { category?: string; pricing?: 'Free' | 'Paid'; search?: string } = {}) =>
  apiFetch<ApiProduct[]>(`/api/products${toQueryString(query)}`);

export const getProductBySlug = (slug: string) =>
  apiFetch<ApiProduct>(`/api/products/${encodeURIComponent(slug)}`);

export const adminGetAllProducts = () =>
  apiFetch<ApiProduct[]>('/api/products/admin/all', { auth: true });

export const createProduct = (payload: UpsertProductPayload) =>
  apiFetch<ApiProduct>('/api/products', { method: 'POST', auth: true, body: payload });

export const updateProduct = (id: number, payload: UpsertProductPayload) =>
  apiFetch<ApiProduct>(`/api/products/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteProduct = (id: number) =>
  apiFetch<void>(`/api/products/${id}`, { method: 'DELETE', auth: true });
