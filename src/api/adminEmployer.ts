import { apiFetch, toQueryString } from './client';
import { EmployerSubscriptionInfo, EmployerCreditsInfo } from '../types';

export interface AdminContactLogQuery {
  employerProfileId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ApiAdminContactLogItem {
  id: number;
  employerProfileId: number;
  companyName: string;
  candidateUserId: string;
  candidateName: string;
  status: string;
  creditDeducted: boolean;
  createdDate: string;
}

interface ApiPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ApiEmployerSubscription {
  id?: number | null;
  planName?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  daysRemaining?: number | null;
  autoRenew: boolean;
  maxActiveJobs: number;
  maxFeaturedJobs: number;
  canAccessResumes: boolean;
}

interface ApiEmployerCredits {
  totalCredits: number;
  usedCredits: number;
  creditsRemaining: number;
  isUnlimited: boolean;
}

export interface ApiAdminEmployerOverview {
  employerProfileId: number;
  companyName: string;
  subscription: ApiEmployerSubscription;
  credits: ApiEmployerCredits;
  recentContactLogs: ApiAdminContactLogItem[];
}

export interface AdminEmployerOverview {
  employerProfileId: string;
  companyName: string;
  subscription: EmployerSubscriptionInfo;
  credits: EmployerCreditsInfo;
  recentContactLogs: ApiAdminContactLogItem[];
}

export interface ApiFraudFlag {
  employerProfileId: number;
  companyName: string;
  contactsToday: number;
  threshold: number;
}

export async function adminGetContactLogs(query: AdminContactLogQuery): Promise<{ items: ApiAdminContactLogItem[]; totalCount: number }> {
  const result = await apiFetch<ApiPagedResult<ApiAdminContactLogItem>>(`/api/admin/contact-logs${toQueryString(query)}`, { auth: true });
  return { items: result.items, totalCount: result.totalCount };
}

export async function adminGetEmployerOverview(employerProfileId: string): Promise<AdminEmployerOverview> {
  const dto = await apiFetch<ApiAdminEmployerOverview>(`/api/admin/employers/${employerProfileId}/overview`, { auth: true });
  return {
    employerProfileId: String(dto.employerProfileId),
    companyName: dto.companyName,
    subscription: {
      id: dto.subscription.id != null ? String(dto.subscription.id) : undefined,
      planName: dto.subscription.planName || undefined,
      status: dto.subscription.status as EmployerSubscriptionInfo['status'],
      startDate: dto.subscription.startDate || undefined,
      endDate: dto.subscription.endDate || undefined,
      daysRemaining: dto.subscription.daysRemaining ?? undefined,
      autoRenew: dto.subscription.autoRenew,
      maxActiveJobs: dto.subscription.maxActiveJobs,
      maxFeaturedJobs: dto.subscription.maxFeaturedJobs,
      canAccessResumes: dto.subscription.canAccessResumes,
    },
    credits: dto.credits,
    recentContactLogs: dto.recentContactLogs,
  };
}

export const adminAdjustCredits = (employerProfileId: string, amount: number, reason: string) =>
  apiFetch<void>(`/api/admin/employers/${employerProfileId}/credits/adjust`, {
    method: 'POST', auth: true, body: { employerProfileId: Number(employerProfileId), amount, reason },
  });

export const adminGetFraudFlags = (threshold = 20) =>
  apiFetch<ApiFraudFlag[]>(`/api/admin/employers/fraud-flags${toQueryString({ threshold })}`, { auth: true });
