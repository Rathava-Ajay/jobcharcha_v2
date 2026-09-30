import { apiFetch } from './client';

export const uploadAdminDocument = async (file: File): Promise<{ url: string; fileName: string }> => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ url: string; fileName: string }>('/api/admin/uploads/document', {
    method: 'POST', auth: true, isFormData: true, body: form,
  });
};

/** Employer-scoped counterpart — attaches a job-details file to a posting. Same limits. */
export const uploadEmployerDocument = async (file: File): Promise<{ url: string; fileName: string }> => {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ url: string; fileName: string }>('/api/employer/uploads/document', {
    method: 'POST', auth: true, isFormData: true, body: form,
  });
};
