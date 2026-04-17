/**
 * ============================================================
 * SME Test Orchestrator Service
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * Description:
 * Orchestrates admin-level course SME test creation, teacher
 * assignment listing, and publish validation.
 *
 * Flow:
 *   Admin → createCourseSmeTest()
 *     ├─ Creates ONE parent test (subject_id=NULL, parent_test_id=NULL)
 *     ├─ For every course subject:
 *     │     • createSmeTest() → child test (subject_id=X, parent_test_id=parentId)
 *     │     • INSERT test_assignments row (teacher_id, status='pending')
 *     └─ Returns summary
 *
 *   Teacher → addQuestion() in smeTest.service
 *             After each add → checkAndCompleteAssignment() called by controller
 *
 *   Admin → publishCourseSmeTest()
 *     └─ Guards: all assignments must be 'completed'
 *        → publishes parent + all children
 *
 *   Student → getTestQuestions() — parent test aggregates all child questions
 *
 * Reuses smeTest.model (createSmeTest, getSubjectSections) as black-box.
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import { countIncompleteAssignments, getAssignmentsForParent } from './assignment.service.js';

const toInt = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ──────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ──────────────────────────────────────────────────────────────

const findCourseById = async (courseId) => {
  const [[row]] = await pool.query(
    `SELECT c.course_id, c.course_name, c.category_id,
       cat.exam_code,
       cat.category_name  AS exam_name,
       cat.category_id    AS exam_id,
       cat.total_questions,
       cat.duration_mins
     FROM courses c
     JOIN categories cat ON cat.category_id = c.category_id
     WHERE c.course_id = ?`,
    [parseInt(courseId)]
  );
  return row || null;
};

const getCourseSubjectsWithTeachers = async (courseId) => {
  const [rows] = await pool.query(
    `SELECT
       cs.subject_id, cs.subject_name, cs.display_order, cs.teacher_id,
       t.user_id  AS teacher_user_id,
       u.first_name, u.last_name
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN users u    ON u.user_id    = t.user_id
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
 * Creates a parent test + one child test per course subject,
 * and assigns each child to its subject's teacher.
 *
 * @param {number} adminUserId
 * @param {{ course_id, scheduled_start, scheduled_end, question_source? }} payload
 */
export const createCourseSmeTest = async (adminUserId, payload) => {
  const {
    course_id,
    scheduled_start,
    scheduled_end,
    question_source = 'manual',
  } = payload;

  if (!course_id)        throw { status: 400, message: 'course_id is required' };
  if (!scheduled_start)  throw { status: 400, message: 'scheduled_start is required' };
  if (!scheduled_end)    throw { status: 400, message: 'scheduled_end is required' };
  if (new Date(scheduled_start) >= new Date(scheduled_end)) {
    throw { status: 400, message: 'scheduled_end must be after scheduled_start' };
  }

  const course = await findCourseById(course_id);
  if (!course) throw { status: 404, message: 'Course not found' };

  const subjects = await getCourseSubjectsWithTeachers(course_id);
  if (!subjects.length) {
    throw { status: 400, message: 'No active subjects found for this course' };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // ── 1. Parent test ─────────────────────────────────────────
    const parentTitle = `${course.exam_name} - ${course.course_name} - ${new Date().toISOString().split('T')[0]}`;

    const [parentResult] = await connection.query(
      `INSERT INTO tests
         (created_by, exam_id, subject_id, exam_type, test_type, status,
          question_source, title, parent_test_id,
          scheduled_start, scheduled_end,
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

    // ── 2. Child test + assignment per subject ─────────────────
    for (const subject of subjects) {
      const sections = await SmeTestModel.getSubjectSections(course.exam_id, subject.subject_id);

      let effectiveSections = sections;
      if (!sections.length) {
        effectiveSections = [{
          section_id:      null,
          section_name:    'General',
          num_questions:   50,
          marks_correct:   4,
          marks_incorrect: 1,
          paper_number:    1,
        }];
      }

      const totalQuestions = effectiveSections.reduce((s, sec) => s + toInt(sec.num_questions), 0);
      const totalMarks     = effectiveSections.reduce(
        (s, sec) => s + toInt(sec.marks_correct) * toInt(sec.num_questions),
        0
      );
      const paperNumber = effectiveSections[0]?.paper_number || 1;

      const duration =
        toInt(course.total_questions) > 0 && toInt(course.duration_mins) > 0
          ? Math.max(1, Math.round((totalQuestions / toInt(course.total_questions)) * toInt(course.duration_mins)))
          : 60;

      const childTestId = await SmeTestModel.createSmeTest(connection, {
        teacherUserId:  subject.teacher_user_id,
        examId:         course.exam_id,
        examCode:       course.exam_code,
        examName:       course.exam_name,
        subjectName:    subject.subject_name,
        subjectId:      subject.subject_id,
        questionSource: question_source,
        scheduledStart: scheduled_start,
        scheduledEnd:   scheduled_end,
        totalQuestions,
        totalMarks,
        duration,
        paperNumber,
      });

      await connection.query(
        `UPDATE tests SET parent_test_id = ? WHERE test_id = ?`,
        [parentTestId, childTestId]
      );

      await connection.query(
        `INSERT INTO test_assignments
           (parent_test_id, test_id, subject_id, teacher_id, status, question_count)
         VALUES (?, ?, ?, ?, 'pending', 0)`,
        [parentTestId, childTestId, toInt(subject.subject_id), toInt(subject.teacher_id)]
      );

      childTests.push({
        test_id:         childTestId,
        subject_id:      subject.subject_id,
        subject_name:    subject.subject_name,
        teacher_id:      subject.teacher_id,
        teacher_name:    `${subject.first_name} ${subject.last_name}`,
        total_questions: totalQuestions,
        sections_count:  effectiveSections.length,
      });
    }

    // ── 3. Roll up totals into parent test ────────────────────
    // Parent starts with 0s; now aggregate across all children.
    const [[parentTotals]] = await connection.query(
      `SELECT
         SUM(total_questions) AS total_questions,
         SUM(total_marks)     AS total_marks,
         MAX(duration_minutes) AS duration_minutes
       FROM tests
       WHERE parent_test_id = ? AND test_type = 'sme'`,
      [parentTestId]
    );

    await connection.query(
      `UPDATE tests
       SET total_questions  = ?,
           total_marks      = ?,
           duration_minutes = ?
       WHERE test_id = ?`,
      [
        toInt(parentTotals.total_questions),
        toInt(parentTotals.total_marks),
        toInt(parentTotals.duration_minutes),
        parentTestId,
      ]
    );

    await connection.commit();

    return {
      parent_test_id:  parentTestId,
      course_id:       toInt(course_id),
      course_name:     course.course_name,
      exam_code:       course.exam_code,
      scheduled_start,
      scheduled_end,
      total_questions: toInt(parentTotals.total_questions),
      total_marks:     toInt(parentTotals.total_marks),
      duration_minutes: toInt(parentTotals.duration_minutes),
      child_tests:     childTests,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ──────────────────────────────────────────────────────────────
// ADMIN — LIST ALL COURSE-LEVEL SME TESTS
// ──────────────────────────────────────────────────────────────

export const getAllCourseSmeTests = async ({ page = 1, limit = 10 } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tests
     WHERE test_type = 'sme' AND parent_test_id IS NULL`
  );

  const [rows] = await pool.query(
    `SELECT
       t.test_id, t.title, t.status, t.scheduled_start, t.scheduled_end,
       t.created_at,
       cat.exam_code, cat.category_name AS exam_name,
       c.course_id, c.course_name,
       (SELECT COUNT(*) FROM test_assignments ta WHERE ta.parent_test_id = t.test_id)               AS total_subjects,
       (SELECT COUNT(*) FROM test_assignments ta WHERE ta.parent_test_id = t.test_id AND ta.status = 'completed') AS completed_subjects,
       (SELECT COUNT(*) FROM test_assignments ta WHERE ta.parent_test_id = t.test_id AND ta.status = 'pending')   AS pending_subjects
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     LEFT JOIN courses c ON c.course_id = (
       SELECT cs.course_id FROM course_subjects cs
       INNER JOIN test_assignments ta2 ON ta2.subject_id = cs.subject_id
       WHERE ta2.parent_test_id = t.test_id
       LIMIT 1
     )
     WHERE t.test_type = 'sme' AND t.parent_test_id IS NULL
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [parseInt(limit), offset]
  );

  return {
    data: rows,
    pagination: {
      total:      Number(total),
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(Number(total) / parseInt(limit)),
    },
  };
};

// ──────────────────────────────────────────────────────────────
// ADMIN — PUBLISH COURSE SME TEST
// ──────────────────────────────────────────────────────────────

/**
 * Publish a parent course SME test.
 * Blocked if ANY child assignment is not 'completed'.
 */
export const publishCourseSmeTest = async (parentTestId) => {
  const id = parseInt(parentTestId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const [[parentTest]] = await pool.query(
    `SELECT * FROM tests WHERE test_id = ? AND test_type = 'sme' AND parent_test_id IS NULL`,
    [id]
  );
  if (!parentTest) throw { status: 404, message: 'Course SME test not found' };
  if (parentTest.status === 'published') {
    throw { status: 400, message: 'Test is already published' };
  }

  const incompleteCount = await countIncompleteAssignments(id);
  if (incompleteCount > 0) {
    const assignments = await getAssignmentsForParent(id);
    const pending = assignments
      .filter(a => a.assignment_status !== 'completed')
      .map(a => `${a.subject_name} (${a.assignment_status})`);
    throw {
      status: 400,
      message: `Cannot publish. ${incompleteCount} subject assignment(s) are not yet completed.`,
      details: { pending_subjects: pending },
    };
  }

  await pool.query(
    `UPDATE tests SET status = 'published'
     WHERE test_id = ? OR (parent_test_id = ? AND test_type = 'sme')`,
    [id, id]
  );

  const [[updated]] = await pool.query(
    `SELECT t.*, cat.category_name AS exam_name, cat.exam_code
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.test_id = ?`,
    [id]
  );
  return updated;
};

// ──────────────────────────────────────────────────────────────
// TEACHER — ASSIGNED TESTS WITH SECTION PROGRESS
// ──────────────────────────────────────────────────────────────

/**
 * Fetch all course-SME assignments for a teacher, each enriched with
 * section-level completion info so the UI can show a progress checklist.
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
       t.question_source,
       pt.title            AS parent_test_title,
       c.course_id,
       c.course_name,
       cat.exam_code,
       cat.category_name   AS exam_name
     FROM test_assignments ta
     JOIN teachers tr       ON tr.teacher_id  = ta.teacher_id
     JOIN tests t           ON t.test_id       = ta.test_id
     JOIN tests pt          ON pt.test_id      = ta.parent_test_id
     JOIN course_subjects cs ON cs.subject_id  = ta.subject_id
     JOIN courses c          ON c.course_id    = cs.course_id
     JOIN categories cat     ON cat.category_id = c.category_id
     WHERE tr.user_id = ?
     ORDER BY ta.assignment_id DESC`,
    [uid]
  );

  // Enrich each assignment with per-section progress
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const test = await SmeTestModel.findSmeTestById(row.test_id);
      if (!test || !test.sections?.length) {
        return { ...row, sections: [], total_required: 0, total_added: 0, remaining: 0 };
      }

      const sectionCounts = await SmeTestModel.getSectionQuestionCounts(row.test_id);
      let totalRequired = 0;
      let totalAdded    = 0;

      const sections = test.sections.map((s) => {
        const added     = sectionCounts[s.section_id] || 0;
        const required  = Number(s.num_questions || 0);
        const remaining = Math.max(0, required - added);
        totalRequired  += required;
        totalAdded     += added;
        return {
          section_id:   s.section_id,
          section_name: s.section_name,
          question_type: s.question_type,
          required,
          added,
          remaining,
          complete:     remaining === 0,
        };
      });

      return {
        ...row,
        sections,
        total_required: totalRequired,
        total_added:    totalAdded,
        remaining:      Math.max(0, totalRequired - totalAdded),
      };
    })
  );

  return enriched;
};

// ──────────────────────────────────────────────────────────────
// STUDENT — FULL (PARENT) PUBLISHED SME TESTS
// ──────────────────────────────────────────────────────────────

export const getFullSmeTests = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
       t.test_id, t.title, t.status,
       t.scheduled_start, t.scheduled_end,
       t.total_questions, t.total_marks, t.duration_minutes,
       cat.exam_code, cat.category_name AS exam_name,
       c.course_id, c.course_name,
       ta.status AS attempt_status,
       ta.attempt_id
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     LEFT JOIN courses c ON c.course_id = (
       SELECT cs.course_id FROM course_subjects cs
       INNER JOIN test_assignments asn ON asn.subject_id = cs.subject_id
       WHERE asn.parent_test_id = t.test_id LIMIT 1
     )
     LEFT JOIN test_attempts ta ON ta.test_id = t.test_id AND ta.user_id = ?
     WHERE t.test_type = 'sme'
       AND t.parent_test_id IS NULL
       AND t.status = 'published'
     ORDER BY t.scheduled_start ASC`,
    [toInt(userId)]
  );

  const now = new Date();
  return rows.map((test) => {
    const start = new Date(test.scheduled_start);
    const end   = new Date(test.scheduled_end);
    return {
      ...test,
      timing_status: now < start ? 'upcoming' : now > end ? 'expired' : 'active',
    };
  });
};

// ──────────────────────────────────────────────────────────────
// STUDENT — TEST PATTERN
// ──────────────────────────────────────────────────────────────

export const getTestPattern = async (testId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const [[test]] = await pool.query(
    `SELECT test_id, exam_id, subject_id, title, total_questions, total_marks, duration_minutes
     FROM tests WHERE test_id = ? AND test_type = 'sme'`,
    [id]
  );
  if (!test) throw { status: 404, message: 'Test not found' };

  const isParent = test.subject_id === null || test.subject_id === undefined;

  let sections;

  if (isParent) {
    // Parent test → return ALL sections for the exam (no subject filter)
    // Aggregate totals live from children instead of trusting the stale parent row
    const [[liveTotals]] = await pool.query(
      `SELECT
         SUM(total_questions) AS total_questions,
         SUM(total_marks)     AS total_marks,
         MAX(duration_minutes) AS duration_minutes
       FROM tests
       WHERE parent_test_id = ? AND test_type = 'sme' AND is_deleted = 0`,
      [id]
    );

    if (liveTotals.total_questions) {
      test.total_questions  = Number(liveTotals.total_questions);
      test.total_marks      = Number(liveTotals.total_marks);
      test.duration_minutes = Number(liveTotals.duration_minutes);
    }

    const [rows] = await pool.query(
      `SELECT section_id, section_name, subject_name, num_questions,
         marks_correct, marks_incorrect, question_type, paper_number, sort_order
       FROM exam_sections
       WHERE category_id = ?
       ORDER BY paper_number ASC, sort_order ASC`,
      [toInt(test.exam_id)]
    );
    sections = rows;
  } else {
    // Child / standalone test → filter by subject
    const [rows] = await pool.query(
      `SELECT section_id, section_name, subject_name, num_questions,
         marks_correct, marks_incorrect, question_type, paper_number, sort_order
       FROM exam_sections
       WHERE category_id = ? AND subject_id = ?
       ORDER BY sort_order ASC`,
      [toInt(test.exam_id), toInt(test.subject_id)]
    );
    sections = rows;
  }

  return {
    test_id:          test.test_id,
    title:            test.title,
    total_questions:  test.total_questions,
    total_marks:      test.total_marks,
    duration_minutes: test.duration_minutes,
    sections,
  };
};

// ──────────────────────────────────────────────────────────────
// STUDENT — AGGREGATE PARENT TEST QUESTIONS
// ──────────────────────────────────────────────────────────────

/**
 * For a PARENT test: dynamically fetches all questions from child tests.
 * Does NOT copy data — always reads live from child test_questions.
 *
 * For a CHILD test: delegates to existing findSmeTestById (black-box).
 *
 * @param {number} testId
 * @returns {object} Test with merged questions array
 */
export const getTestWithQuestions = async (testId) => {
  const id = parseInt(testId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

  const test = await SmeTestModel.findSmeTestById(id);
  if (!test) throw { status: 404, message: 'Test not found' };

  // Child test or standalone → return as-is (findSmeTestById already includes questions)
  if (test.parent_test_id !== null) {
    return test;
  }

  // Parent test → aggregate questions from all child tests
  const [childTests] = await pool.query(
    `SELECT test_id FROM tests
     WHERE parent_test_id = ? AND test_type = 'sme' AND is_deleted = 0`,
    [id]
  );

  if (!childTests.length) {
    return { ...test, questions: [] };
  }

  const childIds = childTests.map(r => r.test_id);

  // Fetch all questions across children — preserving section/paper ordering
  const [questions] = await pool.query(
    `SELECT
       q.question_id, q.question_text, q.question_type, q.difficulty,
       q.correct_answer, q.explanation,
       tq.test_id AS child_test_id,
       tq.section_id, tq.marks_correct, tq.marks_incorrect,
       tq.paper_number, tq.sort_order, tq.source,
       es.section_name, es.subject_name,
       GROUP_CONCAT(
         JSON_OBJECT(
           'option_id',   qo.option_id,
           'option_text', qo.option_text,
           'is_correct',  qo.is_correct
         )
         ORDER BY qo.option_id
       ) AS options
     FROM test_questions tq
     JOIN questions q       ON q.question_id  = tq.question_id
     LEFT JOIN exam_sections es ON es.section_id = tq.section_id
     LEFT JOIN question_options qo ON qo.question_id = q.question_id
     WHERE tq.test_id IN (?)
     GROUP BY q.question_id, tq.test_id, tq.section_id, tq.marks_correct,
              tq.marks_incorrect, tq.paper_number, tq.sort_order, tq.source,
              es.section_name, es.subject_name
     ORDER BY tq.paper_number ASC, tq.section_id ASC, tq.sort_order ASC`,
    [childIds]
  );

  const formattedQuestions = questions.map((q) => ({
    ...q,
    options: q.options ? JSON.parse(`[${q.options}]`) : [],
    explanation: q.explanation
      ? (() => { try { return JSON.parse(q.explanation); } catch { return q.explanation; } })()
      : null,
  }));

  // Aggregate totals from children for the parent test header
  const [[totals]] = await pool.query(
    `SELECT SUM(total_questions) AS total_questions, SUM(total_marks) AS total_marks
     FROM tests WHERE test_id IN (?)`,
    [childIds]
  );

  return {
    ...test,
    total_questions: Number(totals.total_questions || 0),
    total_marks:     Number(totals.total_marks || 0),
    questions:       formattedQuestions,
    child_test_ids:  childIds,
  };
};