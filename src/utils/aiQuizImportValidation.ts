import { stripCodeFences } from './aiJobImportValidation';

export interface ParsedQuizQuestion {
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

export interface ParsedAiDailyQuiz {
  quizDate: string;
  title: string;
  description?: string | null;
  questions: ParsedQuizQuestion[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  return fallback;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  data?: ParsedAiDailyQuiz;
}

/** Parses + validates the AI-returned JSON against the schema `aiPrompts.ts`'s Daily Quiz extraction
 * prompt requests, matching the backend's `AiImportDailyQuizRequest` shape. Hard errors block posting;
 * warnings (e.g. a very short quiz) are shown but don't block. */
export function validateAiQuizImport(rawText: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch (err) {
    return { errors: [`Could not parse JSON: ${err instanceof Error ? err.message : 'invalid syntax'}`], warnings: [] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { errors: ['Pasted content is not a JSON object.'], warnings: [] };
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.quizDate !== 'string' || !DATE_RE.test(obj.quizDate)) {
    errors.push('"quizDate" must be in YYYY-MM-DD format.');
  }
  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    errors.push('Missing or empty required field: "title"');
  }

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    errors.push('"questions" must be a non-empty array.');
  } else {
    obj.questions.forEach((q, qIdx) => {
      const question = q as Record<string, unknown>;
      const label = `questions[${qIdx}]`;
      if (typeof question.questionTextEn !== 'string' || question.questionTextEn.trim() === '') {
        errors.push(`"${label}.questionTextEn" is required.`);
      }
      for (const opt of ['optionAEn', 'optionBEn', 'optionCEn', 'optionDEn']) {
        if (typeof question[opt] !== 'string' || (question[opt] as string).trim() === '') {
          errors.push(`"${label}.${opt}" is required.`);
        }
      }
      const correctOption = typeof question.correctOption === 'string' ? question.correctOption.trim().toUpperCase() : '';
      if (!VALID_OPTIONS.has(correctOption)) {
        errors.push(`"${label}.correctOption" must be one of A, B, C, D.`);
      }
      if (!question.explanationEn) warnings.push(`"${label}" has no explanationEn.`);
    });
  }

  if (errors.length > 0) return { errors, warnings };

  const questions: ParsedQuizQuestion[] = (obj.questions as unknown[]).map((q, qIdx) => {
    const question = q as Record<string, unknown>;
    return {
      topic: typeof question.topic === 'string' ? question.topic : null,
      questionTextEn: String(question.questionTextEn ?? ''),
      optionAEn: String(question.optionAEn ?? ''),
      optionBEn: String(question.optionBEn ?? ''),
      optionCEn: String(question.optionCEn ?? ''),
      optionDEn: String(question.optionDEn ?? ''),
      correctOption: String(question.correctOption ?? '').trim().toUpperCase(),
      explanationEn: typeof question.explanationEn === 'string' ? question.explanationEn : null,
      displayOrder: toNumber(question.displayOrder, qIdx + 1),
    };
  });

  if (questions.length < 5) warnings.push(`Only ${questions.length} question(s) parsed — daily quizzes are usually 5-15 questions.`);
  if (questions.length > 20) warnings.push(`${questions.length} questions parsed — that's a lot for a daily quiz, double-check the source text.`);

  const data: ParsedAiDailyQuiz = {
    quizDate: obj.quizDate as string,
    title: String(obj.title ?? ''),
    description: typeof obj.description === 'string' ? obj.description : null,
    questions,
  };

  return { errors, warnings, data };
}
