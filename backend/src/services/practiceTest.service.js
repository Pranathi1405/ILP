import pool from '../config/database.config.js';
import * as practiceModel from '../models/practiceTest.model.js';

export const createPracticeTest = async (userId, payload) => {
  const {
    courseId: rawCourseId,
    subjectId: rawSubjectId,
    globalSubjectId,
    chapterIds = [],
    difficulty = null,
    questionTypes = ['mcq'],
    numQuestions,
    marksCorrect = 1,
    marksIncorrect = 0,
    title,
  } = payload;

  if (!numQuestions || numQuestions < 1)
    throw { status: 400, message: 'numQuestions must be at least 1' };
  if (numQuestions > 100)
    throw { status: 400, message: 'numQuestions cannot exceed 100' };

  const subjectId = parseInt(rawSubjectId ?? globalSubjectId);
  const courseId = rawCourseId !== undefined && rawCourseId !== null ? parseInt(rawCourseId) : null;

  if (rawCourseId !== undefined && rawCourseId !== null && (isNaN(courseId) || courseId < 1)) {
    throw { status: 400, message: 'Valid courseId is required' };
  }
  if (isNaN(subjectId) || subjectId < 1) {
    throw { status: 400, message: 'Valid subjectId is required' };
  }

  if (courseId) {
    const course = await practiceModel.findStudentCourseAccess(userId, courseId);
    if (!course) {
      throw { status: 403, message: 'Selected course is not linked to this student.' };
    }
  }

  const subject = await practiceModel.findAccessibleSubjectForStudent(userId, subjectId, courseId);
  if (!subject) {
    throw { status: 404, message: 'Selected subject is not available in your linked course.' };
  }

  const moduleIds = Array.isArray(chapterIds)
    ? chapterIds.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id > 0)
    : [];

  if (moduleIds.length > 0) {
    const accessibleModuleCount = await practiceModel.countAccessibleModulesForStudent(
      userId,
      subject.subject_id,
      moduleIds,
      subject.course_id,
    );

    if (accessibleModuleCount !== moduleIds.length) {
      throw {
        status: 400,
        message: 'One or more selected chapters do not belong to the selected subject.',
      };
    }
  }

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

  const questions = await practiceModel.fetchPracticeQuestions({
    subjectId: subject.subject_id,
    questionTypes,
    difficulty,
    moduleIds,
    limit: numQuestions,
  });

  if (!questions.length)
    throw { status: 422, message: 'No questions found. Adjust your filters.' };

  const testTitle = title?.trim() || `Practice - ${new Date().toLocaleDateString('en-IN')}`;
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const testId = await practiceModel.createPracticeTest(conn, {
      subject_id: subject.subject_id,
      created_by: userId,
      title: testTitle,
      totalQuestions: questions.length,
      totalMarks: questions.reduce((s, q) => s + (q.marks || 1), 0),
    });

    const tagged = questions.map((q, i) => ({
      ...q,
      marks_correct: parseFloat(marksCorrect),
      marks_incorrect: parseFloat(marksIncorrect),
      sort_order: i + 1,
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

export const getAllPracticeTests = async (userId, query) => {
  return practiceModel.findPracticeTestsByUser(parseInt(userId), query);
};

export const getPracticeTest = async (testId, userId) => {
  const id = parseInt(testId);
  const test = await practiceModel.findPracticeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };
  return test;
};

export const startPracticeTest = async (testId, userId) => {
  const id = parseInt(testId);
  const test = await practiceModel.findPracticeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };

  const existing = await practiceModel.findActiveAttempt(id, userId);
  if (existing) return { ...existing, resumed: true };

  const [[done]] = await pool.query(
    `SELECT attempt_id FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status != 'in_progress' LIMIT 1`,
    [id, parseInt(userId)]
  );
  if (done) throw { status: 400, message: 'You have already completed this test' };

  const attemptId = await practiceModel.createAttempt(id, userId);
  return { ...await practiceModel.findAttemptById(attemptId), resumed: false };
};

export const submitAnswer = async (testId, userId, questionId, answerPayload) => {
  const id = parseInt(testId);

  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt)
    throw { status: 400, message: 'No active attempt. Start the test first.' };

  return practiceModel.saveAnswerAndGetFeedback(
    attempt.attempt_id, id, parseInt(questionId), answerPayload
  );
};

export const getHint = async (testId, userId, questionId) => {
  const id = parseInt(testId);
  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt) throw { status: 400, message: 'No active attempt found.' };
  return practiceModel.getQuestionHint(attempt.attempt_id, id, questionId);
};

export const submitPracticeTest = async (testId, userId, answers) => {
  const id = parseInt(testId);
  if (!answers?.length) throw { status: 400, message: 'answers array is required' };

  const attempt = await practiceModel.findActiveAttempt(id, userId);
  if (!attempt)
    throw { status: 400, message: 'No active attempt. Start the test first.' };

  const result = await practiceModel.submitPracticeAttempt(
    attempt.attempt_id, id, answers
  );
  return { attemptId: attempt.attempt_id, attempt_id: attempt.attempt_id, ...result };
};

export const getPracticeTestResults = async (attemptId, userId) => {
  const id = parseInt(attemptId);
  const results = await practiceModel.getAttemptResults(id);
  if (!results) throw { status: 404, message: 'Attempt not found' };
  if (parseInt(results.user_id) !== parseInt(userId))
    throw { status: 403, message: 'Access denied' };
  if (results.status === 'in_progress')
    throw { status: 400, message: 'Test not submitted yet' };
  return results;
};

export const getPracticeResultsSummary = async (userId) => {
  return practiceModel.getPracticeResultsSummary(userId);
};

export const insertQuestions = async (userId, data) => {
  const questionId = await practiceModel.insertQuestion(userId, data);
  return practiceModel.findQuestionById(questionId);
};
