/**
 * ============================================================
 * Assignment Service
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * Handles test_assignments CRUD, completion tracking, and
 * section-validation triggers after question additions.
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';

// ──────────────────────────────────────────────────────────────
// QUERY HELPERS
// ──────────────────────────────────────────────────────────────

/**
 * Fetch a single assignment row
 */
export const findAssignment = async (parentTestId, subjectId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_assignments
     WHERE parent_test_id = ? AND subject_id = ?`,
    [parseInt(parentTestId), parseInt(subjectId)]
  );
  return row || null;
};

/**
 * Fetch all assignments for a parent test
 */
export const getAssignmentsForParent = async (parentTestId) => {
  const [rows] = await pool.query(
    `SELECT ta.*,
       cs.subject_name,
       t.status    AS test_status,
       t.title     AS test_title,
       t.test_id
     FROM test_assignments ta
     JOIN course_subjects cs ON cs.subject_id = ta.subject_id
     JOIN tests t ON t.test_id = ta.test_id
     WHERE ta.parent_test_id = ?
     ORDER BY cs.display_order ASC`,
    [parseInt(parentTestId)]
  );
  return rows;
};

/**
 * Count incomplete assignments for a parent test
 * (used by publish guard)
 */
export const countIncompleteAssignments = async (parentTestId) => {
  const [[{ cnt }]] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM test_assignments
     WHERE parent_test_id = ? AND status != 'completed'`,
    [parseInt(parentTestId)]
  );
  return Number(cnt);
};

/**
 * Mark an assignment as in_progress (called after first question add)
 */
export const markAssignmentInProgress = async (connection, parentTestId, subjectId) => {
  await connection.query(
    `UPDATE test_assignments
     SET status = 'in_progress'
     WHERE parent_test_id = ? AND subject_id = ? AND status = 'pending'`,
    [parseInt(parentTestId), parseInt(subjectId)]
  );
};

/**
 * Mark an assignment as completed and record question_count
 */
export const markAssignmentCompleted = async (connection, parentTestId, subjectId, questionCount) => {
  await connection.query(
    `UPDATE test_assignments
     SET status = 'completed',
         question_count = ?
     WHERE parent_test_id = ? AND subject_id = ?`,
    [parseInt(questionCount), parseInt(parentTestId), parseInt(subjectId)]
  );
};

// ──────────────────────────────────────────────────────────────
// CORE LOGIC
// ──────────────────────────────────────────────────────────────

/**
 * Check section completeness for a child test and, if all sections
 * are full, mark the corresponding assignment as completed.
 *
 * Called after every question-add / QB-select / document-parse.
 *
 * @param {number} childTestId   - The subject-level test id
 * @param {object} [conn]        - Optional existing DB connection (for transactions)
 * @returns {{ completed: boolean, remaining: number }}
 */
export const checkAndCompleteAssignment = async (childTestId, conn = null) => {
  const test = await SmeTestModel.findSmeTestById(childTestId);
  if (!test) throw { status: 404, message: 'Test not found' };

  // Only child tests (with parent_test_id) go through this flow
  if (!test.parent_test_id) {
    return { completed: false, remaining: 0 };
  }

  const sectionCounts = await SmeTestModel.getSectionQuestionCounts(childTestId);
  const sections = test.sections || [];

  let totalRemaining = 0;
  let incomplete = false;

  for (const s of sections) {
    const added = sectionCounts[s.section_id] || 0;
    const needed = Number(s.num_questions || 0);
    if (added < needed) {
      incomplete = true;
      totalRemaining += needed - added;
    }
  }

  if (incomplete) {
    // Transition pending → in_progress if any questions exist
    const totalAdded = await SmeTestModel.getTestQuestionCount(childTestId);
    if (totalAdded > 0) {
      const db = conn || pool;
      await db.query(
        `UPDATE test_assignments
         SET status = 'in_progress'
         WHERE test_id = ? AND status = 'pending'`,
        [parseInt(childTestId)]
      );
    }
    return { completed: false, remaining: totalRemaining };
  }

  // All sections complete — mark as completed
  const totalQuestions = await SmeTestModel.getTestQuestionCount(childTestId);
  const db = conn || pool;

  await db.query(
    `UPDATE test_assignments
     SET status = 'completed',
         question_count = ?
     WHERE test_id = ?`,
    [totalQuestions, parseInt(childTestId)]
  );

  console.log(
    `[Assignment] test_id=${childTestId} | parent=${test.parent_test_id} | subject=${test.subject_id} → COMPLETED (${totalQuestions} questions)`
  );

  return { completed: true, remaining: 0 };
};

/**
 * Build a structured response when parsed questions < required
 */
export const buildIncompleteParseResponse = (remaining) => ({
  status: 'incomplete',
  remaining,
  options: ['add manually', 'reupload document'],
});