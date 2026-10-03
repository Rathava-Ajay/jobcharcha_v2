import { apiFetch } from './client';

export interface ApiGovtScheme {
  id: number;
  title: string;
  titleGujarati?: string | null;
  slug: string;
  ministry: string;
  category: string;
  eligibility: string;
  benefits: string;
  description?: string | null;
  applyLink: string;
  officialNotificationUrl?: string | null;
  isFeatured: boolean;
  displayOrder: number;
}

export interface ApiGovtSchemeListItem {
  id: number;
  title: string;
  slug: string;
  ministry: string;
  category: string;
  eligibility: string;
  benefits: string;
  applyLink: string;
  isFeatured: boolean;
}

export interface UpsertGovtSchemePayload {
  /** "Skip social posting" — publish without auto-sharing to Telegram / Facebook / Instagram. */
  skipSocial?: boolean;
  title: string;
  titleGujarati?: string;
  slug?: string;
  ministry: string;
  category: string;
  eligibility: string;
  benefits: string;
  description?: string;
  applyLink: string;
  officialNotificationUrl?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export const getGovtSchemes = () => apiFetch<ApiGovtSchemeListItem[]>('/api/govtschemes');
export const getGovtSchemeBySlug = (slug: string) => apiFetch<ApiGovtScheme>(`/api/govtschemes/${encodeURIComponent(slug)}`);

export const adminGetAllGovtSchemes = () => apiFetch<ApiGovtSchemeListItem[]>('/api/govtschemes/admin/all', { auth: true });

export const createGovtScheme = (payload: UpsertGovtSchemePayload) =>
  apiFetch<ApiGovtScheme>('/api/govtschemes', { method: 'POST', auth: true, body: payload });

export const updateGovtScheme = (id: number, payload: UpsertGovtSchemePayload) =>
  apiFetch<ApiGovtScheme>(`/api/govtschemes/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteGovtScheme = (id: number) =>
  apiFetch<void>(`/api/govtschemes/${id}`, { method: 'DELETE', auth: true });
