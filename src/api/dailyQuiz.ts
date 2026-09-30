import { apiFetch } from './client';

export interface ApiDailyQuizQuestion {
  id: number;
  displayOrder: number;
  topic?: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface ApiDailyQuiz {
  id: number;
  quizDate: string;
  title: string;
  description?: string | null;
  questions: ApiDailyQuizQuestion[];
}

export interface ApiDailyQuizResultQuestion {
  questionId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  selectedOption?: string | null;
  explanation?: string | null;
}

export interface ApiDailyQuizResult {
  attemptId: number;
  dailyQuizId: number;
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  completedAt: string;
  questions: ApiDailyQuizResultQuestion[];
}

export interface AiImportDailyQuizQuestionPayload {
  topic?: string | null;
  questionTextEn: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  correctOption: string;
  explanationEn?: string | null;
  displayOrder: number;
}

export interface AiImportDailyQuizPayload {
  quizDate: string;
  title: string;
  description?: string | null;
  autoPublish: boolean;
  questions: AiImportDailyQuizQuestionPayload[];
}

const GUEST_KEY_STORAGE = 'jobcharcha.guestKey';

export function getOrCreateGuestKey(): string {
  let key = localStorage.getItem(GUEST_KEY_STORAGE);
  if (!key) {
    key = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(GUEST_KEY_STORAGE, key);
  }
  return key;
}

export const getTodayQuiz = () => apiFetch<ApiDailyQuiz>('/api/daily-quiz/today');
export const getQuizByDate = (date: string) => apiFetch<ApiDailyQuiz>(`/api/daily-quiz/by-date/${date}`);
export const getAvailableQuizDates = () => apiFetch<string[]>('/api/daily-quiz/dates');

export const getMyQuizAttempt = (dailyQuizId: number, guestKey: string) =>
  apiFetch<ApiDailyQuizResult>(`/api/daily-quiz/${dailyQuizId}/attempt?guestKey=${encodeURIComponent(guestKey)}`, { auth: true });

export const aiImportDailyQuiz = (payload: AiImportDailyQuizPayload) =>
  apiFetch<ApiDailyQuiz>('/api/daily-quiz/admin/ai-import', { method: 'POST', auth: true, body: payload });

export const submitDailyQuiz = (
  dailyQuizId: number,
  guestKey: string,
  answers: { questionId: number; selectedOption: string }[]
) => apiFetch<ApiDailyQuizResult>(`/api/daily-quiz/${dailyQuizId}/submit`, {
  method: 'POST', auth: true, body: { guestKey, answers },
});
