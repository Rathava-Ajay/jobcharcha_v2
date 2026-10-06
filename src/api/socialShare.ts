import { apiFetch, toQueryString } from './client';
import { PagedResult } from './jobs';

/** The five categories that auto-share. Values match the backend's ContentCategories. */
export type ShareCategory = 'job' | 'result' | 'admitcard' | 'scheme' | 'news';
export type ShareChannel = 'telegram' | 'instagram' | 'facebook';

export const SHARE_CATEGORIES: { id: ShareCategory; label: string }[] = [
  { id: 'job', label: 'Jobs' },
  { id: 'result', label: 'Results' },
  { id: 'admitcard', label: 'Admit cards' },
  { id: 'scheme', label: 'Schemes' },
  { id: 'news', label: 'News' },
];

export const SHARE_STATUS = { AwaitingApproval: 0, Pending: 1, Posted: 2, Failed: 3, Skipped: 4, Processing: 5 } as const;

export interface ApiSocialShare {
  id: number;
  category: ShareCategory;
  entityId: number;
  channel: ShareChannel;
  generation: number;
  /** 0-5: which colour template the image uses (null for older shares). Posts rotate through the six. */
  template?: number | null;
  status: number;
  attempts: number;
  nextAttemptAt?: string | null;
  title: string;
  url: string;
  imageUrl?: string | null;
  message?: string | null;
  externalId?: string | null;
  error?: string | null;
  trigger: 'publish' | 'manual';
  createdDate: string;
  updatedDate: string;
  postedAt?: string | null;
}

export interface ApiSocialSummary {
  awaitingApproval: number;
  queued: number;
  posted: number;
  failed: number;
  skipped: number;
}

export interface ApiSocialSetting {
  category: ShareCategory;
  telegramEnabled: boolean;
  instagramEnabled: boolean;
  facebookEnabled: boolean;
  requireApproval: boolean;
  telegramTemplate?: string | null;
  captionTemplate?: string | null;
  hashtags?: string | null;
  imageStyle?: string | null;
  imageSize: 'square' | 'portrait';
  brandColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  updatedDate?: string | null;
  defaultTelegramTemplate: string;
  defaultCaptionTemplate: string;
  defaultHashtags: string;
  placeholders: string[];
}

export type UpdateSocialSettingPayload = Omit<
  ApiSocialSetting,
  'category' | 'updatedDate' | 'defaultTelegramTemplate' | 'defaultCaptionTemplate' | 'defaultHashtags' | 'placeholders'
>;

export interface ApiMetaTokenStatus {
  /** 0 Unknown, 1 Ok, 2 ExpiringSoon, 3 Expired, 4 Invalid, 5 NotConfigured */
  state: number;
  expiresAt?: string | null;
  daysLeft?: number | null;
  warning?: string | null;
  missingPermissions: string[];
}

export interface ApiSocialStatus {
  telegram: { configured: boolean; hint?: string | null };
  facebook: { configured: boolean; hint?: string | null };
  instagram: { configured: boolean; hint?: string | null };
  metaToken: ApiMetaTokenStatus;
  warnings: string[];
  /** 0-5: the template the next published post will use. */
  nextTemplate: number;
  templateNames: string[];
}

const base = '/api/admin/social';

export const getSocialStatus = (refresh = false) =>
  apiFetch<ApiSocialStatus>(`${base}/status${refresh ? '?refresh=true' : ''}`, { auth: true });

export const getSocialSummary = () =>
  apiFetch<ApiSocialSummary>(`${base}/jobs/summary`, { auth: true });

export const searchSocialShares = (params: { status?: number; category?: ShareCategory; channel?: ShareChannel; page?: number; pageSize?: number }) =>
  apiFetch<PagedResult<ApiSocialShare>>(`${base}/jobs${toQueryString(params)}`, { auth: true });

export const approveSocialShare = (id: number, message?: string) =>
  apiFetch<void>(`${base}/jobs/${id}/approve`, { method: 'POST', auth: true, body: { message } });

export const rejectSocialShare = (id: number) =>
  apiFetch<void>(`${base}/jobs/${id}/reject`, { method: 'POST', auth: true });

export const cancelSocialShare = (id: number) =>
  apiFetch<void>(`${base}/jobs/${id}/cancel`, { method: 'POST', auth: true });

/** The post is already live on the channel: mark it posted so it is never posted again. */
export const completeSocialShare = (id: number) =>
  apiFetch<void>(`${base}/jobs/${id}/complete`, { method: 'POST', auth: true });

export const retrySocialShare =(id: number) =>
  apiFetch<void>(`${base}/jobs/${id}/retry`, { method: 'POST', auth: true });

export const regenerateSocialShare = (id: number) =>
  apiFetch<void>(`${base}/jobs/${id}/regenerate`, { method: 'POST', auth: true });

/** Manual "Share again" for a live post. Resolves to how many channel shares were queued. */
export const shareAgain = (category: ShareCategory, entityId: number) =>
  apiFetch<{ queued: number }>(`${base}/share-again`, { method: 'POST', auth: true, body: { category, entityId } });

export const getSocialSettings = () =>
  apiFetch<ApiSocialSetting[]>(`${base}/settings`, { auth: true });

export const updateSocialSetting = (category: ShareCategory, payload: UpdateSocialSettingPayload) =>
  apiFetch<ApiSocialSetting>(`${base}/settings/${category}`, { method: 'PUT', auth: true, body: payload });

/** Test message to the Telegram channel. */
export const sendTelegramTest = () =>
  apiFetch<{ messageId: string }>(`${base}/telegram-test`, { method: 'POST', auth: true });

/** Sample image rendered with the branded template (free). Returns an object URL for an <img>. */
export async function fetchSocialPreviewImage(params: { category: ShareCategory; size: string; brand?: string; accent?: string; template?: number }): Promise<string> {
  const { getStoredTokens, API_BASE_URL } = await import('./client');
  const token = getStoredTokens()?.accessToken;
  const res = await fetch(`${API_BASE_URL}${base}/preview-image${toQueryString(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Could not render the preview.');
  return URL.createObjectURL(await res.blob());
}

/** The share image for an existing published post, exactly as it would be shared. */
export async function fetchPostPreview(category: ShareCategory, entityId: number): Promise<string> {
  const { getStoredTokens, API_BASE_URL, ApiError } = await import('./client');
  const token = getStoredTokens()?.accessToken;
  const res = await fetch(`${API_BASE_URL}${base}/post-preview${toQueryString({ category, entityId })}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    let message = res.status === 401 || res.status === 403 ? "You are not allowed to preview share images. Sign in as an admin again."
      : res.status === 404 ? "The API has no preview endpoint (HTTP 404). Restart the API so it runs the latest build."
      : `The server could not render the preview (HTTP ${res.status}). Check the API log.`;
    try { message = (await res.json()).error || message; } catch { /* no JSON body */ }
    throw new ApiError(res.status, message);
  }
  return URL.createObjectURL(await res.blob());
}

/** Rebuilds the share image around a picture the admin made (JPG / PNG / WebP, up to 10 MB). Only while the share awaits approval. */
export function uploadHero(shareId: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ imageUrl: string }>(`${base}/jobs/${shareId}/hero`, { method: 'POST', auth: true, isFormData: true, body: form, timeoutMs: 60000 });
}

// ---- HTML poster designer ------------------------------------------------------------------------

export interface ApiPosterDataPoint { token: string; label: string; sample: string }
export interface ApiPosterTemplate { slot: number; name: string; /** true once the admin saved their own HTML for this slot */ custom: boolean; html: string }
export interface ApiPosterTemplates { browserPath?: string | null; dataPoints: ApiPosterDataPoint[]; templates: ApiPosterTemplate[] }

export const getPosterTemplates = () => apiFetch<ApiPosterTemplates>(`${base}/templates`, { auth: true });

export const getDefaultPosterHtml = (slot: number) => apiFetch<{ html: string }>(`${base}/templates/${slot}/default`, { auth: true });

export const savePosterTemplate = (slot: number, html: string) =>
  apiFetch<void>(`${base}/templates/${slot}`, { method: 'PUT', auth: true, body: { html } });

/** Back to the built-in poster for this slot. */
export const resetPosterTemplate = (slot: number) =>
  apiFetch<void>(`${base}/templates/${slot}`, { method: 'DELETE', auth: true });

/** Draws unsaved HTML on the server (headless Chrome) with sample data. Returns an object URL for an <img>. */
export async function renderPosterTemplate(html: string, template: number, size: 'portrait' | 'square', category = 'job'): Promise<string> {
  const { getStoredTokens, API_BASE_URL, ApiError } = await import('./client');
  const token = getStoredTokens()?.accessToken;
  const res = await fetch(`${API_BASE_URL}${base}/templates/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ html, template, size, category }),
  });
  if (!res.ok) {
    let message = `The server could not draw the poster (HTTP ${res.status}).`;
    try { message = (await res.json()).error || message; } catch { /* no JSON body */ }
    throw new ApiError(res.status, message);
  }
  return URL.createObjectURL(await res.blob());
}
