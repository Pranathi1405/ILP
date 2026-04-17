/**
 * ============================================================
 * Teacher SME Controller
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for teacher operations in the course SME flow.
 *
 * Rules enforced here:
 *   - Teacher can only modify child tests assigned to them
 *   - Parent test published → all modifications blocked
 *   - After every question add/remove → checkAndCompleteAssignment() called
 *   - Section limits validated before insert
 * ============================================================
 */
import { getTeacherAssignedSmeTests } from '../services/smeTestOrchestrator.service.js';
import { checkAndCompleteAssignment } from '../services/assignment.service.js';
import { createAndAttachQuestion, createAndAttachBulk } from '../services/question.service.js';
import * as smeTestService from '../services/smeTest.service.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import pool from '../config/database.config.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ──────────────────────────────────────────────────────────────
// GET /api/teacher/sme-tests/assigned
// Returns assignments enriched with section-level progress.
// ──────────────────────────────────────────────────────────────
export const getAssignedTests = async (req, res) => {
  try {
    const data = await getTeacherAssignedSmeTests(req.user.id);
    sendSuccess(res, 200, 'Assigned tests fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/teacher/sme-tests/:id/questions
// Supports single question OR bulk array.
// Uses centralized createAndAttachQuestion (question.service).
// ──────────────────────────────────────────────────────────────
export const addQuestionWithCompletion = async (req, res) => {
  const connection = await pool.getConnection();
  const [[db]] = await connection.query('SELECT DATABASE() as db');
  console.log(db);
  try {
    const testId = parseInt(req.params.id);
    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    await assertTeacherAssigned(testId, req.user.id);

    // ── Publish lock ───────────────────────────────────────────
    await assertParentNotPublished(testId);

    const test = await SmeTestModel.findSmeTestById(testId);
    if (!test) throw { status: 404, message: 'Test not found' };
    if (test.status === 'published') {
      throw { status: 400, message: 'Cannot modify a published test' };
    }

    // Normalize to array
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [req.body];

    // ── Pre-validate section limits before any insert ──────────
    await validateSectionLimits(testId, test, questions);

    // ── Transaction ────────────────────────────────────────────
    await connection.beginTransaction();

    const bulkParams = questions.map((q) => ({
      test_id: testId,
      section_id: q.section_id,
      source: q.source || test.question_source || 'manual',
      teacher_user_id: req.user.id,
      question_id: q.question_id, // QB only
      subject_id: q.subject_id,
      module_id: q.module_id,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      marks: q.marks,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      options: q.options,
      marks_correct: q.marks_correct,
      marks_incorrect: q.marks_incorrect,
      paper_number: q.paper_number,
    }));

    const { inserted, skipped, question_ids } = await createAndAttachBulk(connection, bulkParams);

    const [rows] = await connection.query(
      'SELECT COUNT(*) total FROM questions WHERE question_id IN (?)',
      [question_ids]
    );
    console.log(rows);
    await connection.commit();
    const [after] = await connection.query(
      'SELECT COUNT(*) total FROM questions WHERE question_id IN (?)',
      [question_ids]
    );
    console.log(after);
    // ── Completion check AFTER all inserts ────────────────────
    const assignmentStatus = await checkAndCompleteAssignment(testId);

    return sendSuccess(res, 201, 'Questions processed successfully', {
      inserted,
      skipped,
      question_ids,
      assignment: assignmentStatus,
    });
  } catch (err) {
    await connection.rollback();
    return sendError(res, err.status || 500, err.message);
  } finally {
    connection.release();
  }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/teacher/sme-tests/:id/questions/:qid
// ──────────────────────────────────────────────────────────────
export const removeQuestionWithCompletion = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    await assertTeacherAssigned(testId, req.user.id);
    await assertParentNotPublished(testId);

    const result = await smeTestService.removeQuestion(req.params.id, req.params.qid, req.user.id);

    // State machine: may revert to in_progress if threshold broken
    const assignmentStatus = await checkAndCompleteAssignment(testId);

    sendSuccess(res, 200, result.message, {
      ...result,
      assignment: assignmentStatus,
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// PATCH /api/teacher/sme-tests/:id/questions/:qid
// Edit question metadata. Blocked on published tests.
// ──────────────────────────────────────────────────────────────
export const editQuestion = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const qid = parseInt(req.params.qid);
    if (isNaN(testId) || isNaN(qid)) {
      throw { status: 400, message: 'Invalid test or question ID' };
    }

    await assertTeacherAssigned(testId, req.user.id);
    await assertParentNotPublished(testId);

    const test = await SmeTestModel.findSmeTestById(testId);
    if (!test) throw { status: 404, message: 'Test not found' };
    if (test.status === 'published') {
      throw { status: 400, message: 'Cannot edit questions on a published test' };
    }

    // Confirm question belongs to this test
    const [[tqRow]] = await pool.query(
      `SELECT tq.question_id, q.is_manual
       FROM test_questions tq
       JOIN questions q ON q.question_id = tq.question_id
       WHERE tq.test_id = ? AND tq.question_id = ?`,
      [testId, qid]
    );
    if (!tqRow) throw { status: 404, message: 'Question not found in this test' };

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await SmeTestModel.updateQuestionAndOptions(connection, qid, {
        question_text: req.body.question_text,
        difficulty: req.body.difficulty,
        correct_answer: req.body.correct_answer,
        options: req.body.options,
      });

      await SmeTestModel.updateTestQuestionMeta(connection, testId, qid, {
        marks_correct: req.body.marks_correct,
        marks_incorrect: req.body.marks_incorrect,
      });

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const [[updated]] = await pool.query(
      `SELECT q.question_id, q.question_text, q.difficulty, q.question_type,
         q.correct_answer, q.explanation,
         tq.marks_correct, tq.marks_incorrect, tq.section_id,
         GROUP_CONCAT(
           JSON_OBJECT(
             'option_id',    qo.option_id,
             'option_text',  qo.option_text,
             'is_correct',   qo.is_correct
           ) ORDER BY qo.option_id
         ) AS options
       FROM questions q
       JOIN test_questions tq ON tq.question_id = q.question_id AND tq.test_id = ?
       LEFT JOIN question_options qo ON qo.question_id = q.question_id
       WHERE q.question_id = ?
       GROUP BY q.question_id`,
      [testId, qid]
    );

    sendSuccess(res, 200, 'Question updated successfully', {
      ...updated,
      options: updated?.options ? JSON.parse(`[${updated.options}]`) : [],
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/teacher/sme-tests/:id/completion-status
// ──────────────────────────────────────────────────────────────
export const getCompletionStatus = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    await assertTeacherAssigned(testId, req.user.id);
    const result = await checkAndCompleteAssignment(testId);
    sendSuccess(res, 200, 'Completion status fetched', result);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// INTERNAL GUARDS
// ──────────────────────────────────────────────────────────────

/**
 * Ensures the requesting teacher has an assignment row for this test_id.
 * Also allows teacher who directly created the test (non-course flow).
 * Throws 403 if not assigned.
 */
const assertTeacherAssigned = async (testId, teacherUserId) => {
  const [[assignmentRow]] = await pool.query(
    `SELECT ta.assignment_id
     FROM test_assignments ta
     JOIN teachers tr ON tr.teacher_id = ta.teacher_id
     WHERE ta.test_id = ? AND tr.user_id = ?
     LIMIT 1`,
    [parseInt(testId), parseInt(teacherUserId)]
  );
  if (assignmentRow) return;

  // Fallback: teacher created the test directly (subject-level flow)
  const [[testRow]] = await pool.query(
    `SELECT test_id FROM tests WHERE test_id = ? AND created_by = ?`,
    [parseInt(testId), parseInt(teacherUserId)]
  );
  if (!testRow) {
    throw { status: 403, message: 'You are not assigned to this test' };
  }
};

/**
 * If this child test belongs to a parent that is already published,
 * block any modification. Throws 400 if locked.
 */
const assertParentNotPublished = async (childTestId) => {
  const [[row]] = await pool.query(
    `SELECT t.status AS parent_status
     FROM tests child
     JOIN tests t ON t.test_id = child.parent_test_id
     WHERE child.test_id = ?`,
    [parseInt(childTestId)]
  );
  if (row && row.parent_status === 'published') {
    throw { status: 400, message: 'Parent test is published. Modifications are locked.' };
  }
};

/**
 * Validates that incoming questions do not exceed section capacities.
 * @param {number} testId
 * @param {object} test           - full test object from findSmeTestById
 * @param {object[]} questions    - incoming question payload array
 */
const validateSectionLimits = async (testId, test, questions) => {
  const existingCounts = await SmeTestModel.getSectionQuestionCounts(testId);

  // Count incoming per section
  const incoming = {};
  for (const q of questions) {
    if (!q.section_id) continue;
    incoming[q.section_id] = (incoming[q.section_id] || 0) + 1;
  }

  for (const section of test.sections || []) {
    const existing = existingCounts[section.section_id] || 0;
    const added = incoming[section.section_id] || 0;
    if (existing + added > section.num_questions) {
      throw {
        status: 400,
        message:
          `Section "${section.section_name}" limit exceeded. ` +
          `Allowed: ${section.num_questions}, Existing: ${existing}, Incoming: ${added}`,
      };
    }
  }
};
