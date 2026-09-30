import { apiFetch } from './client';

export interface StoreCartItemPayload {
  productId: number;
  quantity: number;
}

export interface StoreCheckoutPayload {
  items: StoreCartItemPayload[];
  paymentMethod: 'razorpay' | 'wallet';
  couponCode?: string;
}

export interface StoreCheckoutResponse {
  orderId: number;
  orderNumber: string;
  finalAmount: number;
  razorpayOrderId?: string | null;
  razorpayAmount?: number | null;
  keyId?: string | null;
  alreadyPaid: boolean;
}

export interface StoreVerifyPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface StoreVerifyResponse {
  unlocked: boolean;
  orderId: number;
}

export interface ApiStoreOrderItem {
  orderItemId: number;
  productId: number;
  productTitle: string;
  productSlug?: string | null;
  price: number;
  quantity: number;
  canDownload: boolean;
  downloadCount: number;
  maxDownloadCount: number;
}

export interface ApiStoreOrder {
  orderId: number;
  orderNumber: string;
  finalAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  orderDate: string;
  items: ApiStoreOrderItem[];
}

export const checkoutCart = (payload: StoreCheckoutPayload) =>
  apiFetch<StoreCheckoutResponse>('/api/store/orders/checkout', { method: 'POST', auth: true, body: payload });

export const verifyStoreOrder = (payload: StoreVerifyPayload) =>
  apiFetch<StoreVerifyResponse>('/api/store/orders/verify', { method: 'POST', auth: true, body: payload });

export const getMyStoreOrders = () => apiFetch<ApiStoreOrder[]>('/api/store/orders', { auth: true });

export const getStoreDownloadUrl = (orderId: number, orderItemId: number) =>
  apiFetch<{ downloadUrl: string }>(`/api/store/orders/${orderId}/download/${orderItemId}`, { method: 'GET', auth: true });
