import { apiFetch } from './client';

export type PaymentFor = 'Plan' | 'Test';

export interface CreateOrderPayload {
  paymentFor: PaymentFor;
  planId?: number;
  testId?: number;
}

export interface CreateOrderResponse {
  paymentId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  unlocked: boolean;
  paymentFor: PaymentFor;
  testId?: number | null;
}

export interface ApiPaymentHistoryItem {
  id: number;
  paymentFor: PaymentFor;
  planName?: string | null;
  testTitle?: string | null;
  amount: number;
  currency: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  razorpayPaymentId?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface ApiActiveSubscription {
  planName: string;
  expiresAt: string;
}

export interface ApiPaymentHistory {
  payments: ApiPaymentHistoryItem[];
  activeSubscription?: ApiActiveSubscription | null;
}

export const createPaymentOrder = (payload: CreateOrderPayload) =>
  apiFetch<CreateOrderResponse>('/api/payments/order', { method: 'POST', auth: true, body: payload });

export const verifyPayment = (payload: VerifyPaymentPayload) =>
  apiFetch<VerifyPaymentResponse>('/api/payments/verify', { method: 'POST', auth: true, body: payload });

export const getPaymentHistory = () => apiFetch<ApiPaymentHistory>('/api/payments/history', { auth: true });
