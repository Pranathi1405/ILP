/**
 * ============================================================
 * Assignment Service
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * Description:
 * Manages test_assignments — tracks per-subject teacher progress,
 * auto-completes or reverts assignments when question counts change,
 * and exposes helpers for orchestrator and controllers.
 *
 * State Machine:
 *   pending → in_progress → completed
 *   completed → in_progress  (if questions removed below threshold)
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import logger from '../utils/logger.js';

// ──────────────────────────────────────────────────────────────
// QUERIES
// ──────────────────────────────────────────────────────────────

export const getAssignmentsForParent = async (parentTestId) => {
  const [rows] = await pool.query(
    `SELECT
       ta.assignment_id,
       ta.parent_test_id,
       ta.test_id,
       ta.subject_id,
       ta.teacher_id,
       ta.status           AS assignment_status,
       ta.question_count,
       cs.subject_name,
       t.status            AS test_status,
       t.title             AS test_title,
       t.scheduled_start,
       t.scheduled_end,
       u.first_name,
       u.last_name
     FROM test_assignments ta
     JOIN course_subjects cs  ON cs.subject_id  = ta.subject_id
     JOIN tests t             ON t.test_id       = ta.test_id
     JOIN teachers tr         ON tr.teacher_id   = ta.teacher_id
     JOIN users u             ON u.user_id        = tr.user_id
     WHERE ta.parent_test_id = ?
     ORDER BY cs.display_order ASC`,
    [parseInt(parentTestId)]
  );
  return rows;
};

/**
 * Count assignments that are NOT yet completed for a parent test.
 * Used as the publish guard.
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

// ──────────────────────────────────────────────────────────────
// COMPLETION TRIGGER — Full State Machine
// ──────────────────────────────────────────────────────────────

/**
 * After every question add/remove, call this to:
 *   1. Check if all sections of childTestId are full
 *   2. completed  → mark assignment completed + set question_count
 *   3. partial    → mark assignment in_progress
 *   4. empty      → revert to pending
 *
 * Handles backward transition: completed → in_progress when
 * a question is removed after the assignment was completed.
 *
 * @param {number} childTestId
 * @param {object} [connection=pool] - Optional connection for transactions
 * @returns {{ completed: boolean, remaining: number, sections: object[] }}
 */
export const checkAndCompleteAssignment = async (childTestId, connection = pool) => {
  const id = parseInt(childTestId);

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  // Non-course (subject-level) tests have no assignment row
  if (!test.parent_test_id) {
    return { completed: false, remaining: 0, sections: [] };
  }

  const sectionCounts = await SmeTestModel.getSectionQuestionCounts(id);
  const sections = Array.isArray(test.sections) ? test.sections : [];

  let totalRemaining = 0;

  const sectionSummary = sections.map((s) => {
    const added     = sectionCounts[s.section_id] || 0;
    const needed    = Number(s.num_questions || 0);
    const remaining = Math.max(0, needed - added);

    totalRemaining += remaining;

    return {
      section_id:   s.section_id,
      section_name: s.section_name,
      required:     needed,
      added,
      remaining,
      complete:     remaining === 0,
    };
  });

  const totalAdded = await SmeTestModel.getTestQuestionCount(id);

  // ── State transitions ─────────────────────────────────────────

  if (totalRemaining === 0 && sections.length > 0) {
    // ✅ ALL sections complete → completed
    await connection.query(
      `UPDATE test_assignments
       SET status = 'completed', question_count = ?
       WHERE test_id = ?`,
      [totalAdded, id]
    );

    logger.info(
      `[Assignment] COMPLETED test_id=${id} parent=${test.parent_test_id} ` +
      `subject=${test.subject_id} questions=${totalAdded}`
    );

    return { completed: true, remaining: 0, total_added: totalAdded, sections: sectionSummary };
  }

  if (totalAdded > 0) {
    // ⚠️  Partial progress → in_progress (also reverts from completed)
    await connection.query(
      `UPDATE test_assignments
       SET status = 'in_progress', question_count = ?
       WHERE test_id = ?`,
      [totalAdded, id]
    );

    logger.info(
      `[Assignment] IN_PROGRESS test_id=${id} parent=${test.parent_test_id} ` +
      `added=${totalAdded} remaining=${totalRemaining}`
    );
  } else {
    // ⬜  No questions yet → pending (initial state or after full removal)
    await connection.query(
      `UPDATE test_assignments
       SET status = 'pending', question_count = 0
       WHERE test_id = ?`,
      [id]
    );

    logger.info(
      `[Assignment] PENDING test_id=${id} parent=${test.parent_test_id} (no questions)`
    );
  }

  return {
    completed:   false,
    remaining:   totalRemaining,
    total_added: totalAdded,
    sections:    sectionSummary,
  };
};

// ──────────────────────────────────────────────────────────────
// DOCUMENT TRACKING
// ──────────────────────────────────────────────────────────────

/**
 * Upserts a document tracking row for an assignment.
 * Called each time a document is parsed for an assignment.
 *
 * @param {number} assignmentId
 * @param {number} parsedCount   - Questions successfully parsed this round
 * @param {number} requiredCount - Total needed for this assignment
 * @param {string} status        - 'incomplete' | 'complete'
 */
export const upsertDocumentRecord = async (assignmentId, parsedCount, requiredCount, status) => {
  await pool.query(
    `INSERT INTO sme_test_documents
       (assignment_id, parsed_count, required_count, status, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       parsed_count   = parsed_count + VALUES(parsed_count),
       required_count = VALUES(required_count),
       status         = VALUES(status),
       updated_at     = CURRENT_TIMESTAMP`,
    [toInt(assignmentId), toInt(parsedCount), toInt(requiredCount), status]
  );
};

/**
 * Get the document record for an assignment.
 */
export const getDocumentRecord = async (assignmentId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM sme_test_documents WHERE assignment_id = ?`,
    [toInt(assignmentId)]
  );
  return row || null;
};

// ──────────────────────────────────────────────────────────────
// RESPONSE HELPERS
// ──────────────────────────────────────────────────────────────

/**
 * Standard response when parsed questions are fewer than required.
 */
export const buildIncompleteParseResponse = (remaining) => ({
  status:    'incomplete',
  remaining,
  options:   ['add manually', 'reupload document'],
});

const toInt = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };