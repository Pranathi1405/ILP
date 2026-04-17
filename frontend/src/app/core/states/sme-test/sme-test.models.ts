// Author: E.Kaeith Emmanuel, Nd Matrix

export type TestMode = 'manual' | 'bank' | null;
export type StepStatus = 'upcoming' | 'in-progress' | 'completed';
export type QuestionType = 'MCQ' | 'MSQ' | 'NAT' | 'INTEGER' | 'ASSERTION_REASON' | 'MATCH_MATRIX';

export interface AnswerOption {
  id: number;
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface ManualQuestion {
  id: string | number;
  subject: string;
  questionText: string;
  questionType: QuestionType; // ← added
  options: AnswerOption[];
  explanation: string;
  pdfFileName?: string;

  // NAT / INTEGER
  correctNumerical?: number | null; // ← added

  // ASSERTION_REASON
  assertionText?: string; // ← added
  reasonText?: string; // ← added

  // MATCH_MATRIX
  matchLeft?: string[]; // ← added
  matchRight?: string[]; // ← added
}

export interface SubjectAllocation {
  name: string;
  icon: string;
  bankCount: number;
  qty: number;
}

export interface TestBuilderState {
  testTitle: string;
  selectedSubjects: string[];
  totalQuestions: number;
  estimatedDuration: number;
  mode: TestMode;

  manualQuestions: ManualQuestion[];
  currentQuestion: ManualQuestion;
  sessionId: string;

  allocations: SubjectAllocation[];

  currentStep: number;
  totalSteps: number;
}

export const ALL_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology'];

export const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: 'Σ',
  Physics: '⚡',
  Chemistry: '⚗',
  Biology: '🧬',
};

export const BANK_COUNTS: Record<string, number> = {
  Mathematics: 1240,
  Physics: 856,
  Chemistry: 2105,
  Biology: 980,
};

export function blankQuestion(subjects: string[]): ManualQuestion {
  return {
    id: `q_${Date.now() + Math.random()}`,
    subject: subjects[0] ?? '',
    questionText: '',
    questionType: 'MCQ',
    options: [
      { id: 1, letter: 'A', text: '', isCorrect: true },
      { id: 2, letter: 'B', text: '', isCorrect: false },
      { id: 3, letter: 'C', text: '', isCorrect: false },
      { id: 4, letter: 'D', text: '', isCorrect: false },
    ],
    explanation: '',
    correctNumerical: null,
    assertionText: '',
    reasonText: '',
    matchLeft: ['', '', '', ''],
    matchRight: ['', '', '', ''],
  };
}

export function buildAllocations(subjects: string[]): SubjectAllocation[] {
  return subjects.map((s) => ({
    name: s,
    icon: SUBJECT_ICONS[s] ?? '📚',
    bankCount: BANK_COUNTS[s] ?? 0,
    qty: 0,
  }));
}

export function initialState(): TestBuilderState {
  const subjects = ['Mathematics'];

  return {
    testTitle: '',
    selectedSubjects: subjects,
    totalQuestions: 25,
    estimatedDuration: 60,
    mode: null,

    manualQuestions: [],
    currentQuestion: blankQuestion(subjects),

    sessionId: `Q-${Math.floor(Math.random() * 9000 + 1000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,

    allocations: buildAllocations(subjects),

    currentStep: 1,
    totalSteps: 4,
  };
}
