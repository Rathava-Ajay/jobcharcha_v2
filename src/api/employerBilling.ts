import { apiFetch, toQueryString } from './client';
import {
  EmployerPlan, EmployerSubscriptionInfo, EmployerCreditsInfo, ContactHistoryItem, EmployerAcknowledgmentStatus,
} from '../types';

export interface ApiEmployerPlan {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
  isTopUp: boolean;
  includedCredits: number;
  isUnlimitedCredits: boolean;
  maxActiveJobs: number;
  maxFeaturedJobs: number;
  canAccessResumes: boolean;
  resumeViewsPerMonth: number;
  displayOrder: number;
  isActive: boolean;
}

export interface UpsertEmployerPlanPayload {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  isTopUp: boolean;
  includedCredits: number;
  isUnlimitedCredits: boolean;
  maxActiveJobs: number;
  maxFeaturedJobs: number;
  canAccessResumes: boolean;
  resumeViewsPerMonth: number;
  displayOrder: number;
  isActive?: boolean;
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

interface ApiContactHistoryItem {
  id: number;
  candidateUserId: string;
  candidateName: string;
  status: string;
  creditDeducted: boolean;
  initialMessage?: string | null;
  createdDate: string;
}

interface ApiPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ApiAcknowledgmentStatus {
  hasAcknowledgedLatest: boolean;
  planVersion?: string | null;
  acceptedAt?: string | null;
  currentPlanVersion: string;
}

function toAppPlan(dto: ApiEmployerPlan): EmployerPlan {
  return {
    id: String(dto.id),
    name: dto.name,
    description: dto.description || undefined,
    price: dto.price,
    durationDays: dto.durationDays,
    isTopUp: dto.isTopUp,
    includedCredits: dto.includedCredits,
    isUnlimitedCredits: dto.isUnlimitedCredits,
    maxActiveJobs: dto.maxActiveJobs,
    maxFeaturedJobs: dto.maxFeaturedJobs,
    canAccessResumes: dto.canAccessResumes,
    resumeViewsPerMonth: dto.resumeViewsPerMonth,
    displayOrder: dto.displayOrder,
    isActive: dto.isActive,
  };
}

function toAppSubscription(dto: ApiEmployerSubscription): EmployerSubscriptionInfo {
  return {
    id: dto.id != null ? String(dto.id) : undefined,
    planName: dto.planName || undefined,
    status: dto.status as EmployerSubscriptionInfo['status'],
    startDate: dto.startDate || undefined,
    endDate: dto.endDate || undefined,
    daysRemaining: dto.daysRemaining ?? undefined,
    autoRenew: dto.autoRenew,
    maxActiveJobs: dto.maxActiveJobs,
    maxFeaturedJobs: dto.maxFeaturedJobs,
    canAccessResumes: dto.canAccessResumes,
  };
}

function toAppCredits(dto: ApiEmployerCredits): EmployerCreditsInfo {
  return { totalCredits: dto.totalCredits, usedCredits: dto.usedCredits, creditsRemaining: dto.creditsRemaining, isUnlimited: dto.isUnlimited };
}

function toAppHistoryItem(dto: ApiContactHistoryItem): ContactHistoryItem {
  return {
    id: String(dto.id),
    candidateUserId: dto.candidateUserId,
    candidateName: dto.candidateName,
    status: dto.status,
    creditDeducted: dto.creditDeducted,
    initialMessage: dto.initialMessage || undefined,
    createdDate: dto.createdDate,
  };
}

function toAppAcknowledgment(dto: ApiAcknowledgmentStatus): EmployerAcknowledgmentStatus {
  return {
    hasAcknowledgedLatest: dto.hasAcknowledgedLatest,
    planVersion: dto.planVersion || undefined,
    acceptedAt: dto.acceptedAt || undefined,
    currentPlanVersion: dto.currentPlanVersion,
  };
}

export const getEmployerPlans = () => apiFetch<ApiEmployerPlan[]>('/api/employer-plans').then((r) => r.map(toAppPlan));

export const adminGetAllEmployerPlans = () => apiFetch<ApiEmployerPlan[]>('/api/employer-plans/admin/all', { auth: true }).then((r) => r.map(toAppPlan));

export const createEmployerPlan = (payload: UpsertEmployerPlanPayload) =>
  apiFetch<ApiEmployerPlan>('/api/employer-plans', { method: 'POST', auth: true, body: payload }).then(toAppPlan);

export const updateEmployerPlan = (id: string, payload: UpsertEmployerPlanPayload) =>
  apiFetch<ApiEmployerPlan>(`/api/employer-plans/${id}`, { method: 'PUT', auth: true, body: payload }).then(toAppPlan);

export const deleteEmployerPlan = (id: string) =>
  apiFetch<void>(`/api/employer-plans/${id}`, { method: 'DELETE', auth: true });

export const getSubscription = () => apiFetch<ApiEmployerSubscription>('/api/employer/subscription', { auth: true }).then(toAppSubscription);

export const getCredits = () => apiFetch<ApiEmployerCredits>('/api/employer/credits', { auth: true }).then(toAppCredits);

export async function getContactHistory(page = 1, pageSize = 20): Promise<{ items: ContactHistoryItem[]; totalCount: number }> {
  const result = await apiFetch<ApiPagedResult<ApiContactHistoryItem>>(`/api/employer/contact-history${toQueryString({ page, pageSize })}`, { auth: true });
  return { items: result.items.map(toAppHistoryItem), totalCount: result.totalCount };
}

export interface EmployerCreateOrderResponse {
  paymentId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export const renewSubscription = (employerPlanId: string) =>
  apiFetch<EmployerCreateOrderResponse>('/api/employer/subscription/renew', { method: 'POST', auth: true, body: { employerPlanId: Number(employerPlanId) } });

export const topUpCredits = (employerPlanId: string) =>
  apiFetch<EmployerCreateOrderResponse>('/api/employer/credits/top-up', { method: 'POST', auth: true, body: { employerPlanId: Number(employerPlanId) } });

export interface EmployerVerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface EmployerVerifyPaymentResponse {
  paid: boolean;
  isTopUp: boolean;
  planName: string;
  creditsGranted: number;
}

export const verifyEmployerPayment = (payload: EmployerVerifyPaymentPayload) =>
  apiFetch<EmployerVerifyPaymentResponse>('/api/employer/payments/verify', { method: 'POST', auth: true, body: payload });

export const getAcknowledgmentStatus = () => apiFetch<ApiAcknowledgmentStatus>('/api/employer/acknowledge-terms', { auth: true }).then(toAppAcknowledgment);

export const acknowledgeTerms = (planVersion: string) =>
  apiFetch<void>('/api/employer/acknowledge-terms', { method: 'POST', auth: true, body: { planVersion } });
