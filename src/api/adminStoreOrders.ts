import { apiFetch } from './client';

export interface RefundStoreOrderResult {
  orderId: number;
  razorpayRefundId: string;
  status: string;
}

export const adminRefundStoreOrder = (orderId: number, reason?: string) =>
  apiFetch<RefundStoreOrderResult>(`/api/admin/store-orders/${orderId}/refund`, { method: 'POST', auth: true, body: { reason } });
