/**
 * ============================================================
 * Question Mapper
 * ------------------------------------------------------------
 * Maps backend UgTestQuestion shape → interface question shape.
 *
 * Backend DB types  → Interface questionType
 * ─────────────────────────────────────────
 * mcq               → MCQ
 * mcq_multi         → MSQ_PARTIAL  (has partial marking per exam)
 * numerical         → NAT
 * match_list        → MATCH_MATRIX
 *
 * Backend fields used:
 *   question_id, question_text, question_type,
 *   options[{ option_id, option_text }],
 *   marks_correct, marks_incorrect,
 *   subject_name, section_name, sort_order, difficulty
 * ============================================================
 */

import { UgTestQuestion } from '../services/tests/custom-tests/custom-test'; // adjust path

// ─── Interface question shape (what the test interface expects) ─

export interface InterfaceQuestion {
  id: number; // question_id
  question: string; // question_text
  questionType: InterfaceQuestionType; // mapped from question_type
  options: InterfaceOption[]; // mapped from options[]
  marks: number; // marks_correct
  negativeMarks: number; // abs(marks_incorrect)
  subjectName: string; // subject_name
  section: string; // section_name
  sortOrder: number; // sort_order
  difficulty: string; // difficulty
  // match_list specific — populated only for MATCH_MATRIX
  matchLeft?: string[];
  matchRight?: string[];
  paragraph?: string;
  /** Section name — e.g. "Section A", "Section B" */
  sectionName?: string;
  sectionId?: number;
  imageUrl?: string | null;
}

export interface InterfaceOption {
  id: number; // option_id
  label: string; // A / B / C / D
  text: string; // option_text
  imageUrl?: string | null;
}
export interface AnswerChangeEvent<T> {
  value: T | null;
}

export type InterfaceQuestionType =
  | 'MCQ'
  | 'MSQ_PARTIAL'
  | 'MSQ_NO_PARTIAL'
  | 'NAT'
  | 'MATCH_MATRIX'
  | 'INTEGER'
  | 'PARAGRAPH_MCQ'
  | 'ASSERTION_REASON';

// ─── Type map ────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const DB_TYPE_MAP: Record<string, InterfaceQuestionType> = {
  mcq: 'MCQ',
  mcq_multi: 'MSQ_PARTIAL', // default; override to MSQ_NO_PARTIAL if has_partial_marking = 0
  nat: 'NAT',
  match_list: 'MATCH_MATRIX',
};

// ─── Single question mapper ───────────────────────────────────────

export function mapQuestion(q: UgTestQuestion, hasPartialMarking = true): InterfaceQuestion {
  const dbType = q.question_type?.toLowerCase() ?? '';
  let questionType: InterfaceQuestionType = DB_TYPE_MAP[dbType] ?? 'MCQ';

  if (dbType === 'mcq_multi' && !hasPartialMarking) {
    questionType = 'MSQ_NO_PARTIAL';
  }

  const options: InterfaceOption[] = (q.options ?? []).map((opt, idx) => ({
    id: opt.option_id,
    label: OPTION_LABELS[idx] ?? String(idx + 1),
    text: opt.option_text,
    imageUrl: opt.option_image_url ?? null, // ← map image
  }));

  let matchLeft: string[] | undefined;
  let matchRight: string[] | undefined;
  if (questionType === 'MATCH_MATRIX' && options.length >= 2) {
    const half = Math.ceil(options.length / 2);
    matchLeft = options.slice(0, half).map((o) => o.text);
    matchRight = options.slice(half).map((o) => o.text);
  }

  return {
    id: q.question_id,
    question: q.question_text,
    questionType,
    options,
    marks: Number(q.marks_correct),
    negativeMarks: Math.abs(Number(q.marks_incorrect)),
    subjectName: q.subject_name,
    section: q.section_name,
    sortOrder: q.sort_order,
    difficulty: q.difficulty,
    imageUrl: q.question_image_url ?? null, // ← map image
    ...(matchLeft && { matchLeft }),
    ...(matchRight && { matchRight }),
  };
}

// ─── Batch mapper ─────────────────────────────────────────────────

export function mapQuestions(
  questions: UgTestQuestion[],
  hasPartialMarking = true,
): InterfaceQuestion[] {
  return questions.map((q) => mapQuestion(q, hasPartialMarking));
}

// In interface.ts — replace selectParagraph
