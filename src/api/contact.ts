import { apiFetch } from './client';

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const submitContact = (payload: ContactPayload) =>
  apiFetch<{ message: string }>('/api/contact', { method: 'POST', body: payload });
