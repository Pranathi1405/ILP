// Author: E.Kaeith Emmanuel
import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TestState } from '../../models/test';

export const selectTestState = createFeatureSelector<TestState>('test');

// ── Core fields ───────────────────────────────────────────────────────────────
export const selectQuestions = createSelector(selectTestState, (s) => s.questions);
export const selectTimeLimit = createSelector(selectTestState, (s) => s.timeLimit);
export const selectTimeLeft = createSelector(selectTestState, (s) => s.timeLeft);
export const selectAnswers = createSelector(selectTestState, (s) => s.answers);
export const selectReviewMarked = createSelector(selectTestState, (s) => s.reviewMarked);
export const selectSubmitted = createSelector(selectTestState, (s) => s.submitted);
export const selectQuestionTimes = createSelector(selectTestState, (s) => s.questionTimes);
export const selectStartTime = createSelector(selectTestState, (s) => s.startTime);
export const selectSessionId = createSelector(selectTestState, (s) => s.sessionId);

// ── IDs needed for API calls ──────────────────────────────────────────────────
export const selectTestId = createSelector(selectTestState, (s) => s.testId);
export const selectAttemptId = createSelector(selectTestState, (s) => s.attemptId);

// ── Test metadata (now includes marking scheme fields) ────────────────────────
export const selectTestMeta = createSelector(selectTestState, (s) => ({
  exam: s.exam,
  examTitle: s.examTitle,
  subjects: s.subjects,
  subjectIds: s.subjectIds,
  chapters: s.chapters,
  testType: s.testType,
  difficulty: s.difficulty,
  timeLimit: s.timeLimit,
  testId: s.testId,
  marksCorrect: s.marksCorrect, // ← now included
  marksIncorrect: s.marksIncorrect, // ← now included
}));

// ── Marking scheme (derived from meta) ───────────────────────────────────────
export const selectMarkingScheme = createSelector(selectTestMeta, (meta) => ({
  correct: meta?.marksCorrect ?? 0,
  negative: Math.abs(meta?.marksIncorrect ?? 0),
})); // ← removed the stray comma that was here

// ── UI counts ─────────────────────────────────────────────────────────────────
export const selectAttemptedCount = createSelector(
  selectAnswers,
  (answers) =>
    Object.values(answers).filter((a) => {
      if (a == null || a === '') return false;
      if (Array.isArray(a)) return a.length > 0;
      return true;
    }).length,
);

export const selectUnattemptedCount = createSelector(
  selectQuestions,
  selectAttemptedCount,
  (questions, attempted) => questions.length - attempted,
);

export const selectReviewCount = createSelector(selectReviewMarked, (marked) => marked.length);

// ── Max possible score ────────────────────────────────────────────────────────
export const selectMaxScore = createSelector(selectQuestions, (questions) =>
  questions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
);

export const selectMaxNegative = createSelector(selectQuestions, (questions) =>
  questions.reduce((sum, q) => sum + (q.negativeMarks ?? 0), 0),
);

// ── Per-question answer status ────────────────────────────────────────────────
export const selectQuestionStatuses = createSelector(
  selectQuestions,
  selectAnswers,
  selectReviewMarked,
  (questions, answers, reviewMarked) =>
    questions.map((_q, i) => {
      if (reviewMarked.includes(i)) return 'review';
      const a = answers[i];
      if (a == null || a === '') return 'unanswered';
      if (Array.isArray(a) && a.length === 0) return 'unanswered';
      return 'answered';
    }),
);
export const selectExamTitle = createSelector(
  selectTestState,
  (state) => state.examTitle ?? 'Exam',
);

export const selectHasSections = createSelector(
  selectTestState,
  (state) => state.hasSections ?? false,
);
