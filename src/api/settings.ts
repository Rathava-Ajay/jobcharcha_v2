import { apiFetch } from './client';
import { SystemSettings } from '../types';

export const getSettings = () => apiFetch<SystemSettings>('/api/settings');

export const updateSettings = (payload: SystemSettings) =>
  apiFetch<SystemSettings>('/api/settings', { method: 'PUT', auth: true, body: payload });
