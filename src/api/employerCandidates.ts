import { apiFetch, toQueryString } from './client';
import { CandidateListItem, CandidateProfile, ContactAttemptResult } from '../types';

export interface CandidateSearchParams {
  skills?: string;
  minExperience?: number;
  maxExperience?: number;
  city?: string;
  minSalary?: number;
  maxSalary?: number;
  education?: string;
  maxNoticePeriodDays?: number;
  page?: number;
  pageSize?: number;
}

interface ApiCandidateListItem {
  userId: string;
  name: string;
  headline?: string | null;
  experienceYears: number;
  currentCity?: string | null;
  expectedSalary?: number | null;
  skills?: string | null;
  education?: string | null;
  noticePeriodDays: number;
  maskedPhone: string;
  maskedEmail: string;
  isAlreadyContacted: boolean;
}

interface ApiCandidateProfile extends Omit<ApiCandidateListItem, 'maskedPhone' | 'maskedEmail'> {
  aboutMe?: string | null;
  resumeUrl?: string | null;
  currentSalary?: number | null;
  preferredCities?: string | null;
  workExperience?: string | null;
  phone: string;
  email: string;
}

interface ApiContactResponse {
  allowed: boolean;
  reason: string;
  phone?: string | null;
  email?: string | null;
  creditsRemaining: number;
  isUnlimited: boolean;
}

interface ApiPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function toAppCandidateListItem(dto: ApiCandidateListItem): CandidateListItem {
  return {
    userId: dto.userId,
    name: dto.name,
    headline: dto.headline || undefined,
    experienceYears: dto.experienceYears,
    currentCity: dto.currentCity || undefined,
    expectedSalary: dto.expectedSalary ?? undefined,
    skills: dto.skills || undefined,
    education: dto.education || undefined,
    noticePeriodDays: dto.noticePeriodDays,
    maskedPhone: dto.maskedPhone,
    maskedEmail: dto.maskedEmail,
    isAlreadyContacted: dto.isAlreadyContacted,
  };
}

function toAppCandidateProfile(dto: ApiCandidateProfile): CandidateProfile {
  return {
    userId: dto.userId,
    name: dto.name,
    headline: dto.headline || undefined,
    aboutMe: dto.aboutMe || undefined,
    resumeUrl: dto.resumeUrl || undefined,
    skills: dto.skills || undefined,
    experienceYears: dto.experienceYears,
    currentSalary: dto.currentSalary ?? undefined,
    expectedSalary: dto.expectedSalary ?? undefined,
    noticePeriodDays: dto.noticePeriodDays,
    currentCity: dto.currentCity || undefined,
    preferredCities: dto.preferredCities || undefined,
    education: dto.education || undefined,
    workExperience: dto.workExperience || undefined,
    isAlreadyContacted: dto.isAlreadyContacted,
    phone: dto.phone,
    email: dto.email,
  };
}

export async function searchCandidates(params: CandidateSearchParams): Promise<{ items: CandidateListItem[]; totalCount: number; page: number; pageSize: number }> {
  const result = await apiFetch<ApiPagedResult<ApiCandidateListItem>>(`/api/employer/candidates${toQueryString(params)}`, { auth: true });
  return { items: result.items.map(toAppCandidateListItem), totalCount: result.totalCount, page: result.page, pageSize: result.pageSize };
}

export const getCandidateProfile = (candidateUserId: string) =>
  apiFetch<ApiCandidateProfile>(`/api/employer/candidates/${candidateUserId}`, { auth: true }).then(toAppCandidateProfile);

export async function contactCandidate(candidateUserId: string, initialMessage?: string): Promise<ContactAttemptResult> {
  const dto = await apiFetch<ApiContactResponse>(`/api/employer/candidates/${candidateUserId}/contact`, {
    method: 'POST', auth: true, body: { initialMessage },
  });
  return {
    allowed: dto.allowed,
    reason: dto.reason as ContactAttemptResult['reason'],
    phone: dto.phone || undefined,
    email: dto.email || undefined,
    creditsRemaining: dto.creditsRemaining,
    isUnlimited: dto.isUnlimited,
  };
}
