/**
 * ============================================================
 * Practice Test Service
 * ------------------------------------------------------------
 * Module  : Test Generator - Practice Test Engine
 * Author  : sathvik goli, Hashitha Ravuri
 * Description:
 * Business logic for self-prepared practice tests.
 *
 * Schema alignment (updated):
 *  - No globalSubjectId / global_subject_id anywhere.
 *  - Subject resolved purely via course_subjects.subject_id.
 *  - Questions linked to subject via
 *      questions.module_id → subject_modules.subject_id
 *  - tests.exam_type = 'practice' used for filtering.
 *  - tests.is_deleted / is_active columns respected.
 * ============================================================
 */

import pool from '../config/database.config.js';
import * as practiceModel from '../models/practiceTest.model.js';

// ─── Create practice test ─────────────────────────────────────────────────────

export const createPracticeTest = async (userId, payload) => {
  const {
    courseId: rawCourseId,
    subjectId: rawSubjectId,
    chapterIds    = [],
    difficulty    = null,
    questionTypes = ['mcq'],
    numQuestions,
    marksCorrect   = 1,
    marksIncorrect = 0,
    title,
  } = payload;

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!numQuestions || numQuestions < 1)
    throw { status: 400, message: 'numQuestions must be at least 1' };
  if (numQuestions > 100)
    throw { status: 400, message: 'numQuestions cannot exceed 100' };

  // ✅ subjectId is the only subject identifier — no globalSubjectId
  const subjectId = parseInt(rawSubjectId);
  if (isNaN(subjectId) || subjectId < 1)
    throw { status: 400, message: 'Valid subjectId is required' };

  const courseId = rawCourseId !== undefined && rawCourseId !== null
    ? parseInt(rawCourseId)
    : null;

  if (rawCourseId !== undefined && rawCourseId !== null && (isNaN(courseId) || courseId < 1))
    throw { status: 400, message: 'Valid courseId is required when provided' };

  // ── Course access check ───────────────────────────────────────────────────
  if (courseId) {
    const course = await practiceModel.findStudentCourseAccess(userId, courseId);
    if (!course)
      throw { status: 403, message: 'Selected course is not linked to this student.' };
  }

  // ── Subject access check ──────────────────────────────────────────────────
  // Resolves subject from course_subjects — no global_subject_id involved.
  const subject = await practiceModel.findAccessibleSubjectForStudent(userId, subjectId, courseId);
  if (!subject)
    throw { status: 404, message: 'Selected subject is not available in your linked course.' };

  // ── Chapter (module) validation ───────────────────────────────────────────
  const moduleIds = Array.isArray(chapterIds)
    ? chapterIds.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id > 0)
    : [];

  if (moduleIds.length > 0) {
    const accessible = await practiceModel.countAccessibleModulesForStudent(
      userId,
      subject.subject_id,
      moduleIds,
      subject.course_id,
    );
    if (accessible !== moduleIds.length) {
      throw {
        status: 400,
        message: 'One or more selected chapters do not belong to the selected subject.',
      };
    }
  }

  // ── Question availability check ───────────────────────────────────────────
  const available = await practiceModel.countAvailableQuestions({
    subjectId: subject.subject_id,
    questionTypes,
    difficulty,
    moduleIds,
  });

  if (available < numQuestions) {
    throw {
      status: 400,
      message: `Only ${available} questions available. Requested ${numQuestions}.`,
    };
  }

  // ── Fetch questions ───────────────────────────────────────────────────────
  // fetchPracticeQuestions now returns q.module_id on each question row.
  const questions = await practiceModel.fetchPracticeQuestions({
    subjectId: subject.subject_id,
    questionTypes,
    difficulty,
    moduleIds,
    limit: numQuestions,
  });

  if (!questions.length)
    throw { status: 422, message: 'No questions found. Adjust your filters.' };

  // ── Build test ────────────────────────────────────────────────────────────
  const testTitle = title?.trim() || `Practice - ${new Date().toLocaleDateString('en-IN')}`;

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const testId = await practiceModel.createPracticeTest(conn, {
      subject_id:     subject.subject_id,
      created_by:     userId,
      title:          testTitle,
      totalQuestions: questions.length,
      totalMarks:     questions.reduce((s, q) => s + Number(q.marks || 1), 0),
    });

    // Attach marks config + sort order before inserting test_questions
    const tagged = questions.map((q, i) => ({
      ...q,
      marks_correct:   parseFloat(marksCorrect),
      marks_incorrect: parseFloat(marksIncorrect),
      sort_order:      i + 1,
      // q.module_id already present from fetchPracticeQuestions
    }));

    await practiceModel.insertPracticeTestQuestions(conn, testId, tagged);
    await conn.commit();

    return practiceModel.findPracticeTestById(testId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ─── List all practice tests for user ─────────────────────────────────────────

export const getAllPracticeTests = async (userId, query) => {
  return practiceModel.findPracticeTestsByUser(parseInt(userId), query);
};

// ─── Get single practice test ──────────────────────────────────────────────────

export const getPracticeTest = async (testId, userId) => {
  const id   = parseInt(testId);
  const test = await practiceModel.findPracticeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };
  return test;
};

// ─── Start / resume attempt ────────────────────────────────────────────────────

export const startPracticeTest = async (testId, userId) => {
  const id   = parseInt(testId);
  const test = await practiceModel.findPracticeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };

  // Resume in-progress attempt if one exists
  const existing = await practiceModel.findActiveAttempt(id, userId);
  if (existing) return { ...existing, resumed: true };

  // Block re-attempt if already completed
  const [[done]] = await pool.query(
    `SELECT attempt_id FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status != 'in_progress'
     LIMIT 1`,
    [id, parseInt(userId)]
  );
  if (done) throw { status: 400, message: 'You have already completed this test' };

  const attemptId = await practiceModel.createAttempt(id, userId);
  return { ...await practiceModel.findAttemptById(attemptId), resumed: false };
};

// ─── Submit single answer (per-question mode) ─────────────────────────────────

export const submitAnswer = async (testId, userId, questionId, answerPayload) => {
  const id      = parseInt(testId);
  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt)
    throw { status: 400, message: 'No active attempt. Start the test first.' };

  return practiceModel.saveAnswerAndGetFeedback(
    attempt.attempt_id,
    id,
    parseInt(questionId),
    answerPayload,
  );
};

// ─── Get hint for a question ───────────────────────────────────────────────────

export const getHint = async (testId, userId, questionId) => {
  const id      = parseInt(testId);
  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt) throw { status: 400, message: 'No active attempt found.' };
  return practiceModel.getQuestionHint(attempt.attempt_id, id, parseInt(questionId));
};

// ─── Submit full test ──────────────────────────────────────────────────────────

export const submitPracticeTest = async (testId, userId, answers) => {
  const id = parseInt(testId);
  if (!answers?.length) throw { status: 400, message: 'answers array is required' };

  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt)
    throw { status: 400, message: 'No active attempt. Start the test first.' };

  const result = await practiceModel.submitPracticeAttempt(
    attempt.attempt_id,
    id,
    answers,
  );
  return { attemptId: attempt.attempt_id, attempt_id: attempt.attempt_id, ...result };
};

// ─── Get attempt results ───────────────────────────────────────────────────────

export const getPracticeTestResults = async (attemptId, userId) => {
  const id      = parseInt(attemptId);
  const results = await practiceModel.getAttemptResults(id);
  if (!results) throw { status: 404, message: 'Attempt not found' };
  if (parseInt(results.user_id) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };
  if (results.status === 'in_progress')
    throw { status: 400, message: 'Test not submitted yet' };
  return results;
};

// ─── Aggregate summary ─────────────────────────────────────────────────────────

export const getPracticeResultsSummary = async (userId) => {
  return practiceModel.getPracticeResultsSummary(parseInt(userId));
};

// ─── Insert question (admin/teacher utility) ───────────────────────────────────

export const insertQuestions = async (userId, data) => {
  const questionId = await practiceModel.insertQuestion(userId, data);
  return practiceModel.findQuestionById(questionId);
};