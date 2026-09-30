import { apiFetch, toQueryString } from './client';

export interface ApiUserAdminListItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: string;
  isActive: boolean;
  isPremium: boolean;
  isEmailVerified: boolean;
  createdDate: string;
  lastLoginDate?: string | null;
  /** Attribution captured at signup (e.g. "instagram"); null for organic signups. */
  signupSource?: string | null;
  signupCampaign?: string | null;
  /** Set only for employer accounts. */
  employerProfileId?: number | null;
  isEmployerApproved?: boolean | null;
}

export const adminGetAllUsers = (search?: string) =>
  apiFetch<ApiUserAdminListItem[]>(`/api/users/admin/all${toQueryString({ search })}`, { auth: true });

export const adminSetUserActive = (id: string, isActive: boolean) =>
  apiFetch<void>(`/api/users/admin/${encodeURIComponent(id)}/active`, { method: 'PUT', auth: true, body: { isActive } });

/** Approve (or revoke approval for) an employer account so it can post live jobs.
 * Also drives the public "verified company" badge. */
export const adminSetEmployerApproval = (id: string, approved: boolean) =>
  apiFetch<void>(`/api/users/admin/${encodeURIComponent(id)}/employer-approval`, { method: 'PUT', auth: true, body: { approved } });
