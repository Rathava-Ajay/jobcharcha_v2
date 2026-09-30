import { apiFetch, toQueryString } from './client';
import { Job } from '../types';

export interface ApiImportantDate {
  label: string;
  date: string;
}

export interface ApiJobListItem {
  id: number;
  title: string;
  slug: string;
  companyOrDept: string;
  category: string;
  location: string;
  vacancyCount: number;
  salary: string;
  qualification: string;
  type: 'public' | 'private';
  lastDate: string;
  postedDate: string;
  isFeatured: boolean;
  isUrgent: boolean;
  isNew: boolean;
  status: 'Active' | 'Expired' | 'Draft';
  tags: string[];
  viewsCount: number;
}

export interface ApiJobDetail extends ApiJobListItem {
  categoryId: number;
  district?: string | null;
  state?: string | null;
  isBoosted: boolean;
  officialNotificationUrl?: string | null;
  applyUrl?: string | null;
  syllabusLink?: string | null;
  organizationLogo?: string | null;
  overview?: string | null;
  eligibility?: string | null;
  documentsRequired?: string | null;
  importantDates: ApiImportantDate[];
  howToApply?: string | null;
  selectionProcess?: string | null;
  applyClicksCount: number;
  similarJobs?: ApiJobDetail[] | null;
  keyHighlights?: string | null;
  importantNotes?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryType?: string | null;
  experienceRequired?: number | null;
  advertisementNumber?: string | null;
  officialWebsite?: string | null;
  telegramLink?: string | null;
  whatsAppLink?: string | null;
  applicationFee?: number | null;
  applicationFeeDetails?: string | null;
  vacancyBreakdownJson?: string | null;
  categoryWiseVacancyJson?: string | null;
  selectionProcessJson?: string | null;
  applicationFeeJson?: string | null;
  faqSchemaJson?: string | null;
  examPatternJson?: string | null;
  salaryBreakdownJson?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  focusKeyword?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface JobQuery {
  search?: string;
  category?: string;
  location?: string;
  qualification?: string;
  minSalary?: number;
  maxSalary?: number;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface UpsertJobPayload {
  title: string;
  slug?: string;
  organizationName: string;
  categoryId: number;
  location?: string;
  district?: string;
  state?: string;
  totalPosts?: number;
  salary?: string;
  qualificationRequired?: string;
  postedDate: string;
  lastDate: string;
  applicationLink?: string;
  isFeatured?: boolean;
  isUrgent?: boolean;
  isNew?: boolean;
  shortDescription?: string;
  fullDescription?: string;
  detailedEligibility?: string;
  howToApply?: string;
  selectionProcess?: string;
  officialNotificationPdf?: string;
  notificationFileName?: string;
  syllabusPdf?: string;
  organizationLogo?: string;
  status?: number;
  isActive?: boolean;
}

export interface AiImportFaqItem { question: string; answer: string; }
export interface AiImportVacancyRow { postName: string; sc: number; st: number; obc: number; ews: number; ur: number; total: number; }
export interface AiImportFeeRow { category: string; fee: string; }
export interface AiImportExamPatternRow { paper: string; subject?: string | null; questions: number; marks: number; duration?: string | null; type?: string | null; }
export interface AiImportSalaryBreakdown { basicPay?: string | null; da?: string | null; hra?: string | null; grossSalary?: string | null; netSalary?: string | null; }
export interface AiImportImportantDates {
  notificationDate?: string | null;
  applicationStart?: string | null;
  applicationEnd?: string | null;
  feePaymentEnd?: string | null;
  admitCardDate?: string | null;
  examDate?: string | null;
  resultDate?: string | null;
  otherDates?: { label: string; date: string }[];
}

export interface AiImportJobPayload {
  title: string;
  slug?: string | null;
  department: string;
  categoryId: number;
  focusKeyword: string;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  internalLinkAnchors: string[];
  totalPosts?: number | null;
  salary?: string | null;
  ageLimit?: string | null;
  qualification?: string | null;
  location?: string | null;
  lastDate: string;
  applyLink?: string | null;
  officialNotificationPdf?: string | null;
  notificationFileName?: string | null;
  advertisementNumber?: string | null;
  officialWebsite?: string | null;
  syllabusLink?: string | null;
  state?: string | null;
  district?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  experienceRequired?: number | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryType?: string | null;
  applicationFeeAmount?: number | null;
  applicationFeeDetails?: string | null;
  shortDescription: string;
  overview: string;
  keyHighlights?: string | null;
  eligibilityDetails?: string | null;
  howToApply: string;
  importantNotes?: string | null;
  documentsRequired?: string | null;
  faqSchema: AiImportFaqItem[];
  vacancyBreakdown: AiImportVacancyRow[];
  categoryWiseVacancy: Record<string, number>;
  applicationFee: AiImportFeeRow[];
  selectionProcess: string[];
  examPattern: AiImportExamPatternRow[];
  salaryBreakdown?: AiImportSalaryBreakdown | null;
  importantDates?: AiImportImportantDates | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  autoPublish: boolean;
}

function toAppJob(dto: ApiJobListItem): Job {
  return {
    id: String(dto.id),
    slug: dto.slug,
    title: dto.title,
    companyOrDept: dto.companyOrDept,
    category: dto.category,
    location: dto.location,
    district: dto.location,
    vacancyCount: dto.vacancyCount,
    salary: dto.salary,
    qualification: dto.qualification,
    type: dto.type,
    lastDate: dto.lastDate,
    postedDate: dto.postedDate,
    isBoosted: dto.isFeatured,
    isFeatured: dto.isFeatured,
    isUrgent: dto.isUrgent,
    isNew: dto.isNew,
    status: dto.status,
    tags: dto.tags,
    viewsCount: dto.viewsCount,
  };
}

function toAppJobDetail(dto: ApiJobDetail): Job {
  return {
    ...toAppJob(dto),
    district: dto.district || dto.location,
    state: dto.state || undefined,
    officialNotificationUrl: dto.officialNotificationUrl || undefined,
    applyUrl: dto.applyUrl || undefined,
    syllabusLink: dto.syllabusLink || undefined,
    organizationLogo: dto.organizationLogo || undefined,
    overview: dto.overview || undefined,
    eligibility: dto.eligibility || undefined,
    documentsRequired: dto.documentsRequired || undefined,
    importantDates: dto.importantDates,
    howToApply: dto.howToApply || undefined,
    selectionProcess: dto.selectionProcess || undefined,
    viewsCount: dto.viewsCount,
    applyClicksCount: dto.applyClicksCount,
    keyHighlights: dto.keyHighlights || undefined,
    importantNotes: dto.importantNotes || undefined,
    minAge: dto.minAge ?? undefined,
    maxAge: dto.maxAge ?? undefined,
    minSalary: dto.minSalary ?? undefined,
    maxSalary: dto.maxSalary ?? undefined,
    salaryType: dto.salaryType || undefined,
    experienceRequired: dto.experienceRequired ?? undefined,
    advertisementNumber: dto.advertisementNumber || undefined,
    officialWebsite: dto.officialWebsite || undefined,
    telegramLink: dto.telegramLink || undefined,
    whatsAppLink: dto.whatsAppLink || undefined,
    applicationFee: dto.applicationFee ?? undefined,
    applicationFeeDetails: dto.applicationFeeDetails || undefined,
    vacancyBreakdownJson: dto.vacancyBreakdownJson || undefined,
    categoryWiseVacancyJson: dto.categoryWiseVacancyJson || undefined,
    selectionProcessJson: dto.selectionProcessJson || undefined,
    applicationFeeJson: dto.applicationFeeJson || undefined,
    faqSchemaJson: dto.faqSchemaJson || undefined,
    examPatternJson: dto.examPatternJson || undefined,
    salaryBreakdownJson: dto.salaryBreakdownJson || undefined,
    metaTitle: dto.metaTitle || undefined,
    metaDescription: dto.metaDescription || undefined,
    metaKeywords: dto.metaKeywords || undefined,
    focusKeyword: dto.focusKeyword || undefined,
    ogTitle: dto.ogTitle || undefined,
    ogDescription: dto.ogDescription || undefined,
  };
}

export async function searchJobs(query: JobQuery = {}): Promise<PagedResult<Job>> {
  const raw = await apiFetch<PagedResult<ApiJobListItem>>(`/api/jobs${toQueryString(query)}`);
  return { ...raw, items: raw.items.map(toAppJob) };
}

export async function getLatestJobs(count = 10): Promise<Job[]> {
  const raw = await apiFetch<ApiJobListItem[]>(`/api/jobs/latest${toQueryString({ count })}`);
  return raw.map(toAppJob);
}

export async function getTrendingJobs(count = 10): Promise<Job[]> {
  const raw = await apiFetch<ApiJobListItem[]>(`/api/jobs/trending${toQueryString({ count })}`);
  return raw.map(toAppJob);
}

export async function getJobBySlug(slug: string): Promise<Job & { similarJobs: Job[] }> {
  const raw = await apiFetch<ApiJobDetail>(`/api/jobs/${encodeURIComponent(slug)}`);
  return {
    ...toAppJobDetail(raw),
    similarJobs: (raw.similarJobs || []).map(toAppJobDetail),
  };
}

export async function adminSearchJobs(query: JobQuery = {}): Promise<PagedResult<Job>> {
  const raw = await apiFetch<PagedResult<ApiJobListItem>>(`/api/jobs/admin${toQueryString(query)}`, { auth: true });
  return { ...raw, items: raw.items.map(toAppJob) };
}

export const createJob = (payload: UpsertJobPayload) =>
  apiFetch<ApiJobDetail>('/api/jobs', { method: 'POST', auth: true, body: payload });

export const aiImportJob = (payload: AiImportJobPayload) =>
  apiFetch<ApiJobDetail>('/api/jobs/ai-import', { method: 'POST', auth: true, body: payload });

export const updateJob = (id: number, payload: UpsertJobPayload) =>
  apiFetch<ApiJobDetail>(`/api/jobs/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteJob = (id: number) => apiFetch<void>(`/api/jobs/${id}`, { method: 'DELETE', auth: true });

export const setJobStatus = (id: number, status: number) =>
  apiFetch<void>(`/api/jobs/${id}/status`, { method: 'PATCH', auth: true, body: status });

export const setJobActive = (id: number, isActive: boolean) =>
  apiFetch<void>(`/api/jobs/${id}/active`, { method: 'PATCH', auth: true, body: isActive });
