import { apiFetch } from './client';

export interface ApiProviderTotals {
  calls: number;
  units: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** input + output + cache read + cache write */
  totalTokens: number;
  costUsd: number;
}

export interface ApiAiUsageDay {
  /** yyyy-MM-dd in India time (IST) */
  date: string;
  claude: ApiProviderTotals;
  openAi: ApiProviderTotals;
}

export interface ApiAiUsageBreakdown {
  provider: 'claude' | 'openai';
  operation: 'sync' | 'image';
  category?: string | null;
  totals: ApiProviderTotals;
}

export interface ApiAiUsageEntry {
  id: number;
  occurredAt: string;
  provider: 'claude' | 'openai';
  operation: 'sync' | 'image';
  category?: string | null;
  model?: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  costUsd?: number | null;
  units: number;
  durationMs?: number | null;
  referenceId?: number | null;
  note?: string | null;
}

export interface ApiAiUsageReport {
  days: number;
  today: ApiAiUsageDay;
  total: ApiAiUsageDay;
  perDay: ApiAiUsageDay[];
  breakdown: ApiAiUsageBreakdown[];
  recent: ApiAiUsageEntry[];
  openAiInputUsdPerMTok: number;
  openAiOutputUsdPerMTok: number;
}

export const getAiUsage = (days = 7) => apiFetch<ApiAiUsageReport>(`/api/admin/ai-usage?days=${days}`, { auth: true });
