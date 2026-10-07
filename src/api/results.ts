import { apiFetch } from './client';

export interface ApiResultListItem {
  id: number;
  title: string;
  slug: string;
  examName?: string | null;
  organizationName: string;
  category: string;
  resultDate: string;
  isFeatured: boolean;
  viewsCount: number;
}

export interface ApiResultDetail extends ApiResultListItem {
  organizationLogo?: string | null;
  categoryId?: number | null;
  examDate?: string | null;
  resultLink?: string | null;
  resultPdf?: string | null;
  cutOffMarks?: string | null;
  selectedCandidates?: string | null;
  state?: string | null;
  district?: string | null;
  description?: string | null;
  faqSchemaJson?: string | null;
  cutOffBreakdownJson?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  focusKeyword?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
}

export interface UpsertResultPayload {
  /** "Skip social posting" — publish without auto-sharing to Telegram / Facebook / Instagram. */
  skipSocial?: boolean;
  title: string;
  slug?: string;
  examName?: string;
  organizationName: string;
  organizationLogo?: string;
  categoryId?: number;
  resultDate: string;
  examDate?: string;
  resultLink?: string;
  resultPdf?: string;
  cutOffMarks?: string;
  selectedCandidates?: string;
  state?: string;
  district?: string;
  description?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface AiImportResultFaqItem { question: string; answer: string; }
export interface AiImportCutOffRow { postName: string; general?: string | null; sc?: string | null; st?: string | null; obc?: string | null; ews?: string | null; }

export interface AiImportResultPayload {
  /** "Skip social posting" — publish without auto-sharing to Telegram / Facebook / Instagram. */
  skipSocial?: boolean;
  title: string;
  slug?: string | null;
  examName?: string | null;
  organizationName: string;
  categoryId: number;
  focusKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  internalLinkAnchors: string[];
  resultDate: string;
  examDate?: string | null;
  resultLink?: string | null;
  resultPdf?: string | null;
  cutOffMarks?: string | null;
  selectedCandidates?: string | null;
  state?: string | null;
  location?: string | null;
  shortDescription: string;
  description: string;
  faqSchema: AiImportResultFaqItem[];
  cutOffBreakdown: AiImportCutOffRow[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  autoPublish: boolean;
}

export const aiImportResult = (payload: AiImportResultPayload) =>
  apiFetch<ApiResultDetail>('/api/results/ai-import', { method: 'POST', auth: true, body: payload });

export const getResults = () => apiFetch<ApiResultListItem[]>('/api/results');
export const getResultBySlug = (slug: string) => apiFetch<ApiResultDetail>(`/api/results/${encodeURIComponent(slug)}`);

export const adminGetAllResults = () => apiFetch<ApiResultListItem[]>('/api/results/admin/all', { auth: true });

export const createResult = (payload: UpsertResultPayload) =>
  apiFetch<ApiResultDetail>('/api/results', { method: 'POST', auth: true, body: payload });

export const updateResult = (id: number, payload: UpsertResultPayload) =>
  apiFetch<ApiResultDetail>(`/api/results/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteResult = (id: number) =>
  apiFetch<void>(`/api/results/${id}`, { method: 'DELETE', auth: true });
