import { apiFetch } from './client';

export interface ApiBlogListItem {
  id: number;
  title: string;
  slug: string;
  featuredImage?: string | null;
  excerpt: string;
  categoryName: string;
  author?: string | null;
  publishedDate: string;
  readTime: number;
  isFeatured: boolean;
  isPublished: boolean;
}

export interface ApiBlogDetail extends ApiBlogListItem {
  titleGujarati?: string | null;
  officialNotificationUrl?: string | null;
  content: string;
  contentGujarati?: string | null;
  categoryId?: number | null;
  tags?: string | null;
  views: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
}

export interface UpsertBlogPayload {
  title: string;
  titleGujarati?: string;
  slug?: string;
  featuredImage?: string;
  officialNotificationUrl?: string | null;
  excerpt: string;
  content: string;
  contentGujarati?: string;
  categoryId?: number;
  tags?: string;
  author?: string;
  publishedDate?: string;
  readTime?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isActive?: boolean;
}

export const getBlogPosts = () => apiFetch<ApiBlogListItem[]>('/api/blog');
export const getBlogPostBySlug = (slug: string) => apiFetch<ApiBlogDetail>(`/api/blog/${encodeURIComponent(slug)}`);

export const adminGetAllBlogPosts = () => apiFetch<ApiBlogListItem[]>('/api/blog/admin/all', { auth: true });
export const adminGetBlogPostById = (id: number) => apiFetch<ApiBlogDetail>(`/api/blog/admin/${id}`, { auth: true });

export const createBlogPost = (payload: UpsertBlogPayload) =>
  apiFetch<ApiBlogDetail>('/api/blog', { method: 'POST', auth: true, body: payload });

export const updateBlogPost = (id: number, payload: UpsertBlogPayload) =>
  apiFetch<ApiBlogDetail>(`/api/blog/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteBlogPost = (id: number) =>
  apiFetch<void>(`/api/blog/${id}`, { method: 'DELETE', auth: true });
