/**
 * ============================================================
 * Custom UG Exam Test Service
 * ------------------------------------------------------------
 * Module  : Test Generator - Custom UG Exam Engine
 * Author  : NDMATRIX
 * Description:
 * Business logic for custom UG exam test generation.
 * Fully self-contained — no dependency on UG test module.
 * All shared DB functions come from testUtils.model.js via
 * re-exports in customUGtest.model.js
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as CustomUgTestModel from '../models/customUGtest.model.js';
//imports for updating analytics after test submission
import { emitAnalyticsEvent } from '../queues/analyticsQueue.js';
import { ANALYTICS_EVENTS } from '../constants/analyticsTypes.js';

// ─── Check subscription + custom test access ───────────────────
const checkCustomUgExamAccess = async (userId, examCode) => {
  const subscription = await CustomUgTestModel.findActiveSubscriptionWithPlan(userId);
  if (!subscription) throw { status: 403, message: 'No active subscription found' };

  const allowedExams = await CustomUgTestModel.getUserAllowedExams(userId);
  const isAllowed = allowedExams.some(e => e.exam_code === examCode);
  if (!isAllowed) {
    throw {
      status: 403,
      message: `You do not have access to ${examCode}. Please purchase the relevant course.`
    };
  }

  const limit = subscription.custom_test_limit;
  if (limit === null || limit === undefined) return subscription;

  const used = Number(subscription.custom_tests_used || 0);
  if (used >= Number(limit)) {
    throw {
      status: 403,
      message: `Custom test limit reached (${used}/${limit}). Upgrade to Pro for unlimited tests.`
    };
  }

  return subscription;
};

// ─── Get filtered exam pattern for custom test ────────────────
export const getCustomExamPattern = async (examCode, userId, subjectIds = [], difficulty = null) => {
  if (!examCode) throw { status: 400, message: 'exam_code is required' };

  const allowedExams = await CustomUgTestModel.getUserAllowedExams(userId);
  const isAllowed = allowedExams.some(e => e.exam_code === examCode);
  if (!isAllowed) {
    throw {
      status: 403,
      message: `You do not have access to ${examCode}.`
    };
  }

  const exam = await CustomUgTestModel.findExamByCode(examCode);
  if (!exam) throw { status: 404, message: `Exam '${examCode}' not found` };

  // Get total distinct subjects in this exam
  const totalSubjectCount = await CustomUgTestModel.countDistinctSubjectsInExam(exam.exam_id);

  // Get sections for selected subjects only (or all if none selected)
  const sections = subjectIds.length > 0
    ? await CustomUgTestModel.findSectionsForSubjects(exam.exam_id, subjectIds)
    : await CustomUgTestModel.getExamPatternSections(exam.exam_id);

  if (!sections.length) throw { status: 404, message: 'No sections found' };

  // Calculate totals from selected sections
  const totalQuestions = sections.reduce((sum, s) => sum + s.num_questions, 0);
  const totalMarks = sections.reduce((sum, s) => sum + (s.marks_correct * s.num_questions), 0);

  // Proportional duration
  const selectedSubjectCount = subjectIds.length || totalSubjectCount;
  const duration = Math.floor((exam.duration_mins / totalSubjectCount) * selectedSubjectCount);

  return {
    exam_id: exam.exam_id,
    exam_code: exam.exam_code,
    exam_name: exam.exam_name,
    total_subjects_in_exam: totalSubjectCount,
    selected_subjects: selectedSubjectCount,
    total_questions: totalQuestions,
    total_marks: totalMarks,
    duration_mins: duration,
    has_partial_marking: exam.has_partial_marking,
    sections: sections.map(s => ({
      section_id: s.section_id,
      subject_name: s.subject_name,
      subject_id: s.subject_id,
      section_name: s.section_name,
      question_type: s.question_type,
      num_questions: s.num_questions,
      marks_correct: s.marks_correct,
      marks_incorrect: s.marks_incorrect,
      is_optional: s.is_optional
    }))
  };
};
// ─── Get subscription-filtered exam list ──────────────────────
export const getAvailableExams = async (userId) => {
  const exams = await CustomUgTestModel.getUserAllowedExams(userId);
  if (!exams.length) throw { status: 404, message: 'No exams found for your subscription' };
  return exams;
};

// ─── Get subjects for an exam ──────────────────────────────────
export const getSubjectsForExam = async (examCode, userId) => {
  if (!examCode) throw { status: 400, message: 'exam_code is required' };

  const allowedExams = await CustomUgTestModel.getUserAllowedExams(userId);
  const isAllowed = allowedExams.some(e => e.exam_code === examCode);
  if (!isAllowed) {
    throw { status: 403, message: `You do not have access to ${examCode}.` };
  }

  const subjects = await CustomUgTestModel.getSubjectsForExam(examCode, userId); // ← add userId
  if (!subjects.length) throw { status: 404, message: 'No subjects found for this exam' };
  return subjects;
};

// ─── Get chapters for a subject ────────────────────────────────
export const getChaptersBySubject = async (subjectId) => {
  const id = parseInt(subjectId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid subjectId' };

  const chapters = await CustomUgTestModel.getChaptersBySubject(id);
  if (!chapters.length) throw { status: 404, message: 'No chapters found for this subject' };
  return chapters;
};

// ─── Generate a custom UG exam test ───────────────────────────
export const generateCustomUgTest = async (userId, payload) => {
  const {
    exam_code,
    paper_number = 1,
    subjects = [],       // array of subject_ids (integers)
    difficulty = null,
    module_ids = [],
  } = payload;

  if (!exam_code) throw { status: 400, message: 'exam_code is required' };
  if (!subjects.length) throw { status: 400, message: 'At least one subject must be selected' };

  const subscription = await checkCustomUgExamAccess(userId, exam_code);

  const normalizedSubjects = subjects
    .map(s => parseInt(s))
    .filter(n => !isNaN(n));

  if (!normalizedSubjects.length || normalizedSubjects.length !== subjects.length) {
    throw { status: 400, message: 'Invalid subjects payload. Please re-select subjects and try again.' };
  }

  const exam = await CustomUgTestModel.findExamByCode(exam_code);
  if (!exam) throw { status: 404, message: `Exam '${exam_code}' not found` };

  const totalSubjectCount = await CustomUgTestModel.countDistinctSubjectsInExam(exam.exam_id);

  // subjects is now array of subject_ids
  const sections = await CustomUgTestModel.findSectionsForSubjects(
    exam.exam_id, normalizedSubjects, paper_number
  );
  if (!sections.length) {
    // Fallback: try without paper filter / with broader query
    const fallbackSections = await CustomUgTestModel.getExamPatternSections(
      exam.exam_id,
      normalizedSubjects
    );

    if (!fallbackSections.length) {
      throw {
        status: 404,
        message: `No sections found for selected subjects`
      };
    }

    // use fallback result
    sections.splice(0, sections.length, ...fallbackSections);
  }

  // Validate enough questions exist per section
  for (const section of sections) {
    if (section.is_optional) continue;
    const available = await CustomUgTestModel.countQuestionsWithDifficulty(
      section.subject_id, section.question_type, difficulty, module_ids
    );
    if (available < section.num_questions) {
      throw {
        status: 400,
        message: `Not enough questions for ${section.subject_name}. Need ${section.num_questions}, found ${available}.`
      };
    }
  }

  let allQuestions = [];
  let totalMarks = 0;
  let totalQuestions = 0;
  let sortOrder = 1;
  const usedQuestionIds = new Set();

  for (const section of sections) {
    if (section.is_optional) continue;

    const questions = await CustomUgTestModel.getQuestionsWithDifficulty(
      section.subject_id, section.question_type,
      difficulty, section.num_questions, module_ids, Array.from(usedQuestionIds)
    );

    if (questions.length < section.num_questions) {
      throw {
        status: 400,
        message: `Not enough unique questions for ${section.subject_name}. Need ${section.num_questions}, found ${questions.length} after removing duplicates already used in this test.`
      };
    }

    const tagged = questions.map(q => ({
      ...q,
      section_id: section.section_id,
      module_id: q.module_id || null,
      marks_correct: section.marks_correct,
      marks_incorrect: section.marks_incorrect,
      question_type: section.question_type,
      paper_number: section.paper_number,
      sort_order: sortOrder++,
    }));

    allQuestions = allQuestions.concat(tagged);
    questions.forEach(q => usedQuestionIds.add(q.question_id));
    totalMarks += section.marks_correct * section.num_questions;
    totalQuestions += section.num_questions;
  }

  if (allQuestions.length === 0) {
    throw { status: 422, message: 'No questions available for the selected criteria.' };
  }

  const perSubjectMins = Math.floor(exam.duration_mins / totalSubjectCount);
  const adjustedDuration = perSubjectMins * normalizedSubjects.length;

  const subjectNames = Array.from(new Set(sections.map(s => s.subject_name)));

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const testId = await CustomUgTestModel.createCustomUgTest(connection, {
      userId,
      examId: exam.exam_id,        // now category_id
      examCode: exam.exam_code,
      examName: exam.exam_name,
      subjectNames,
      difficulty: difficulty || 'all',
      totalQuestions,
      totalMarks,
      duration: adjustedDuration
    });

    await CustomUgTestModel.insertCustomUgTestQuestions(connection, testId, allQuestions);

    await CustomUgTestModel.logCustomUgTestGeneration(connection, {
      userId,
      examId: exam.exam_id,        // now category_id
      examCode: exam.exam_code,
      subscriptionId: subscription.subscription_id,
      testId,
    });

    if (subscription.custom_test_limit !== null && subscription.custom_test_limit !== undefined) {
      await CustomUgTestModel.incrementCustomTestsUsed(connection, subscription.subscription_id);
    }

    await connection.commit();
    return CustomUgTestModel.findTestById(testId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Get all custom tests for logged-in user ──────────────────
export const getMyCustomTests = async (userId, query) => {
  const id = parseInt(userId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid user ID' };
  return CustomUgTestModel.findCustomTestsByUser(id, query);
};

// ─── Get a single custom test by ID ───────────────────────────
export const getCustomTestById = async (testId, userId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await CustomUgTestModel.findTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(userId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }
  return test;
};

// ─── Start a test attempt ──────────────────────────────────────
export const startAttempt = async (testId, userId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await CustomUgTestModel.findTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  const existing = await CustomUgTestModel.findActiveAttempt(id, userId);
  if (existing) return existing;

  const [[submitted]] = await pool.query(
    `SELECT attempt_id FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status != 'in_progress'`,
    [id, parseInt(userId)]
  );
  if (submitted) throw { status: 400, message: 'You have already submitted this test' };

  const attemptId = await CustomUgTestModel.createAttempt(id, userId, test.paper_number || 1);
  const attempt = await CustomUgTestModel.findAttemptById(attemptId);

  // ✅ EMIT TEST_STARTED
  await emitAnalyticsEvent(ANALYTICS_EVENTS.TEST_STARTED, {
    userId,
    test_id: id,
    testType: 'custom',
    started_at: new Date(),
  });

  return attempt;
};

// ─── Submit answers and score the test ────────────────────────
export const submitTest = async (testId, userId, answers) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw { status: 400, message: 'answers array is required' };
  }

  const attempt = await CustomUgTestModel.findActiveAttempt(id, userId);
  if (!attempt) {
    throw { status: 400, message: 'No active attempt found. Please start the test first.' };
  }

  const result = await CustomUgTestModel.submitAttempt(
    attempt.attempt_id,
    id,
    answers
  );

  // ✅ IMPORTANT: Fetch full results
  const fullResults = await CustomUgTestModel.getAttemptResults(attempt.attempt_id);

  // -------------------------------
  // DERIVED METRICS
  // -------------------------------
  const totalQuestions = fullResults.answers.length;

  const attemptedQuestions = fullResults.answers.filter(
    a => a.answer_status === 'answered'
  ).length;

  const correctAnswers = fullResults.answers.filter(
    a => a.is_correct === 1
  ).length;

  const partialAnswers = fullResults.answers.filter(
    a => a.is_partial === 1
  ).length;

  const lastTestAccuracy = attemptedQuestions > 0
    ? (correctAnswers / attemptedQuestions) * 100
    : 0;

  const passed = result.totalScore >= (fullResults.total_marks * 0.4);

  // -------------------------------
  // EMIT TEST_SUBMITTED
  // -------------------------------
  await emitAnalyticsEvent(ANALYTICS_EVENTS.TEST_SUBMITTED, {
    userId,
    studentId: fullResults.user_id,

    subjectId: fullResults.subject_id,   // ensure exists
    courseId: fullResults.course_id,     // ensure exists

    topicId: null, // optional for custom test
    isCorrect: false,

    testType: 'custom',

    score: result.totalScore,
    totalMarks: fullResults.total_marks,

    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    partialAnswers,

    timeTakenMinutes: fullResults.duration_minutes,
    lastTestAccuracy,

    passed,
  });

  return { attempt_id: attempt.attempt_id, ...result };
};

// ─── Get results for a completed attempt ──────────────────────
export const getResults = async (attemptId, userId) => {
  const id = parseInt(attemptId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid attempt ID' };

  const results = await CustomUgTestModel.getAttemptResults(id);
  if (!results) throw { status: 404, message: 'Attempt not found' };
  if (parseInt(results.user_id) !== parseInt(userId)) {
    throw { status: 403, message: 'You do not have access to these results' };
  }
  if (results.status === 'in_progress') {
    throw { status: 400, message: 'Test not submitted yet' };
  }
  return results;
};
