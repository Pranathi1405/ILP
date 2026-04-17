/**
 * ============================================================
 * SME Test Service
 * ------------------------------------------------------------
 * Module  : SME Test Engine
 * Author  : NDMATRIX
 * Description:
 * Business logic for SME test creation, question management,
 * attempt flow and analytics.
 * Fully self-contained — no dependency on UG test module.
 * All shared DB functions come from testUtils.model.js via
 * re-exports in smeTest.model.js
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';

// ============================================================
// TEACHER — TEST MANAGEMENT
// ============================================================
export const getTeacherDealingSubjectsService = async (userId) => {
  if (!userId) throw { status: 400, message: 'User ID is required' };

  // ✅ Directly use userId
  const [rows] = await pool.execute(
    SmeTestModel.getTeacherDealingSubjectsModel,
    [userId]
  );

  if (!rows.length) return { courses: [] };

  // De-duplicate by course_id
  const seen = new Set();
  const courses = [];

  for (const row of rows) {
    if (!seen.has(row.course_id)) {
      seen.add(row.course_id);
      courses.push({
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        course_id: row.course_id,
        course_name: row.course_name,
        exam_id: row.exam_id,
        exam_code: row.exam_code,
        exam_name: row.exam_name,
      });
    }
  }

  return { courses };
};
export const createSmeTest = async (teacherUserId, payload) => {
  const {
    exam_code,
    subject_id,          // now integer instead of subject name string
    question_source,
    scheduled_start,
    scheduled_end
  } = payload;

  if (!exam_code) throw { status: 400, message: 'exam_code is required' };
  if (!subject_id) throw { status: 400, message: 'subject_id is required' };
  if (!question_source || !['qb', 'manual'].includes(question_source)) {
    throw { status: 400, message: 'question_source must be qb or manual' };
  }
  if (!scheduled_start) throw { status: 400, message: 'scheduled_start is required' };
  if (!scheduled_end) throw { status: 400, message: 'scheduled_end is required' };
  if (new Date(scheduled_start) >= new Date(scheduled_end)) {
    throw { status: 400, message: 'scheduled_end must be after scheduled_start' };
  }

  const exam = await SmeTestModel.findExamByCode(exam_code);
  if (!exam) throw { status: 404, message: `Exam '${exam_code}' not found` };

  // Get subject details from course_subjects
  const subject = await SmeTestModel.findSubjectById(subject_id);
  if (!subject) throw { status: 404, message: 'Subject not found' };

  // Get sections using category_id + subject_id
  const sections = await SmeTestModel.getSubjectSections(exam.exam_id, subject_id);
  if (!sections.length) {
    throw {
      status: 404,
      message: `No sections found for subject in ${exam.exam_name}`
    };
  }

  const totalQuestions = sections.reduce((sum, s) => sum + Number(s.num_questions || 0), 0);
  const totalMarks = sections.reduce(
    (sum, s) => sum + Number(s.marks_correct || 0) * Number(s.num_questions || 0),
    0
  );
  const paperNumber = sections[0].paper_number || 1;
  const proportionalDuration =
    exam.total_questions && exam.duration_mins
      ? Math.round((totalQuestions / exam.total_questions) * exam.duration_mins)
      : Number(exam.duration_mins || 60);
  const duration = Math.max(1, proportionalDuration || Number(exam.duration_mins || 60));
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const testId = await SmeTestModel.createSmeTest(connection, {
      teacherUserId,
      examId: exam.exam_id,        // now category_id
      examCode: exam.exam_code,
      examName: exam.exam_name,
      subjectName: subject.subject_name,
      subjectId: subject_id,
      questionSource: question_source,
      scheduledStart: scheduled_start,
      scheduledEnd: scheduled_end,
      totalQuestions,
      totalMarks,
      duration,
      paperNumber
    });

    await connection.commit();
    return SmeTestModel.findSmeTestById(testId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const getMySmeTests = async (teacherUserId, query) => {
  const id = parseInt(teacherUserId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid user ID' };
  return SmeTestModel.findSmeTestsByTeacher(id, query);
};

export const getPublishedSmeTests = async (query, userId) => {
  return SmeTestModel.findPublishedSmeTests({ ...query, userId });
};

export const getSmeTestById = async (testId, userId, userType) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  if (userType === 'teacher' && parseInt(test.created_by) !== parseInt(userId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }
  return test;
};


export const updateSmeTest = async (testId, teacherUserId, payload) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }

  // Validate schedule if both provided
  const start = payload.scheduled_start ?? test.scheduled_start;
  const end = payload.scheduled_end ?? test.scheduled_end;
  if (start && end && new Date(start) >= new Date(end)) {
    throw { status: 400, message: 'scheduled_end must be after scheduled_start' };
  }

  // Validate status transition
  const validStatuses = ['draft', 'published', 'archived'];
  if (payload.status && !validStatuses.includes(payload.status)) {
    throw { status: 400, message: `status must be one of: ${validStatuses.join(', ')}` };
  }

  // If publishing via status field, run section completeness check
  if (payload.status === 'published' && test.status !== 'published') {
    const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
    const incomplete = test.sections.filter(
      s => (sectionCounts[s.section_id] || 0) < s.num_questions
    );
    if (incomplete.length > 0) {
      const details = incomplete
        .map(s => `${s.section_name}: needs ${s.num_questions}, has ${sectionCounts[s.section_id] || 0}`)
        .join(', ');
      throw { status: 400, message: `Cannot publish. Incomplete sections: ${details}` };
    }
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Update test-level fields
    const testFields = {
      title: payload.title,
      status: payload.status,
      paper_number: payload.paper_number,
      duration_minutes: payload.duration_minutes,
      total_marks: payload.total_marks,
      negative_marking: payload.negative_marking,
      scheduled_start: payload.scheduled_start,
      scheduled_end: payload.scheduled_end,
    };
    await SmeTestModel.updateSmeTestMeta(connection, id, testFields);

    // 2. Update each question + its options + test_questions meta
    if (Array.isArray(payload.questions) && payload.questions.length > 0) {
      for (const q of payload.questions) {
        if (!q.question_id) continue;

        await SmeTestModel.updateQuestionAndOptions(connection, q.question_id, {
          question_text: q.question_text,
          difficulty: q.difficulty,
          correct_answer: q.correct_answer,
          options: q.options,
        });

        await SmeTestModel.updateTestQuestionMeta(connection, id, q.question_id, {
          marks_correct: q.marks_correct,
          marks_incorrect: q.marks_incorrect,
        });
      }
    }

    await connection.commit();
    return SmeTestModel.findSmeTestById(id);

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
// ============================================================
// TEACHER — QUESTION MANAGEMENT
// ============================================================

export const getAvailableQuestions = async (testId, query) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  if (test.question_source !== 'qb') {
    throw { status: 400, message: 'Available questions only applicable for QB mode tests' };
  }

  const { section_id, difficulty, page, limit } = query;
  if (!section_id) throw { status: 400, message: 'section_id is required' };

  const section = test.sections.find(s => s.section_id === parseInt(section_id));
  if (!section) throw { status: 404, message: 'Section not found for this test' };

  const addedIds = await SmeTestModel.getAddedQuestionIdsForSection(id, parseInt(section_id));
  const testAddedIds = await SmeTestModel.getAddedQuestionIdsForTest(id);

  const result = await SmeTestModel.getAvailableQbQuestions(
    section.subject_id, section.question_type,
    { difficulty, page, limit }
  );

  result.data = result.data.map(q => ({
    ...q,
    already_added: addedIds.includes(q.question_id) || testAddedIds.includes(q.question_id)
  }));

  return {
    section_id: section.section_id,
    section_name: section.section_name,
    question_type: section.question_type,
    required: section.num_questions,
    added: Number(section.questions_added),
    remaining: Number(section.remaining),
    ...result
  };
};

export const addQuestion = async (testId, teacherUserId, payload) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }
  if (test.status === 'published') {
    throw { status: 400, message: 'Cannot add questions to a published test' };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let result;

    if (test.question_source === 'qb') {
      const { section_id, question_ids } = payload;
      if (!section_id) throw { status: 400, message: 'section_id is required for QB mode' };
      if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
        throw { status: 400, message: 'question_ids array is required for QB mode' };
      }

      const section = test.sections.find(s => s.section_id === parseInt(section_id));
      if (!section) throw { status: 404, message: 'Section not found for this test' };

      const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
      const currentCount = sectionCounts[parseInt(section_id)] || 0;
      if (currentCount + question_ids.length > section.num_questions) {
        throw {
          status: 400,
          message: `${section.section_name} needs ${section.num_questions} questions. Currently has ${currentCount}. Cannot add ${question_ids.length} more.`
        };
      }

      const sectionData = {
        section_id: section.section_id,
        marks_correct: section.marks_correct,
        marks_incorrect: section.marks_incorrect,
        question_type: section.question_type,
        paper_number: section.paper_number || 1
      };

      const added = await SmeTestModel.addQbQuestions(connection, id, section_id, question_ids, sectionData);
      result = { added_count: added, message: `${added} questions added to ${section.section_name}` };

    } else {
      const {
        section_id, question_text, question_type,
        difficulty, options, correct_answer, explanation
      } = payload;

      if (!section_id) throw { status: 400, message: 'section_id is required' };
      if (!question_text) throw { status: 400, message: 'question_text is required' };
      if (!question_type) throw { status: 400, message: 'question_type is required' };
      if (!difficulty) throw { status: 400, message: 'difficulty is required' };

      const section = test.sections.find(s => s.section_id === parseInt(section_id));
      if (!section) throw { status: 404, message: 'Section not found for this test' };

      const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
      const currentCount = sectionCounts[parseInt(section_id)] || 0;
      if (currentCount >= section.num_questions) {
        throw {
          status: 400,
          message: `${section.section_name} already has ${currentCount}/${section.num_questions} questions.`
        };
      }

      const natTypes = ['nat', 'numerical'];
      if (!natTypes.includes(question_type)) {
        if (!options || !Array.isArray(options) || options.length < 2) {
          throw { status: 400, message: 'At least 2 options are required' };
        }
        if (!options.some(o => o.is_correct)) {
          throw { status: 400, message: 'At least one correct option is required' };
        }
      }

      const sectionData = {
        section_id: section.section_id,
        marks_correct: section.marks_correct,
        marks_incorrect: section.marks_incorrect,
        question_type: section.question_type,
        paper_number: section.paper_number || 1
      };

      const questionId = await SmeTestModel.addManualQuestion(connection, id, teacherUserId, {
        globalSubjectId: section.global_subject_id,
        questionText: question_text, questionType: question_type,
        difficulty, options: options || [],
        correctAnswer: correct_answer || null,
        explanation: explanation || null, sectionData
      });

      result = { question_id: questionId, message: 'Question added successfully' };
    }

    await connection.commit();

    const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
    const updatedSections = test.sections.map(s => ({
      section_id: s.section_id,
      section_name: s.section_name,
      question_type: s.question_type,
      required: s.num_questions,
      added: sectionCounts[s.section_id] || 0,
      remaining: s.num_questions - (sectionCounts[s.section_id] || 0),
      complete: (sectionCounts[s.section_id] || 0) >= s.num_questions
    }));

    const allComplete = updatedSections.every(s => s.complete);
    return { ...result, sections: updatedSections, all_sections_complete: allComplete, ready_to_publish: allComplete };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const removeQuestion = async (testId, questionId, teacherUserId) => {
  const id = parseInt(testId);
  const qid = parseInt(questionId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };
  if (isNaN(qid)) throw { status: 400, message: 'Invalid question ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }
  if (test.status === 'published') {
    throw { status: 400, message: 'Cannot remove questions from a published test' };
  }

  const affected = await SmeTestModel.removeQuestion(id, qid);
  if (!affected) throw { status: 404, message: 'Question not found in this test' };

  const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
  const updatedSections = test.sections.map(s => ({
    section_id: s.section_id, section_name: s.section_name,
    required: s.num_questions,
    added: sectionCounts[s.section_id] || 0,
    remaining: s.num_questions - (sectionCounts[s.section_id] || 0)
  }));

  return { message: 'Question removed successfully', sections: updatedSections };
};

export const publishTest = async (testId, teacherUserId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'You do not have access to this test' };
  }
  if (test.status === 'published') {
    throw { status: 400, message: 'Test is already published' };
  }

  const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
  const incompleteSections = test.sections.filter(s =>
    (sectionCounts[s.section_id] || 0) < s.num_questions
  );
  if (incompleteSections.length > 0) {
    const details = incompleteSections
      .map(s => `${s.section_name}: needs ${s.num_questions}, has ${sectionCounts[s.section_id] || 0}`)
      .join(', ');
    throw { status: 400, message: `Cannot publish. Incomplete sections: ${details}` };
  }

  await SmeTestModel.publishTest(id);
  return SmeTestModel.findSmeTestById(id);
};

export const deleteSmeTest = async (testId, teacherUserId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  // ✅ Ownership check
  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'No access to this test' };
  }

  const now = new Date();
  const start = new Date(test.scheduled_start);
  const end = new Date(test.scheduled_end);

  if (now >= start && now <= end) {
    throw {
      status: 400,
      message: 'Cannot delete test while it is ongoing'
    };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await SmeTestModel.deleteTestCascade(connection, id);

    await connection.commit();

    return {
      deleted: true,
      test_id: id
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ============================================================
// STUDENT — ATTEMPT FLOW
// ============================================================

export const startAttempt = async (testId, userId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (test.status !== 'published') {
    throw { status: 400, message: 'Test is not available yet' };
  }

  const now = new Date();
  const start = new Date(test.scheduled_start);
  const end = new Date(test.scheduled_end);

  if (now < start) throw { status: 400, message: `Test starts at ${test.scheduled_start}` };
  if (now > end) throw { status: 400, message: 'Test window has ended' };

  const durationMs = test.duration_minutes * 60 * 1000;
  const timeRemainingMs = end - now;
  const effectiveDurationMins = Math.floor(Math.min(durationMs, timeRemainingMs) / 60000);

  // Return existing in-progress attempt with questions
  const existing = await SmeTestModel.findExistingAttempt(id, userId);
  if (existing) {
    if (existing.status === 'in_progress') {
      const testDetail = await SmeTestModel.findTestById(id);
      return {
        attempt: {
          ...existing,
          scheduled_end: test.scheduled_end,
          effective_duration_mins: effectiveDurationMins,
          time_remaining_mins: effectiveDurationMins
        },
        test: testDetail
      };
    }
    throw { status: 400, message: 'You have already attempted this test' };
  }

  const attemptId = await SmeTestModel.createAttempt(id, userId, test.paper_number || 1);
  const attempt = await SmeTestModel.findAttemptById(attemptId);
  const testDetail = await SmeTestModel.findTestById(id);
  await emitAnalyticsEvent(ANALYTICS_EVENTS.TEST_STARTED, {
    userId,
    test_id: id,
    attempt_id: attemptId,
    started_at: new Date()
  });

  return {
    attempt: {
      ...attempt,
      scheduled_end: test.scheduled_end,
      effective_duration_mins: effectiveDurationMins,
      time_remaining_mins: effectiveDurationMins
    },
    test: testDetail
  };
};

export const submitTest = async (testId, userId, answers) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw { status: 400, message: 'answers array is required' };
  }

  const attempt = await SmeTestModel.findActiveAttempt(id, userId);
  if (!attempt) {
    throw { status: 400, message: 'No active attempt found. Please start the test first.' };
  }

  const result = await SmeTestModel.submitAttempt(attempt.attempt_id, id, answers);
  return { attempt_id: attempt.attempt_id, ...result };
};

export const getResults = async (attemptId, userId) => {
  const id = parseInt(attemptId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid attempt ID' };

  const results = await SmeTestModel.getAttemptResults(id);
  if (!results) throw { status: 404, message: 'Attempt not found' };
  if (parseInt(results.user_id) !== parseInt(userId)) {
    throw { status: 403, message: 'You do not have access to these results' };
  }
  if (results.status === 'in_progress') {
    throw { status: 400, message: 'Test not submitted yet' };
  }

  const test = await SmeTestModel.findSmeTestById(results.test_id);
  const now = new Date();
  const end = new Date(test.scheduled_end);
  if (now < end) {
    throw { status: 400, message: `Results will be available after ${test.scheduled_end}` };
  }

  const fullResults = await SmeTestModel.getAttemptResults(attempt.attempt_id);

  // -------------------------------
  // DERIVE METRICS (IMPORTANT)
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

  // -------------------------------
  // EMIT EVENT 
  // -------------------------------
  await emitAnalyticsEvent(ANALYTICS_EVENTS.TEST_SUBMITTED, {
    userId,
    studentId: fullResults.user_id,

    subjectId: fullResults.subject_id,
    courseId: fullResults.course_id,

    topicId: null, // or derive if needed
    isCorrect: false, // optional (only needed for topic mastery granularity)

    testType: fullResults.exam_type || 'sme',

    score: result.totalScore,
    totalMarks: fullResults.total_marks,

    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    partialAnswers,

    timeTakenMinutes: fullResults.duration_minutes,
    lastTestAccuracy,

    passed: result.totalScore >= (fullResults.total_marks * 0.4),
  });

  return results;
};

// ============================================================
// ANALYTICS
// ============================================================

export const getSmeTestAnalytics = async (testId, teacherUserId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };
  if (parseInt(test.created_by) !== parseInt(teacherUserId)) {
    throw { status: 403, message: 'You do not have access to this test analytics' };
  }

  const analytics = await SmeTestModel.getSmeTestAnalytics(id);
  return { test_id: id, title: test.title, ...analytics };
};
