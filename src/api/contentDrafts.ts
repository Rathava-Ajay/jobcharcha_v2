import { apiFetch, toQueryString } from './client';
import { PagedResult } from './jobs';

export type ContentCategory = 'result' | 'admitcard' | 'oldpaper' | 'news' | 'scheme' | 'study';

export const CONTENT_DRAFT_STATUS = { Pending: 0, Approved: 1, Rejected: 2 } as const;
export const SYNC_STATUS = { Queued: 0, Running: 1, Completed: 2, Failed: 3 } as const;

export interface ApiContentSyncRun {
  id: number;
  category: ContentCategory;
  status: number;
  startedAt: string;
  finishedAt?: string | null;
  newCount: number;
  skippedCount: number;
  invalidCount: number;
  errorMessage?: string | null;
}

export interface ApiContentCategorySummary {
  category: ContentCategory;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  lastRun?: ApiContentSyncRun | null;
}

export interface ApiContentDraftListItem {
  id: number;
  category: ContentCategory;
  sourceName: string;
  sourceUrl?: string | null;
  title: string;
  summary?: string | null;
  status: number;
  createdDate: string;
}

export interface ApiContentDraft extends ApiContentDraftListItem {
  payload: Record<string, unknown>;
  createdEntityId?: number | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
}

export interface ApiContentSource {
  id: number;
  category: ContentCategory;
  name: string;
  sourceType: number; // 0 = Website, 1 = Telegram channel
  url: string;
  isActive: boolean;
  createdDate: string;
}

export interface UpsertContentSourcePayload {
  category: ContentCategory;
  name: string;
  sourceType: number;
  url: string;
  isActive: boolean;
}

const base = '/api/admin/content-drafts';

export const getContentSummary = () =>
  apiFetch<ApiContentCategorySummary[]>(`${base}/summary`, { auth: true });

export const searchContentDrafts = (category: ContentCategory, status: number, page = 1, pageSize = 30) =>
  apiFetch<PagedResult<ApiContentDraftListItem>>(`${base}${toQueryString({ category, status, page, pageSize })}`, { auth: true });

export const getContentDraft = (id: number) =>
  apiFetch<ApiContentDraft>(`${base}/${id}`, { auth: true });

export const approveContentDraft = (id: number, payload?: Record<string, unknown>) =>
  apiFetch<{ createdEntityId: number }>(`${base}/${id}/approve`, { method: 'POST', auth: true, body: { payload } });

export const rejectContentDraft = (id: number, reviewNotes?: string) =>
  apiFetch<void>(`${base}/${id}/reject`, { method: 'POST', auth: true, body: { reviewNotes } });

export const deleteContentDraft = (id: number) =>
  apiFetch<void>(`${base}/${id}`, { method: 'DELETE', auth: true });

/** Starts the AI agent for one category, or every category (one after another) when omitted. */
export const startContentSync = (category?: ContentCategory) =>
  apiFetch<ApiContentSyncRun[]>(`${base}/sync`, { method: 'POST', auth: true, body: { category: category ?? null } });

export const getContentSyncRuns = (category?: ContentCategory) =>
  apiFetch<ApiContentSyncRun[]>(`${base}/sync/runs${toQueryString({ category })}`, { auth: true });

export const getContentSources = (category?: ContentCategory) =>
  apiFetch<ApiContentSource[]>(`${base}/sources${toQueryString({ category })}`, { auth: true });

export const createContentSource = (payload: UpsertContentSourcePayload) =>
  apiFetch<ApiContentSource>(`${base}/sources`, { method: 'POST', auth: true, body: payload });

export const updateContentSource = (id: number, payload: UpsertContentSourcePayload) =>
  apiFetch<ApiContentSource>(`${base}/sources/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteContentSource = (id: number) =>
  apiFetch<void>(`${base}/sources/${id}`, { method: 'DELETE', auth: true });
