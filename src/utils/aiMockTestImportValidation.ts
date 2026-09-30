import { stripCodeFences } from './aiJobImportValidation';

export interface ParsedTestQuestion {
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

export interface ParsedTestSection {
  name: string;
  displayOrder: number;
  questions: ParsedTestQuestion[];
}

export interface ParsedAiMockTest {
  title: string;
  examName: string;
  durationMinutes: number;
  negativeMarking: number;
  marksPerQuestion: number;
  isFree: boolean;
  price?: number | null;
  instructions?: string | null;
  sections: ParsedTestSection[];
}

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  return fallback;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  data?: ParsedAiMockTest;
}

/** Parses + validates the AI-returned JSON against the schema `aiPrompts.ts`'s Mock Test extraction
 * prompt requests, matching the backend's `UpsertTestRequest` shape. Hard errors block posting;
 * warnings (e.g. a section with very few questions) are shown but don't block. */
export function validateAiMockTestImport(rawText: string): ValidationResult {
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

  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    errors.push('Missing or empty required field: "title"');
  }
  if (typeof obj.examName !== 'string' || obj.examName.trim() === '') {
    errors.push('Missing or empty required field: "examName"');
  }

  const durationMinutes = toNumber(obj.durationMinutes, -1);
  if (durationMinutes <= 0) errors.push('"durationMinutes" must be a positive number.');

  const negativeMarking = toNumber(obj.negativeMarking, -1);
  if (negativeMarking < 0) errors.push('"negativeMarking" must be a number (0 or more).');

  const marksPerQuestion = toNumber(obj.marksPerQuestion, -1);
  if (marksPerQuestion <= 0) errors.push('"marksPerQuestion" must be a positive number.');

  const isFree = obj.isFree !== false;
  const price = obj.price !== undefined && obj.price !== null ? toNumber(obj.price) : null;
  if (!isFree && (price === null || price <= 0)) {
    errors.push('"price" must be a positive number when "isFree" is false.');
  }

  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    errors.push('"sections" must be a non-empty array.');
  } else {
    obj.sections.forEach((s, sIdx) => {
      const section = s as Record<string, unknown>;
      if (typeof section.name !== 'string' || section.name.trim() === '') {
        errors.push(`"sections[${sIdx}].name" is required.`);
      }
      if (!Array.isArray(section.questions) || section.questions.length === 0) {
        errors.push(`"sections[${sIdx}].questions" must be a non-empty array.`);
        return;
      }
      section.questions.forEach((q, qIdx) => {
        const question = q as Record<string, unknown>;
        const label = `sections[${sIdx}].questions[${qIdx}]`;
        if (typeof question.subject !== 'string' || question.subject.trim() === '') {
          errors.push(`"${label}.subject" is required.`);
        }
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
    });
  }

  if (errors.length > 0) return { errors, warnings };

  const sections: ParsedTestSection[] = (obj.sections as unknown[]).map((s, sIdx) => {
    const section = s as Record<string, unknown>;
    const questions: ParsedTestQuestion[] = (section.questions as unknown[]).map((q, qIdx) => {
      const question = q as Record<string, unknown>;
      return {
        subject: String(question.subject ?? ''),
        topic: typeof question.topic === 'string' ? question.topic : null,
        questionTextEn: String(question.questionTextEn ?? ''),
        optionAEn: String(question.optionAEn ?? ''),
        optionBEn: String(question.optionBEn ?? ''),
        optionCEn: String(question.optionCEn ?? ''),
        optionDEn: String(question.optionDEn ?? ''),
        correctOption: String(question.correctOption ?? '').trim().toUpperCase(),
        explanationEn: typeof question.explanationEn === 'string' ? question.explanationEn : null,
        marks: toNumber(question.marks, marksPerQuestion),
        displayOrder: toNumber(question.displayOrder, qIdx + 1),
      };
    });
    return {
      name: String(section.name ?? ''),
      displayOrder: toNumber(section.displayOrder, sIdx + 1),
      questions,
    };
  });

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  if (totalQuestions < 5) warnings.push(`Only ${totalQuestions} question(s) parsed — double-check the source text was complete.`);

  const data: ParsedAiMockTest = {
    title: String(obj.title ?? ''),
    examName: String(obj.examName ?? ''),
    durationMinutes,
    negativeMarking,
    marksPerQuestion,
    isFree,
    price: isFree ? null : price,
    instructions: typeof obj.instructions === 'string' ? obj.instructions : null,
    sections,
  };

  return { errors, warnings, data };
}
