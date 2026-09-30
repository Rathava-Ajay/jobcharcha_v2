import { apiFetch } from './client';

export interface ApiAspirantPlan {
  id: number;
  name: string;
  nameGujarati?: string | null;
  description?: string | null;
  price: number;
  durationDays: number;
  unlocksAllTests: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface UpsertAspirantPlanPayload {
  name: string;
  nameGujarati?: string;
  description?: string;
  price: number;
  durationDays: number;
  unlocksAllTests?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export const getPlans = () => apiFetch<ApiAspirantPlan[]>('/api/plans');

export const adminGetAllPlans = () => apiFetch<ApiAspirantPlan[]>('/api/plans/admin/all', { auth: true });

export const createPlan = (payload: UpsertAspirantPlanPayload) =>
  apiFetch<ApiAspirantPlan>('/api/plans', { method: 'POST', auth: true, body: payload });

export const updatePlan = (id: number, payload: UpsertAspirantPlanPayload) =>
  apiFetch<ApiAspirantPlan>(`/api/plans/${id}`, { method: 'PUT', auth: true, body: payload });

export const deletePlan = (id: number) =>
  apiFetch<void>(`/api/plans/${id}`, { method: 'DELETE', auth: true });
