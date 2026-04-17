// Author: E.Kaeith Emmanuel

export interface InterfaceQuestion {
  id: number;
  question: string;
  questionType: QuestionType;
  options: InterfaceOption[];
  marks: number;
  negativeMarks: number;
  subjectName: string;
  section: string;
  sortOrder: number;
  difficulty: string;
  matchLeft?: string[];
  matchRight?: string[];
}

export interface InterfaceOption {
  id: number;
  label: string;
  text: string;
}

export type QuestionType = 'MCQ' | 'MSQ_PARTIAL' | 'MSQ_NO_PARTIAL' | 'NAT' | 'MATCH_MATRIX';

export interface TestState {
  questions: InterfaceQuestion[];
  answers: { [key: number]: any };
  reviewMarked: number[];
  submitted: boolean;
  timeLimit: number | null;
  timeLeft: number;
  testId: number | null;
  attemptId: number | null;
  exam: string;
  subjects: string[];
  subjectIds: number[];
  chapters: string[];
  difficulty: string;
  testType: string;
  startTime: number | null;
  questionTimes: { [key: number]: number };
  sessionId: string;
  marksCorrect: number; // ← added: positive marks per question
  marksIncorrect: number;
  examTitle: string | null;
  hasSections: boolean;
}
