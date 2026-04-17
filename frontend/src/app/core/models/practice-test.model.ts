// ─── Request / Response Models ─────────────────────────────────────────────

export interface CreatePracticeTestPayload {
  courseId?: number;
  subjectId: number;
  chapterIds?: number[];
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  questionTypes?: QuestionType[];
  numQuestions: number;
  marksCorrect?: number;
  marksIncorrect?: number;
  title?: string;
}

export type QuestionType = 'mcq' | 'mcq_multi' | 'numerical';

export interface QuestionOption {
  option_id: number;
  option_text: string;
  option_image_url?: string | null;
  is_correct?: 0 | 1;
}

export interface PracticeQuestion {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  marks_correct: number;
  marks_incorrect: number;
  question_image_url?: string | null;
  paragraph_text?: string | null;
  hints?: string | null;
  explanation?: string | null;
  sort_order: number;
  options: QuestionOption[];
}

export interface PracticeTest {
  test_id: number;
  title: string;
  total_questions: number;
  total_marks: number;
  subject_id: number;
  negative_marking: 0 | 1;
  duration_minutes: number;
  created_by: number;
  created_at: string;
  status: string;
  questions: PracticeQuestion[];
}

export interface Attempt {
  attempt_id: number;
  test_id: number;
  user_id: number;
  started_at: string;
  status: 'in_progress' | 'submitted';
  resumed?: boolean;
}

// ─── Answer Payloads ────────────────────────────────────────────────────────

export interface AnswerPayload {
  questionId: number;
  selected_option_id?: number | null;
  selected_option_ids?: number[] | null;
  numerical_answer?: string | null;
}

export interface AnswerFeedback {
  questionId: number;
  isCorrect: boolean;
  is_correct: 0 | 1;
  isPartial: boolean;
  marksObtained: number;
  correctOptionId: number | null;
  correctOptionIds: number[];
  correctOptionText: string | null;
  correctNumerical: string | null;
  explanation: string | null;
  allOptions: QuestionOption[];
}

// ─── Results ────────────────────────────────────────────────────────────────

export interface AnswerResult {
  question_id: number;
  question_text_snapshot: string;
  selected_option_id?: number;
  selected_option_ids?: number[];
  numerical_answer?: string;
  correct_option_id?: number;
  correct_option_ids?: number[];
  correct_numerical?: string;
  correct_option_text?: string;
  selected_option_text?: string;
  all_options: QuestionOption[];
  is_correct: 0 | 1;
  is_partial: 0 | 1;
  marks_obtained: number;
  difficulty: string;
  question_type: QuestionType;
  explanation?: string;
  hints?: string;
  sort_order: number;
  marks_correct?: number;
  marks_incorrect?: number;
}

export interface TestResults {
  attempt_id: number;
  test_id: number;
  user_id: number;
  status: string;
  total_score: number;
  accuracy_percent: number;
  time_taken_sec: number;
  started_at: string;
  submitted_at: string;
  title: string;
  total_questions: number;
  total_marks: number;
  answers: AnswerResult[];
}
export interface PracticeTestListItem {
  test_id: number;
  title: string;
  total_questions: number;
  total_marks: number;
  created_at: string;
  status: string;
  attempt_id: number;
  attempt_status: string;
  total_score: any;
  accuracy_percent: number;
  submitted_at: string;
}
export interface SubjectStat {
  subject_id: number;
  total: number;
  correct: number;
  accuracy: number;
}

export interface WeakChapter {
  module_id: number;
  total: number;
  correct: number;
  accuracy: number;
}

export interface PracticeResultsSummary {
  overall: {
    total_tests: number;
    total_correct: number;
    total_questions: number;
    avg_accuracy: number;
    total_score: number;
  };
  bySubject: SubjectStat[];
  weakChapters: WeakChapter[];
}

// ─── Local state for active test ────────────────────────────────────────────

export interface ActiveAnswerState {
  questionId: number;
  selected_option_id?: number | null;
  selected_option_ids?: number[];
  numerical_answer?: string;
  feedback?: AnswerFeedback;
  status: 'unanswered' | 'answered' | 'skipped';
}
