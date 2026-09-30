import { apiFetch } from './client';

export interface EducationEntry {
  qualification?: string;
  courseDegree?: string;
  specialization?: string;
  passingYear?: string;
  universityBoard?: string;
  percentageCgpa?: string;
}

export interface SkillsBlock {
  technical: string[];
  computer: string[];
  languages: string[];
  other: string[];
}

export interface WorkExperienceEntry {
  isCurrent: boolean;
  company?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface JobPreferences {
  preferredJobType?: string;
  preferredLocations: string[];
  expectedSalary?: string;
  workMode?: string;
  preferredIndustry?: string;
  willingToRelocate: boolean;
}

export interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
  required: boolean;
}

export interface AspirantProfile {
  photoUrl?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  mobile?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  district?: string;
  state?: string;
  aboutMe?: string;
  headline?: string;
  education: EducationEntry[];
  skills: SkillsBlock;
  workExperience: WorkExperienceEntry[];
  preferences: JobPreferences;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  completionScore: number;
  completionChecklist: CompletionItem[];
  needsSetup: boolean;
}

export interface UpsertAspirantProfilePayload {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  district?: string;
  state?: string;
  aboutMe?: string;
  headline?: string;
  education?: EducationEntry[];
  skills?: SkillsBlock;
  workExperience?: WorkExperienceEntry[];
  preferences?: JobPreferences;
}

export const emptySkills = (): SkillsBlock => ({ technical: [], computer: [], languages: [], other: [] });
export const emptyPreferences = (): JobPreferences => ({ preferredLocations: [], willingToRelocate: false });

export const getAspirantProfile = () =>
  apiFetch<AspirantProfile>('/api/aspirant/profile', { auth: true });

export const updateAspirantProfile = (payload: UpsertAspirantProfilePayload) =>
  apiFetch<AspirantProfile>('/api/aspirant/profile', { method: 'PUT', auth: true, body: payload });

export const deleteResume = () =>
  apiFetch<AspirantProfile>('/api/aspirant/profile/resume', { method: 'DELETE', auth: true });
