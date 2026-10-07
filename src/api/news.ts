import { apiFetch } from './client';

export interface ApiNewsListItem {
  id: number;
  title: string;
  slug: string;
  featuredImage?: string | null;
  summary: string;
  categoryName: string;
  publishedDate: string;
  isBreaking: boolean;
  isFeatured: boolean;
}

export interface ApiNewsDetail extends ApiNewsListItem {
  titleGujarati?: string | null;
  content: string;
  contentGujarati?: string | null;
  categoryId?: number | null;
  source?: string | null;
  sourceLink?: string | null;
  views: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}

export interface UpsertNewsPayload {
  /** "Skip social posting" — publish without auto-sharing to Telegram / Facebook / Instagram. */
  skipSocial?: boolean;
  title: string;
  titleGujarati?: string;
  slug?: string;
  featuredImage?: string;
  summary: string;
  content: string;
  contentGujarati?: string;
  categoryId?: number; // required by the API — the admin form enforces it
  source?: string;
  sourceLink?: string;
  publishedDate?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isActive?: boolean;
}

export const getNews = () => apiFetch<ApiNewsListItem[]>('/api/news');
export const getNewsBySlug = (slug: string) => apiFetch<ApiNewsDetail>(`/api/news/${encodeURIComponent(slug)}`);

export const adminGetAllNews = () => apiFetch<ApiNewsListItem[]>('/api/news/admin/all', { auth: true });

export const createNews = (payload: UpsertNewsPayload) =>
  apiFetch<ApiNewsDetail>('/api/news', { method: 'POST', auth: true, body: payload });

export const updateNews = (id: number, payload: UpsertNewsPayload) =>
  apiFetch<ApiNewsDetail>(`/api/news/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteNews = (id: number) =>
  apiFetch<void>(`/api/news/${id}`, { method: 'DELETE', auth: true });

export interface ApiNewsCategoryOption { id: number; name: string }
/** Categories a news article may be filed under (a subset of the site categories). */
export const getAllowedNewsCategories = () =>
  apiFetch<ApiNewsCategoryOption[]>('/api/news/admin/categories', { auth: true });
