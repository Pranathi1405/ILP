// Author: E.Kaeith Emmanuel, Nd Matrix

// ─────────────────────────────────────────────
// CORE QUESTION MODEL
// ─────────────────────────────────────────────

export interface PracticeQuestion {
  id: string;
  questionText: string;

  /** Options array — empty [] for NAT questions */
  options: string[];

  /**
   * Correct answer rules by type:
   *  - MCQ : exact option string, e.g. "O(log n)"
   *  - MSQ : comma-separated option strings, e.g. "Merge Sort, Quick Sort, Heap Sort"
   *  - NAT : numeric string, e.g. "1024" or "0.5"
   */
  correctAnswer: string;

  /** Human-readable step-by-step solution shown after the answer is checked */
  solution: string;

  subject: string;
  chapter: string;

  /** Optional — empty string when not applicable */
  topic: string;
  hint?: string | null;
  type: 'MCQ' | 'MSQ' | 'NAT';

  /** Renamed from `difficulty` to match template binding `currentQuestion?.difficultyLevel` */
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';

  marks?: number;
  negativeMarks?: number;
}

// ─────────────────────────────────────────────
// TEST CONFIGURATION (builder → instructions → interface)
// ─────────────────────────────────────────────

export interface TestConfig {
  testType: 'subject' | 'chapter' | 'custom';
  subject: string;
  chapter: string;
  topic: string;

  difficulty: 'Easy' | 'Medium' | 'Hard';

  /** Selected question types, e.g. ['MCQ', 'NAT'] */
  types: Array<'MCQ' | 'MSQ' | 'NAT'>;

  numberOfQuestions: number;
}

// ─────────────────────────────────────────────
// PRACTICE TEST (teacher-created bundle — optional use)
// ─────────────────────────────────────────────

export interface PracticeTest {
  id: string;
  title: string;
  teacherId: string;
  questions: PracticeQuestion[];
  createdAt: Date;
  subject?: string;
  chapter?: string;
  topic?: string;
}

export interface PracticeState {
  practiceTests: PracticeTest[];
  activePractice: PracticeTest | null;
}
