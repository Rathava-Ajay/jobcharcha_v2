import { apiFetch, toQueryString } from './client';

export interface AuditEvent {
  id: number;
  eventType: string;
  category: string;
  summary: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadataJson?: string | null;
  ipAddress?: string | null;
  createdDate: string;
}

export interface AuditPage {
  items: AuditEvent[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuditCategoryFacet {
  category: string;
  eventTypes: string[];
}

export interface SignupSourceStat {
  source: string;
  aspirants: number;
  employers: number;
  other: number;
  total: number;
}

export interface AuditQueryParams {
  category?: string;
  eventType?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Newest-first feed of end-user activity for the admin "Activity Audit" screen. */
export const adminGetAuditEvents = (params: AuditQueryParams = {}) =>
  apiFetch<AuditPage>(`/api/admin/audit${toQueryString(params)}`, { auth: true });

/** Category → event-type map that drives the filter dropdowns. */
export const adminGetAuditCategories = () =>
  apiFetch<AuditCategoryFacet[]>('/api/admin/audit/categories', { auth: true });

/** Signup counts grouped by attribution source (e.g. how many came from Instagram). */
export const adminGetSignupSources = (params: { from?: string; to?: string } = {}) =>
  apiFetch<SignupSourceStat[]>(`/api/admin/audit/signup-sources${toQueryString(params)}`, { auth: true });
