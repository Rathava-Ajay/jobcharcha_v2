import { apiFetch, toQueryString } from './client';

export interface ApiExam {
  id: number;
  name: string;
  nameGujarati?: string | null;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  freeTestsAllowed: number;
  displayOrder: number;
  isActive: boolean;
  testCount: number;
}

export interface UpsertExamPayload {
  name: string;
  nameGujarati?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  categoryId?: number | null;
  freeTestsAllowed: number;
  displayOrder: number;
  isActive: boolean;
}

export interface ApiTestListItem {
  id: number;
  title: string;
  slug: string;
  examId: number;
  examName: string;
  categoryId?: number | null;
  categoryName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  isFree: boolean;
  price?: number | null;
  attemptsCount: number;
}

export interface ApiTestSection {
  id: number;
  name: string;
  questionCount: number;
  displayOrder: number;
}

export interface ApiTestDetail {
  id: number;
  title: string;
  slug: string;
  examId: number;
  examName: string;
  categoryId?: number | null;
  categoryName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: number;
  marksPerQuestion: number;
  isFree: boolean;
  price?: number | null;
  instructions?: string | null;
  titleGu?: string | null;
  instructionsGu?: string | null;
  sections: ApiTestSection[];
  isLocked: boolean;
  hasInProgressAttempt: boolean;
}

export interface ApiTestQuery {
  categoryId?: number;
  examId?: number;
  search?: string;
  isFree?: boolean;
}

export interface UpsertQuestionPayload {
  subject: string;
  topic?: string | null;
  questionTextEn: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  correctOption: string;
  explanationEn?: string | null;
  marks: number;
  displayOrder: number;
}

export interface UpsertTestSectionPayload {
  name: string;
  displayOrder: number;
  questions: UpsertQuestionPayload[];
}

export interface UpsertTestPayload {
  examId: number;
  title: string;
  slug?: string | null;
  durationMinutes: number;
  negativeMarking: number;
  marksPerQuestion: number;
  isFree: boolean;
  price?: number | null;
  instructions?: string | null;
  displayOrder: number;
  isActive: boolean;
  sections: UpsertTestSectionPayload[];
}

export interface ApiTestAdminListItem {
  id: number;
  title: string;
  slug: string;
  examId: number;
  examName: string;
  isFree: boolean;
  price?: number | null;
  totalQuestions: number;
  isActive: boolean;
}

export interface ApiAttemptQuestion {
  id: number;
  displayOrder: number;
  subject: string;
  topic?: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  questionTextGu?: string | null;
  optionAGu?: string | null;
  optionBGu?: string | null;
  optionCGu?: string | null;
  optionDGu?: string | null;
  marks: number;
  selectedOption?: string | null;
  isMarkedForReview: boolean;
  isVisited: boolean;
}

export interface ApiAttemptSection {
  name: string;
  questions: ApiAttemptQuestion[];
}

export interface ApiAttemptSession {
  attemptId: number;
  testId: number;
  testTitle: string;
  testTitleGu?: string | null;
  durationMinutes: number;
  startedAt: string;
  endsAt: string;
  remainingSeconds: number;
  hasGujarati: boolean;
  sections: ApiAttemptSection[];
}

export interface ApiAttemptResultQuestion {
  questionId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  questionTextGu?: string | null;
  optionAGu?: string | null;
  optionBGu?: string | null;
  optionCGu?: string | null;
  optionDGu?: string | null;
  correctOption: string;
  selectedOption?: string | null;
  explanation?: string | null;
  explanationGu?: string | null;
  marks: number;
}

export interface ApiAttemptResult {
  attemptId: number;
  testId: number;
  testTitle: string;
  testTitleGu?: string | null;
  score: number;
  maxScore: number;
  accuracyPercent: number;
  percentile: number | null;
  allIndiaRank: number | null;
  analyticsLocked: boolean;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalTimeSeconds: number;
  submittedAt: string;
  questions: ApiAttemptResultQuestion[];
}

export interface ApiAttemptHistoryItem {
  attemptId: number;
  testId: number;
  testTitle: string;
  testSlug: string;
  examName: string;
  categoryName: string;
  startedAt: string;
  submittedAt?: string | null;
  isCompleted: boolean;
  score?: number | null;
  maxScore?: number | null;
  accuracyPercent?: number | null;
}

export const getExams = (categoryId?: number) => apiFetch<ApiExam[]>(`/api/exams${toQueryString({ categoryId })}`);

export const adminGetAllExams = () => apiFetch<ApiExam[]>('/api/exams/admin/all', { auth: true });

export const createExam = (payload: UpsertExamPayload) =>
  apiFetch<ApiExam>('/api/exams', { method: 'POST', auth: true, body: payload });

export const updateExam = (id: number, payload: UpsertExamPayload) =>
  apiFetch<ApiExam>(`/api/exams/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteExam = (id: number) =>
  apiFetch<void>(`/api/exams/${id}`, { method: 'DELETE', auth: true });

export const searchTests = (query: ApiTestQuery = {}) =>
  apiFetch<ApiTestListItem[]>(`/api/tests${toQueryString(query)}`);

export const getTestBySlug = (slug: string) =>
  apiFetch<ApiTestDetail>(`/api/tests/${encodeURIComponent(slug)}`, { auth: true });

export const startAttempt = (testId: number) =>
  apiFetch<ApiAttemptSession>('/api/attempts/start', { method: 'POST', auth: true, body: { testId } });

export const getAttemptSession = (attemptId: number) =>
  apiFetch<ApiAttemptSession>(`/api/attempts/${attemptId}`, { auth: true });

export const saveAttemptResponse = (
  attemptId: number,
  payload: { questionId: number; selectedOption?: string | null; isMarkedForReview: boolean }
) => apiFetch<void>(`/api/attempts/${attemptId}/responses`, { method: 'POST', auth: true, body: payload });

export const submitAttempt = (attemptId: number) =>
  apiFetch<ApiAttemptResult>(`/api/attempts/${attemptId}/submit`, { method: 'POST', auth: true });

export const getAttemptResult = (attemptId: number) =>
  apiFetch<ApiAttemptResult>(`/api/attempts/${attemptId}/result`, { auth: true });

export const getMyAttempts = () => apiFetch<ApiAttemptHistoryItem[]>('/api/attempts/mine', { auth: true });

export const adminGetAllTests = () => apiFetch<ApiTestAdminListItem[]>('/api/tests/admin/all', { auth: true });

export const createTest = (payload: UpsertTestPayload) =>
  apiFetch<ApiTestDetail>('/api/tests', { method: 'POST', auth: true, body: payload });

export const updateTest = (id: number, payload: UpsertTestPayload) =>
  apiFetch<ApiTestDetail>(`/api/tests/${id}`, { method: 'PUT', auth: true, body: payload });

export const deleteTest = (id: number) =>
  apiFetch<void>(`/api/tests/${id}`, { method: 'DELETE', auth: true });
