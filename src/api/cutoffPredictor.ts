import { apiFetch, toQueryString } from './client';

export interface ApiCutOffExamOption {
  slug: string;
  examName: string;
  organizationName: string;
  recordCount: number;
}

export interface ApiCutOffCategoryValues {
  general?: number | null;
  sc?: number | null;
  st?: number | null;
  obc?: number | null;
  ews?: number | null;
  pwD?: number | null;
  exServiceman?: number | null;
  women?: number | null;
}

export interface ApiCutOffRecord {
  id: number;
  examName: string;
  slug: string;
  organizationName: string;
  year: number;
  postName: string;
  series?: string | null;
  categories: ApiCutOffCategoryValues;
  totalPosts?: number | null;
  totalCandidatesAppeared?: number | null;
  isVerified: boolean;
}

export interface ApiCutOffHistoricalPoint {
  year: number;
  cutOff: number;
}

export interface ApiCutOffPrediction {
  examName: string;
  organizationName: string;
  postName: string;
  category: string;
  historicalPoints: ApiCutOffHistoricalPoint[];
  predictedYear: number;
  predictedCutOff: number;
  trend: 'Rising' | 'Falling' | 'Stable';
  confidence: 'Low' | 'Medium' | 'High';
}

export const CUTOFF_CATEGORIES = ['General', 'SC', 'ST', 'OBC', 'EWS', 'PwD', 'ExServiceman', 'Women'] as const;

export const getCutOffExams = () => apiFetch<ApiCutOffExamOption[]>('/api/cutoff-predictor/exams');

export const getCutOffPostNames = (slug: string) =>
  apiFetch<string[]>(`/api/cutoff-predictor/exams/${encodeURIComponent(slug)}/posts`);

export const searchCutOffRecords = (query: { slug?: string; year?: number; postName?: string }) =>
  apiFetch<ApiCutOffRecord[]>(`/api/cutoff-predictor/records${toQueryString(query)}`);

export const predictCutOff = (slug: string, postName: string, category: string) =>
  apiFetch<ApiCutOffPrediction>(`/api/cutoff-predictor/predict${toQueryString({ slug, postName, category })}`);
