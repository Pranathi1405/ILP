// Author: E.Kaeith Emmanuel
import { createReducer, on } from '@ngrx/store';
import * as TestActions from './test.actions';
import { TestState } from '../../models/test'; // adjust path

export const initialState: TestState = {
  questions: [],
  answers: {},
  reviewMarked: [],
  submitted: false,
  timeLimit: null,
  timeLeft: 0,
  testId: null,
  attemptId: null,
  exam: '',
  subjects: [],
  subjectIds: [],
  chapters: [],
  difficulty: '',
  testType: '',
  startTime: null,
  questionTimes: {},
  sessionId: '',
  marksCorrect: 0, // ← add
  marksIncorrect: 0,
  examTitle: null,
  hasSections: false,
};

export const testReducer = createReducer(
  initialState,

  // ── Create test ────────────────────────────────────────────────
  // Resets all state to initialState first (clean slate per test),
  // then applies testData fields. This prevents stale answers or
  // reviewMarked from a previous test bleeding through.
  on(TestActions.createTest, (_state, { testData }) => ({
    ...initialState,
    questions: testData.questions ?? [],
    timeLimit: testData.timeLimit ?? null,
    timeLeft: (testData.timeLimit ?? 0) * 60, // pre-seed seconds
    testId: testData.testId ?? null,
    exam: testData.exam ?? '',
    subjects: testData.subjects ?? [],
    subjectIds: testData.subjectIds ?? [],
    chapters: testData.chapters ?? [],
    difficulty: testData.difficulty ?? '',
    testType: testData.testType ?? '',
    examTitle: testData.examTitle ?? null,
    startTime: Date.now(),
    sessionId: 'EXM-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
  })),

  // ── Set attempt ID (after startAttempt() API call) ────────────
  on(TestActions.setAttemptId, (state, { attemptId }) => ({
    ...state,
    attemptId,
  })),

  // ── Save answer ────────────────────────────────────────────────
  // answer values by question type:
  //   MCQ          → number (option_id)
  //   MSQ          → number[] (option_ids)
  //   NAT          → number
  //   MATCH_MATRIX → number (option_id)
  on(TestActions.saveAnswer, (state, { index, answer }) => ({
    ...state,
    answers: { ...state.answers, [index]: answer },
  })),

  // ── Mark for review ────────────────────────────────────────────
  on(TestActions.markForReview, (state, { index }) => ({
    ...state,
    reviewMarked: state.reviewMarked.includes(index)
      ? state.reviewMarked.filter((i) => i !== index) // toggle off if already marked
      : [...state.reviewMarked, index],
  })),

  // ── Tick question timer ────────────────────────────────────────
  on(TestActions.tickQuestion, (state, { index }) => ({
    ...state,
    questionTimes: {
      ...state.questionTimes,
      [index]: (state.questionTimes[index] ?? 0) + 1,
    },
  })),

  // ── Set timer (manual override) ────────────────────────────────
  on(TestActions.setTimer, (state, { timeLeft }) => ({
    ...state,
    timeLeft,
  })),

  // ── Submit ─────────────────────────────────────────────────────
  // Only sets submitted = true. NO local scoring.
  // Scoring is done entirely server-side via:
  //   POST /api/ug-tests/:testId/submit
  // Results are read back from:
  //   GET /api/ug-tests/attempts/:attemptId/results
  on(TestActions.submitTest, (state) => ({
    ...state,
    submitted: true,
  })),

  // ── Clear ──────────────────────────────────────────────────────
  on(TestActions.clearTest, () => ({ ...initialState })),
);
