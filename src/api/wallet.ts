import { apiFetch } from './client';

export interface WalletBalance {
  balance: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type?: string | null;
  description?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface WalletTopUpOrderResponse {
  paymentId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface WalletVerifyPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface AdminWalletLookup {
  userId: string;
  name: string;
  email?: string | null;
  balance: number;
  recentTransactions: WalletTransaction[];
}

export interface WalletAuditLogItem {
  id: number;
  adminUserId: string;
  adminName?: string | null;
  targetUserId: string;
  targetName?: string | null;
  targetEmail?: string | null;
  amount: number;
  reason: string;
  ipAddress?: string | null;
  balanceAfter: number;
  createdDate: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const getWalletBalance = () => apiFetch<WalletBalance>('/api/wallet/balance', { auth: true });

export const getWalletTransactions = () => apiFetch<WalletTransaction[]>('/api/wallet/transactions', { auth: true });

export const createWalletTopUpOrder = (amount: number) =>
  apiFetch<WalletTopUpOrderResponse>('/api/wallet/topup/order', { method: 'POST', auth: true, body: { amount } });

export const verifyWalletTopUp = (payload: WalletVerifyPayload) =>
  apiFetch<{ unlocked: boolean }>('/api/wallet/topup/verify', { method: 'POST', auth: true, body: payload });

export const adminSearchWallet = (query: string) =>
  apiFetch<AdminWalletLookup>(`/api/wallet/admin/search?query=${encodeURIComponent(query)}`, { auth: true });

export const adminAdjustWallet = (userId: string, amount: number, notes: string) =>
  apiFetch<{ balance: number }>(`/api/wallet/admin/${encodeURIComponent(userId)}/adjust`, {
    method: 'POST', auth: true, body: { amount, notes },
  });

export const adminGetWalletAuditLog = (params: { adminUserId?: string; targetUserId?: string; page?: number; pageSize?: number } = {}) => {
  const q = new URLSearchParams();
  if (params.adminUserId) q.set('adminUserId', params.adminUserId);
  if (params.targetUserId) q.set('targetUserId', params.targetUserId);
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  const qs = q.toString();
  return apiFetch<PagedResult<WalletAuditLogItem>>(`/api/wallet/admin/audit${qs ? `?${qs}` : ''}`, { auth: true });
};
