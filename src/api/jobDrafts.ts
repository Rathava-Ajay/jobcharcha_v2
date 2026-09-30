import { apiFetch, toQueryString } from './client';
import { AiImportJobPayload, ApiJobDetail, PagedResult } from './jobs';

export interface ApiJobFeedSource {
  id: number;
  name: string;
  organizationHint?: string | null;
  sourceType: number; // 0 = Website, 1 = Telegram Channel
  url: string;
  defaultCategoryId?: number | null;
  defaultCategoryName?: string | null;
  stateHint?: string | null;
  lastFetchedAt?: string | null;
  lastFetchNewCount: number;
  lastFetchSkippedReviewedCount: number;
  lastFetchSkippedPendingCount: number;
  lastError?: string | null;
  isActive: boolean;
  createdDate: string;
}

export interface UpsertJobFeedSourcePayload {
  name: string;
  organizationHint?: string | null;
  sourceType: number;
  url: string;
  defaultCategoryId?: number | null;
  stateHint?: string | null;
  isActive: boolean;
}

export const JOB_DRAFT_STATUS = { Pending: 0, Approved: 1, Rejected: 2 } as const;

export interface ApiJobDraftListItem {
  id: number;
  sourceName: string;
  sourceUrl?: string | null;
  title: string;
  organizationName?: string | null;
  totalPosts?: number | null;
  lastDate?: string | null;
  shortDescription?: string | null;
  suggestedCategoryId?: number | null;
  suggestedCategoryName?: string | null;
  state?: string | null;
  status: number;
  createdDate: string;
}

export interface ApiJobDraft extends ApiJobDraftListItem {
  feedSourceId?: number | null;
  notificationDate?: string | null;
  rawContent?: string | null;
  createdJobId?: number | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
}

// Feed sources (sites/Telegram channels the watcher agent polls)
export const getJobFeedSources = () =>
  apiFetch<ApiJobFeedSource[]>('/api/admin/job-feed-sources', { auth: true });

export const createJobFeedSource = (payload: UpsertJobFeedSourcePayload) =>
  apiFetch<ApiJobFeedSource>('/api/admin/job-feed-sources', { method: 'POST', auth: true, body: payload });

export const updateJobFeedSource = (id: number, payload: UpsertJobFeedSourcePayload) =>
  apiFetch<ApiJobFeedSource>(`/api/admin/job-feed-sources/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteJobFeedSource = (id: number) =>
  apiFetch<void>(`/api/admin/job-feed-sources/${id}`, { method: 'DELETE', auth: true });

export const syncWatcherNow = () =>
  apiFetch<void>('/api/admin/job-feed-sources/sync-now', { method: 'POST', auth: true });

// Draft queue (items the watcher agent found, awaiting admin review)
export const searchJobDrafts = (status?: number, page = 1, pageSize = 20) =>
  apiFetch<PagedResult<ApiJobDraftListItem>>(`/api/admin/job-drafts${toQueryString({ status, page, pageSize })}`, { auth: true });

export const getJobDraft = (id: number) =>
  apiFetch<ApiJobDraft>(`/api/admin/job-drafts/${id}`, { auth: true });

export const approveJobDraft = (id: number, payload: AiImportJobPayload) =>
  apiFetch<ApiJobDetail>(`/api/admin/job-drafts/${id}/approve`, { method: 'POST', auth: true, body: payload });

export const rejectJobDraft = (id: number, reviewNotes?: string) =>
  apiFetch<void>(`/api/admin/job-drafts/${id}/reject`, { method: 'POST', auth: true, body: { reviewNotes } });

export const deleteJobDraft = (id: number) =>
  apiFetch<void>(`/api/admin/job-drafts/${id}`, { method: 'DELETE', auth: true });
