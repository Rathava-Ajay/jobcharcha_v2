import { apiFetch } from './client';

export interface StuckPayment {
  paymentId: number;
  userId: string;
  paymentFor: string;
  amount: number;
  razorpayOrderId?: string | null;
  createdAt: string;
  minutesPending: number;
}

export interface ResyncPaymentResult {
  paymentId: number;
  /** "Paid" | "Failed" | "StillPending" */
  resolvedStatus: string;
  razorpayPaymentId?: string | null;
}

export interface RefundPaymentResult {
  paymentId: number;
  razorpayRefundId: string;
  status: string;
  accessRevoked: boolean;
}

export interface AdminDispute {
  id: number;
  razorpayDisputeId: string;
  razorpayPaymentId: string;
  amount: number;
  amountDeducted: number;
  currency: string;
  reasonCode?: string | null;
  /** "open" | "under_review" | "action_required" | "won" | "lost" | "closed" */
  status: string;
  phase?: string | null;
  respondBy?: string | null;
  aspirantPaymentId?: number | null;
  orderId?: number | null;
  lastEventName: string;
  createdDate: string;
  updatedDate: string;
}

/** Aspirant payments (subscriptions, mock tests, wallet top-ups) stuck Pending long enough that the
 * client's /verify callback plausibly never arrived — the reconciliation job's own source list. */
export const adminGetStuckPayments = (olderThanMinutes = 30) =>
  apiFetch<StuckPayment[]>(`/api/admin/payments/stuck?olderThanMinutes=${olderThanMinutes}`, { auth: true });

/** Re-checks a stuck payment against Razorpay's own records and resolves it — same action the
 * hourly PaymentReconciliationService takes automatically, triggerable manually per row. */
export const adminResyncPayment = (paymentId: number) =>
  apiFetch<ResyncPaymentResult>(`/api/admin/payments/${paymentId}/resync`, { method: 'POST', auth: true });

export const adminRefundPayment = (paymentId: number, reason?: string) =>
  apiFetch<RefundPaymentResult>(`/api/admin/payments/${paymentId}/refund`, { method: 'POST', auth: true, body: { reason } });

export const adminGetDisputes = (status?: string) =>
  apiFetch<AdminDispute[]>(`/api/admin/payments/disputes${status ? `?status=${encodeURIComponent(status)}` : ''}`, { auth: true });

export interface RazorpayHealth {
  /** Live read-only auth probe against Razorpay's API — no money moves. */
  authenticated: boolean;
  probeStatusCode: number;
  detail: string;
  keyIdConfigured: boolean;
  keyIdMasked?: string | null;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  /** True = a known misconfiguration (webhook secret must differ from the API key secret). */
  webhookSecretEqualsKeySecret: boolean;
}

/** Confirms the deployed Razorpay keys are valid without taking a real payment. */
export const adminGetRazorpayHealth = () =>
  apiFetch<RazorpayHealth>('/api/admin/payments/razorpay-health', { auth: true });
