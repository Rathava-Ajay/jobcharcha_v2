import { apiFetch, toQueryString } from './client';
import { PagedResult } from './jobs';

export interface ApiPracticeExamOption {
  examId: number;
  examName: string;
  questionCount: number;
}

export interface ApiPracticeQuestion {
  id: number;
  examId: number;
  examName: string;
  subject: string;
  topic?: string | null;
  difficulty: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string | null;
  marks: number;
}

export interface PracticeQuestionQuery {
  examId?: number;
  subject?: string;
  topic?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const getPracticeExams = () => apiFetch<ApiPracticeExamOption[]>('/api/practice-questions/exams');

export const getPracticeSubjects = (examId: number) =>
  apiFetch<string[]>(`/api/practice-questions/subjects${toQueryString({ examId })}`);

export const getPracticeTopics = (examId: number, subject?: string) =>
  apiFetch<string[]>(`/api/practice-questions/topics${toQueryString({ examId, subject })}`);

export const searchPracticeQuestions = (query: PracticeQuestionQuery) =>
  apiFetch<PagedResult<ApiPracticeQuestion>>(`/api/practice-questions${toQueryString(query)}`);
