import { apiFetch } from './client';
import { AuthTokens, UserProfile } from '../types';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: UserProfile;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'aspirant' | 'employer';
  companyName?: string;
  acknowledgedTerms?: boolean;
  /** Attribution from the join deep link (?ref= / ?utm_source=), e.g. "instagram". */
  source?: string;
  /** Campaign tag from the join deep link (?utm_campaign=). */
  campaign?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: 'aspirant' | 'employer' | 'admin';
}

export const register = (payload: RegisterPayload) =>
  apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: payload });

export const login = (payload: LoginPayload) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: payload });

export const logout = () => apiFetch<void>('/api/auth/logout', { method: 'POST', auth: true });

export const forgotPassword = (email: string) =>
  apiFetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } });

export const resetPassword = (email: string, token: string, newPassword: string) =>
  apiFetch<void>('/api/auth/reset-password', { method: 'POST', body: { email, token, newPassword } });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<void>('/api/auth/change-password', { method: 'POST', auth: true, body: { currentPassword, newPassword } });

export const confirmEmail = (userId: string, token: string) =>
  apiFetch<void>('/api/auth/confirm-email', { method: 'POST', body: { userId, token } });

export const resendConfirmation = (email: string) =>
  apiFetch<{ message: string }>('/api/auth/resend-confirmation', { method: 'POST', body: { email } });

export const getMe = () => apiFetch<UserProfile>('/api/auth/me', { auth: true });

export const updateMe = (payload: Partial<{
  firstName: string; lastName: string; phone: string; companyName: string; education: string; skills: string[];
}>) => apiFetch<UserProfile>('/api/auth/me', { method: 'PUT', auth: true, body: payload });

export const uploadAvatar = async (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ url: string }>('/api/auth/me/avatar', { method: 'POST', auth: true, isFormData: true, body: form });
};

export const uploadResume = async (file: File): Promise<{ url: string }> => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ url: string }>('/api/auth/me/resume', { method: 'POST', auth: true, isFormData: true, body: form });
};

export type { AuthTokens };
