/**
 * ============================================================
 * SME Test Orchestrator Service
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * Orchestrates admin-level course SME test creation, teacher
 * assignment listing, and publish validation.
 * Reuses existing smeTest.service and model as black-box utilities.
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import { countIncompleteAssignments } from './assignment.service.js';

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

/**
 * Fetch a course with its category (exam) info
 */
const findCourseById = async (courseId) => {
  const [[row]] = await pool.query(
    `SELECT c.course_id, c.course_name, c.category_id,
       cat.exam_code, cat.category_name AS exam_name,
       cat.category_id AS exam_id,
       cat.total_questions, cat.duration_mins
     FROM courses c
     JOIN categories cat ON cat.category_id = c.category_id
     WHERE c.course_id = ?`,
    [parseInt(courseId)]
  );
  return row || null;
};

/**
 * Fetch all active subjects for a course, each joined with teacher info
 */
const getCourseSubjects = async (courseId) => {
  const [rows] = await pool.query(
    `SELECT cs.subject_id, cs.subject_name, cs.display_order,
       cs.teacher_id, t.user_id AS teacher_user_id,
       u.first_name, u.last_name
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN users u ON u.user_id = t.user_id
     WHERE cs.course_id = ? AND cs.is_active = 1
     ORDER BY cs.display_order ASC`,
    [parseInt(courseId)]
  );
  return rows;
};

// ──────────────────────────────────────────────────────────────
// ADMIN — CREATE COURSE SME TEST
// ──────────────────────────────────────────────────────────────

/**
 * Creates a parent "course-level" SME test plus one child test per subject.
 * Each child is immediately assigned to the subject's teacher.
 *
 * @param {number} adminUserId
 * @param {{ course_id, scheduled_start, scheduled_end, question_source? }} payload
 */
export const createCourseSmeTest = async (adminUserId, payload) => {
  const { course_id, scheduled_start, scheduled_end, question_source = 'manual' } = payload;

  if (!course_id) throw { status: 400, message: 'course_id is required' };
  if (!scheduled_start) throw { status: 400, message: 'scheduled_start is required' };
  if (!scheduled_end) throw { status: 400, message: 'scheduled_end is required' };
  if (new Date(scheduled_start) >= new Date(scheduled_end)) {
    throw { status: 400, message: 'scheduled_end must be after scheduled_start' };
  }

  const course = await findCourseById(course_id);
  if (!course) throw { status: 404, message: 'Course not found' };

  const subjects = await getCourseSubjects(course_id);
  if (!subjects.length) {
    throw { status: 400, message: 'No active subjects found for this course' };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // ── 1. Create parent test (subject_id = NULL, parent_test_id = NULL) ──
    const parentTitle = `${course.exam_name} - ${course.course_name} - ${new Date().toISOString().split('T')[0]}`;

    const [parentResult] = await connection.query(
      `INSERT INTO tests
         (created_by, exam_id, subject_id, exam_type, test_type, status,
          question_source, title, parent_test_id, scheduled_start, scheduled_end,
          total_questions, total_marks, duration_minutes, negative_marking)
       VALUES (?, ?, NULL, ?, 'sme', 'draft', ?, ?, NULL, ?, ?, 0, 0, 0, 1)`,
      [
        toInt(adminUserId),
        toInt(course.exam_id),
        course.exam_code,
        question_source,
        parentTitle,
        scheduled_start,
        scheduled_end,
      ]
    );
    const parentTestId = parentResult.insertId;

    const childTests = [];

    // ── 2. For each subject: create child test + assignment ──
    for (const subject of subjects) {
      // Use existing model function to get sections
      const sections = await SmeTestModel.getSubjectSections(course.exam_id, subject.subject_id);

      const totalQuestions = sections.reduce((s, sec) => s + toInt(sec.num_questions), 0);
      const totalMarks = sections.reduce(
        (s, sec) => s + toInt(sec.marks_correct) * toInt(sec.num_questions),
        0
      );
      const paperNumber = sections[0]?.paper_number || 1;
      const duration =
        course.total_questions && course.duration_mins
          ? Math.max(1, Math.round((totalQuestions / toInt(course.total_questions)) * toInt(course.duration_mins)))
          : 60;

      // Reuse the model-level createSmeTest
      const childTestId = await SmeTestModel.createSmeTest(connection, {
        teacherUserId: subject.teacher_user_id,
        examId: course.exam_id,
        examCode: course.exam_code,
        examName: course.exam_name,
        subjectName: subject.subject_name,
        subjectId: subject.subject_id,
        questionSource: question_source,
        scheduledStart: scheduled_start,
        scheduledEnd: scheduled_end,
        totalQuestions,
        totalMarks,
        duration,
        paperNumber,
      });

      // Set parent_test_id on the child test
      await connection.query(
        `UPDATE tests SET parent_test_id = ? WHERE test_id = ?`,
        [parentTestId, childTestId]
      );

      // Insert test_assignment record
      await connection.query(
        `INSERT INTO test_assignments
           (parent_test_id, test_id, subject_id, teacher_id, status, question_count)
         VALUES (?, ?, ?, ?, 'pending', 0)`,
        [parentTestId, childTestId, toInt(subject.subject_id), toInt(subject.teacher_id)]
      );

      childTests.push({
        test_id: childTestId,
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        teacher_id: subject.teacher_id,
        teacher_name: `${subject.first_name} ${subject.last_name}`,
      });
    }

    await connection.commit();

    return {
      parent_test_id: parentTestId,
      course_id: toInt(course_id),
      course_name: course.course_name,
      exam_code: course.exam_code,
      scheduled_start,
      scheduled_end,
      child_tests: childTests,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ──────────────────────────────────────────────────────────────
// ADMIN — PUBLISH COURSE SME TEST
// ──────────────────────────────────────────────────────────────

/**
 * Publish a parent course SME test.
 * Blocked if any child assignment is not completed.
 *
 * @param {number} parentTestId
 */
export const publishCourseSmeTest = async (parentTestId) => {
  const id = parseInt(parentTestId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  // Verify parent test exists and is an SME test
  const [[parentTest]] = await pool.query(
    `SELECT * FROM tests WHERE test_id = ? AND test_type = 'sme' AND parent_test_id IS NULL`,
    [id]
  );
  if (!parentTest) throw { status: 404, message: 'Course SME test not found' };
  if (parentTest.status === 'published') {
    throw { status: 400, message: 'Test is already published' };
  }

  // Guard: all assignments must be completed
  const incompleteCount = await countIncompleteAssignments(id);
  if (incompleteCount > 0) {
    throw {
      status: 400,
      message: `All subjects are not completed. ${incompleteCount} assignment(s) still pending.`,
    };
  }

  // Publish parent test
  await pool.query(
    `UPDATE tests SET status = 'published' WHERE test_id = ?`,
    [id]
  );

  // Publish all child tests
  await pool.query(
    `UPDATE tests SET status = 'published'
     WHERE parent_test_id = ? AND test_type = 'sme'`,
    [id]
  );

  const [[updatedTest]] = await pool.query(
    `SELECT t.*, cat.category_name AS exam_name, cat.exam_code
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.test_id = ?`,
    [id]
  );

  return updatedTest;
};

// ──────────────────────────────────────────────────────────────
// TEACHER — ASSIGNED TEST LISTING
// ──────────────────────────────────────────────────────────────

/**
 * Fetch all course SME tests assigned to a teacher, with progress.
 *
 * @param {number} teacherUserId
 */
export const getTeacherAssignedSmeTests = async (teacherUserId) => {
  const uid = parseInt(teacherUserId);
  if (isNaN(uid)) throw { status: 400, message: 'Invalid user ID' };

  const [rows] = await pool.query(
    `SELECT
       ta.assignment_id,
       ta.parent_test_id,
       ta.test_id,
       ta.status           AS assignment_status,
       ta.question_count,
       cs.subject_id,
       cs.subject_name,
       t.title             AS test_title,
       t.status            AS test_status,
       t.scheduled_start,
       t.scheduled_end,
       t.total_questions,
       pt.title            AS parent_test_title,
       c.course_id,
       c.course_name,
       cat.exam_code,
       cat.category_name   AS exam_name
     FROM test_assignments ta
     JOIN teachers tr ON tr.teacher_id = ta.teacher_id
     JOIN tests t ON t.test_id = ta.test_id
     JOIN tests pt ON pt.test_id = ta.parent_test_id
     JOIN course_subjects cs ON cs.subject_id = ta.subject_id
     JOIN courses c ON c.course_id = cs.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     WHERE tr.user_id = ?
     ORDER BY ta.assignment_id DESC`,
    [uid]
  );

  return rows;
};

// ──────────────────────────────────────────────────────────────
// STUDENT — FULL (PARENT) SME TESTS
// ──────────────────────────────────────────────────────────────

/**
 * Fetch all published parent SME tests with computed timing status.
 */
export const getFullSmeTests = async () => {
  const [rows] = await pool.query(
    `SELECT t.*,
       cat.category_name AS exam_name,
       cat.exam_code,
       c.course_name,
       c.course_id
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     LEFT JOIN courses c ON c.course_id = (
       SELECT cs.course_id FROM course_subjects cs
       WHERE cs.subject_id = t.subject_id LIMIT 1
     )
     WHERE t.test_type = 'sme'
       AND t.parent_test_id IS NULL
       AND t.status = 'published'
     ORDER BY t.scheduled_start ASC`
  );

  const now = new Date();

  return rows.map((test) => {
    const start = new Date(test.scheduled_start);
    const end = new Date(test.scheduled_end);
    let timing_status;

    if (now < start) timing_status = 'upcoming';
    else if (now > end) timing_status = 'expired';
    else timing_status = 'active';

    return { ...test, timing_status };
  });
};

// ──────────────────────────────────────────────────────────────
// STUDENT — TEST PATTERN
// ──────────────────────────────────────────────────────────────

/**
 * Return section/pattern info for a given test
 *
 * @param {number} testId
 */
export const getTestPattern = async (testId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const [[test]] = await pool.query(
    `SELECT test_id, exam_id, subject_id, title, total_questions, total_marks, duration_minutes
     FROM tests WHERE test_id = ? AND test_type = 'sme'`,
    [id]
  );
  if (!test) throw { status: 404, message: 'Test not found' };

  const [sections] = await pool.query(
    `SELECT section_id, section_name, subject_name, num_questions,
       marks_correct, marks_incorrect, question_type, paper_number, sort_order
     FROM exam_sections
     WHERE category_id = ?
     ORDER BY sort_order ASC`,
    [toInt(test.exam_id)]
  );

  return {
    test_id: test.test_id,
    title: test.title,
    total_questions: test.total_questions,
    total_marks: test.total_marks,
    duration_minutes: test.duration_minutes,
    sections,
  };
};