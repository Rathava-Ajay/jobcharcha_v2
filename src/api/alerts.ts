import { apiFetch } from './client';

export interface SubscribeAlertPayload {
  email: string;
  phone?: string;
  whatsAppNumber?: string;
  name?: string;
  preferredCategories: string[];
  preferredRegion?: string;
  alertFrequency: 'instant' | 'daily' | 'weekly';
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
}

export interface ApiAlertPreference {
  id: number;
  email: string;
  preferredCategories: string[];
  preferredRegion?: string | null;
  alertFrequency: string;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
  isActive: boolean;
}

export interface ApiAlertPreferenceAdminListItem {
  id: number;
  email: string;
  phone?: string | null;
  whatsAppNumber?: string | null;
  name?: string | null;
  preferredCategories: string[];
  preferredRegion?: string | null;
  alertFrequency: string;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
  smsEnabled: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  unsubscribedAt?: string | null;
}

export const subscribeAlerts = (payload: SubscribeAlertPayload) =>
  apiFetch<ApiAlertPreference>('/api/alert-preferences', { method: 'POST', body: payload });

export const unsubscribeAlerts = (token: string) =>
  apiFetch<void>(`/api/alert-preferences/unsubscribe/${encodeURIComponent(token)}`);

export const adminGetAllAlertSubscribers = () =>
  apiFetch<ApiAlertPreferenceAdminListItem[]>('/api/alert-preferences/admin/all', { auth: true });

export const adminSetAlertSubscriberActive = (id: number, isActive: boolean) =>
  apiFetch<void>(`/api/alert-preferences/admin/${id}/active`, { method: 'PUT', auth: true, body: { isActive } });
