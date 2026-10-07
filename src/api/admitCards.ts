import { apiFetch } from './client';

export interface ApiAdmitCardListItem {
  id: number;
  title: string;
  slug: string;
  examName?: string | null;
  organizationName: string;
  category: string;
  releaseDate: string;
  examDate?: string | null;
  status: 'Released' | 'Upcoming';
  isFeatured: boolean;
  viewsCount: number;
}

export interface ApiAdmitCardDetail extends ApiAdmitCardListItem {
  organizationLogo?: string | null;
  categoryId?: number | null;
  downloadUrl?: string | null;
  downloadLink?: string | null;
  admitCardPdf?: string | null;
  postName?: string | null;
  year?: number | null;
  state?: string | null;
  district?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  instructions?: string | null;
  howToDownload?: string | null;
  importantNotes?: string | null;
  faqSchemaJson?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  focusKeyword?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  downloadCount: number;
}

export interface UpsertAdmitCardPayload {
  /** "Skip social posting" — publish without auto-sharing to Telegram / Facebook / Instagram. */
  skipSocial?: boolean;
  title: string;
  slug?: string;
  examName?: string;
  organizationName: string;
  organizationLogo?: string;
  categoryId?: number;
  admitCardReleaseDate: string;
  examDate?: string;
  downloadLink?: string;
  admitCardPdf?: string;
  postName?: string;
  year?: number;
  state?: string;
  district?: string;
  description?: string;
  instructions?: string;
  howToDownload?: string;
  importantNotes?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface AiImportAdmitCardFaqItem { question: string; answer: string; }

export interface AiImportAdmitCardPayload {
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
  admitCardReleaseDate: string;
  examDate?: string | null;
  downloadLink?: string | null;
  admitCardPdf?: string | null;
  postName?: string | null;
  year?: number | null;
  state?: string | null;
  location?: string | null;
  shortDescription: string;
  description: string;
  howToDownload?: string | null;
  instructionsForExam: string[];
  documentsToCarryForExam: string[];
  faqSchema: AiImportAdmitCardFaqItem[];
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  autoPublish: boolean;
}

export const aiImportAdmitCard = (payload: AiImportAdmitCardPayload) =>
  apiFetch<ApiAdmitCardDetail>('/api/admitcards/ai-import', { method: 'POST', auth: true, body: payload });

export const getAdmitCards = () => apiFetch<ApiAdmitCardListItem[]>('/api/admitcards');
export const getAdmitCardBySlug = (slug: string) => apiFetch<ApiAdmitCardDetail>(`/api/admitcards/${encodeURIComponent(slug)}`);

export const adminGetAllAdmitCards = () => apiFetch<ApiAdmitCardListItem[]>('/api/admitcards/admin/all', { auth: true });

export const createAdmitCard = (payload: UpsertAdmitCardPayload) =>
  apiFetch<ApiAdmitCardDetail>('/api/admitcards', { method: 'POST', auth: true, body: payload });

export const updateAdmitCard = (id: number, payload: UpsertAdmitCardPayload) =>
  apiFetch<ApiAdmitCardDetail>(`/api/admitcards/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteAdmitCard = (id: number) =>
  apiFetch<void>(`/api/admitcards/${id}`, { method: 'DELETE', auth: true });
