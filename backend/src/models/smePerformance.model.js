import pool from '../config/database.config.js';

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildStudentAttemptFilters = (filters = {}) => {
  const conditions = [
    "t.test_type = 'sme'",
    "ta.status = 'submitted'",
    's.student_id = ?',
  ];
  const params = [toInt(filters.studentId)];

  if (filters.subject && filters.subject !== 'all') {
    conditions.push('LOWER(cs.subject_name) = LOWER(?)');
    params.push(filters.subject);
  }

  if (filters.month) {
    conditions.push("DATE_FORMAT(ta.submitted_at, '%Y-%m') = ?");
    params.push(filters.month);
  }

  if (filters.startDate) {
    conditions.push('DATE(ta.submitted_at) >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('DATE(ta.submitted_at) <= ?');
    params.push(filters.endDate);
  }

  return { whereClause: conditions.join(' AND '), params };
};

const buildTeacherCourseFilter = (course) => {
  if (!course) {
    return { clause: '', params: [] };
  }

  return {
    clause: ' AND LOWER(cat.exam_code) = LOWER(?)',
    params: [course],
  };
};

export const getStudentIdByUserId = async (userId) => {
  const [[row]] = await pool.query(
    `SELECT student_id
     FROM students
     WHERE user_id = ?
     LIMIT 1`,
    [toInt(userId)]
  );

  return row?.student_id ?? null;
};

export const getTeacherIdByUserId = async (userId) => {
  const [[row]] = await pool.query(
    `SELECT teacher_id
     FROM teachers
     WHERE user_id = ?
     LIMIT 1`,
    [toInt(userId)]
  );

  return row?.teacher_id ?? null;
};

export const getParentIdByUserId = async (userId) => {
  const [[row]] = await pool.query(
    `SELECT parent_id
     FROM parents
     WHERE user_id = ?
     LIMIT 1`,
    [toInt(userId)]
  );

  return row?.parent_id ?? null;
};

export const getStudentProfile = async (studentId) => {
  const [[row]] = await pool.query(
    `SELECT s.student_id, s.user_id, u.first_name, u.last_name
     FROM students s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.student_id = ?
     LIMIT 1`,
    [toInt(studentId)]
  );

  return row || null;
};

export const getParentLinkedStudent = async (parentId, requestedStudentId = null) => {
  const params = [toInt(parentId)];
  let condition = '';

  if (requestedStudentId) {
    condition = ' AND psr.student_id = ?';
    params.push(toInt(requestedStudentId));
  }

  const [rows] = await pool.query(
    `SELECT psr.student_id, psr.is_primary, u.first_name, u.last_name
     FROM parent_student_relationship psr
     JOIN students s ON s.student_id = psr.student_id
     JOIN users u ON u.user_id = s.user_id
     WHERE psr.parent_id = ?${condition}
     ORDER BY psr.is_primary DESC, psr.student_id ASC`,
    params
  );

  return rows[0] || null;
};

export const isStudentMappedToTeacher = async (teacherUserId, studentId) => {
  const [[row]] = await pool.query(
    `SELECT 1
     FROM course_enrollments ce
     JOIN course_subjects cs ON cs.course_id = ce.course_id
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     WHERE t.user_id = ?
       AND ce.student_id = ?
       AND ce.status != 'dropped'
     LIMIT 1`,
    [toInt(teacherUserId), toInt(studentId)]
  );

  return Boolean(row);
};

export const getStudentStats = async (studentId) => {
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS totalTestsAttempted,
       ROUND(COALESCE(AVG(ta.accuracy_percent), 0), 2) AS accuracy
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     WHERE s.student_id = ?
       AND t.test_type = 'sme'
       AND ta.status = 'submitted'`,
    [toInt(studentId)]
  );

  return row || { totalTestsAttempted: 0, accuracy: 0 };
};

export const getStudentSubjectAverages = async (studentId) => {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(cs.subject_name, CONCAT('Subject ', t.subject_id)) AS subject,
       ROUND(COALESCE(AVG(ta.total_score), 0), 2) AS avgScore
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     LEFT JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE s.student_id = ?
       AND t.test_type = 'sme'
       AND ta.status = 'submitted'
     GROUP BY t.subject_id, cs.subject_name
     ORDER BY subject ASC`,
    [toInt(studentId)]
  );

  return rows;
};

export const getStudentSubjectTrend = async (studentId, subject) => {
  const [rows] = await pool.query(
    `SELECT
       t.title AS testName,
       ROUND(COALESCE(ta.total_score, 0), 2) AS score,
       DATE_FORMAT(ta.submitted_at, '%Y-%m-%d') AS date
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     LEFT JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE s.student_id = ?
       AND t.test_type = 'sme'
       AND ta.status = 'submitted'
       AND LOWER(cs.subject_name) = LOWER(?)
     ORDER BY ta.submitted_at DESC
     LIMIT 7`,
    [toInt(studentId), subject]
  );

  return rows;
};

export const countStudentTests = async (filters) => {
  const { whereClause, params } = buildStudentAttemptFilters(filters);
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     LEFT JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE ${whereClause}`,
    params
  );

  return Number(row?.total || 0);
};

export const getStudentTests = async (filters) => {
  const { whereClause, params } = buildStudentAttemptFilters(filters);
  const limit = toInt(filters.limit) || 10;
  const page = toInt(filters.page) || 1;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT
       t.test_id AS testId,
       t.title AS testName,
       'attempted' AS status,
       COALESCE(cs.subject_name, CONCAT('Subject ', t.subject_id)) AS subject,
       ROUND(COALESCE(ta.total_score, 0), 2) AS score,
       t.total_marks AS totalMarks,
       DATE_FORMAT(ta.submitted_at, '%Y-%m-%d') AS date
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     LEFT JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE ${whereClause}
     ORDER BY ta.submitted_at DESC, t.test_id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

export const getStudentLatestSubmittedAttemptForTest = async (studentId, testId) => {
  const [[row]] = await pool.query(
    `SELECT
       ta.attempt_id,
       ta.test_id,
       t.title AS testName,
       COALESCE(cs.subject_name, CONCAT('Subject ', t.subject_id)) AS subject,
       t.total_questions AS totalQuestions,
       t.total_marks AS totalMarks,
       ROUND(COALESCE(ta.total_score, 0), 2) AS score,
       t.duration_minutes,
       COALESCE(
         ta.time_taken_sec,
         TIMESTAMPDIFF(SECOND, ta.started_at, ta.submitted_at),
         0
       ) AS timeSpent,
       ta.user_id
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     LEFT JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE s.student_id = ?
       AND ta.test_id = ?
       AND t.test_type = 'sme'
       AND ta.status = 'submitted'
     ORDER BY ta.submitted_at DESC
     LIMIT 1`,
    [toInt(studentId), toInt(testId)]
  );

  return row || null;
};

export const getAttemptQuestionBreakdown = async (attemptId, testId) => {
  const [rows] = await pool.query(
    `SELECT
       tq.question_id AS questionId,
       COALESCE(aa.question_text_snapshot, q.question_text) AS questionText,
       COALESCE(sm.module_name, es.section_name, 'General') AS topic,
       aa.selected_option_text AS selectedOptionText,
       aa.selected_option_ids AS selectedOptionIds,
       aa.numerical_answer AS numericalAnswer,
       aa.correct_option_text AS correctOptionText,
       aa.correct_numerical AS correctNumerical,
       aa.all_options AS allOptions,
       aa.is_correct AS isCorrect,
       aa.marks_obtained AS marksObtained,
       CASE
         WHEN aa.selected_option_id IS NULL
           AND aa.selected_option_ids IS NULL
           AND aa.numerical_answer IS NULL THEN 'not_answered'
         ELSE 'answered'
       END AS answerStatus
     FROM test_questions tq
     JOIN questions q ON q.question_id = tq.question_id
     LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
     LEFT JOIN exam_sections es ON es.section_id = tq.section_id
     LEFT JOIN attempt_answers aa
       ON aa.attempt_id = ? AND aa.question_id = tq.question_id
     WHERE tq.test_id = ?
     ORDER BY tq.sort_order ASC, tq.question_id ASC`,
    [toInt(attemptId), toInt(testId)]
  );

  return rows;
};

export const getTeacherAssignedStudentsCount = async (teacherUserId) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(DISTINCT ce.student_id) AS totalAssignedStudents
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN course_enrollments ce ON ce.course_id = cs.course_id
     WHERE t.user_id = ?
       AND ce.status != 'dropped'`,
    [toInt(teacherUserId)]
  );

  return Number(row?.totalAssignedStudents || 0);
};

export const getTeacherLeaderboard = async (teacherUserId, course, limit = 5) => {
  const courseFilter = buildTeacherCourseFilter(course);
  const [rows] = await pool.query(
    `SELECT
       s.student_id AS studentId,
       CONCAT(u.first_name, ' ', u.last_name) AS studentName,
       ROUND(COALESCE(AVG(ta.total_score), 0), 2) AS avgScore
     FROM tests t
     JOIN test_attempts ta ON ta.test_id = t.test_id AND ta.status = 'submitted'
     JOIN students s ON s.user_id = ta.user_id
     JOIN users u ON u.user_id = s.user_id
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.test_type = 'sme'
       AND t.created_by = ?${courseFilter.clause}
     GROUP BY s.student_id, u.first_name, u.last_name
     ORDER BY avgScore DESC, studentName ASC
     LIMIT ?`,
    [toInt(teacherUserId), ...courseFilter.params, toInt(limit) || 5]
  );

  return rows;
};

export const countTeacherStudents = async (teacherUserId, course) => {
  const courseFilter = buildTeacherCourseFilter(course);
  const [[row]] = await pool.query(
    `SELECT COUNT(DISTINCT s.student_id) AS total
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN courses c ON c.course_id = cs.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     JOIN course_enrollments ce ON ce.course_id = c.course_id AND ce.status != 'dropped'
     JOIN students s ON s.student_id = ce.student_id
     WHERE t.user_id = ?${courseFilter.clause}`,
    [toInt(teacherUserId), ...courseFilter.params]
  );

  return Number(row?.total || 0);
};

export const getTeacherStudents = async (teacherUserId, course, page = 1, limit = 10) => {
  const courseFilter = buildTeacherCourseFilter(course);
  const offset = ((toInt(page) || 1) - 1) * (toInt(limit) || 10);
  const queryLimit = toInt(limit) || 10;

  const [rows] = await pool.query(
    `SELECT
       s.student_id AS studentId,
       CONCAT(u.first_name, ' ', u.last_name) AS studentName,
       MIN(cat.category_name) AS course,
       COALESCE(scores.avgScore, 0) AS avgScore
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN courses c ON c.course_id = cs.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     JOIN course_enrollments ce ON ce.course_id = c.course_id AND ce.status != 'dropped'
     JOIN students s ON s.student_id = ce.student_id
     JOIN users u ON u.user_id = s.user_id
     LEFT JOIN (
       SELECT
         s2.student_id,
         ROUND(COALESCE(AVG(ta.total_score), 0), 2) AS avgScore
       FROM tests t2
       JOIN test_attempts ta ON ta.test_id = t2.test_id AND ta.status = 'submitted'
       JOIN students s2 ON s2.user_id = ta.user_id
       LEFT JOIN categories cat2 ON cat2.category_id = t2.exam_id
       WHERE t2.test_type = 'sme'
         AND t2.created_by = ?${courseFilter.clause.replace(/cat\./g, 'cat2.')}
       GROUP BY s2.student_id
     ) scores ON scores.student_id = s.student_id
     WHERE t.user_id = ?${courseFilter.clause}
     GROUP BY s.student_id, u.first_name, u.last_name, scores.avgScore
     ORDER BY avgScore DESC, studentName ASC
     LIMIT ? OFFSET ?`,
    [
      toInt(teacherUserId),
      ...courseFilter.params,
      toInt(teacherUserId),
      ...courseFilter.params,
      queryLimit,
      offset,
    ]
  );

  return rows;
};

export const getStudentOverviewForContext = async ({ studentId, teacherUserId = null }) => {
  const params = [toInt(studentId)];
  let teacherClause = '';

  if (teacherUserId !== null) {
    teacherClause = ' AND t.created_by = ?';
    params.push(toInt(teacherUserId));
  }

  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS testsAttempted,
       ROUND(COALESCE(AVG(ta.total_score), 0), 2) AS avgScore,
       ROUND(COALESCE(AVG(ta.accuracy_percent), 0), 2) AS accuracy
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     WHERE s.student_id = ?
       AND ta.status = 'submitted'
       AND t.test_type = 'sme'${teacherClause}`,
    params
  );

  return row || { testsAttempted: 0, avgScore: 0, accuracy: 0 };
};

export const getStudentTestHistoryForContext = async ({ studentId, teacherUserId = null, limit = null }) => {
  const params = [toInt(studentId)];
  let teacherClause = '';
  let limitClause = '';

  if (teacherUserId !== null) {
    teacherClause = ' AND t.created_by = ?';
    params.push(toInt(teacherUserId));
  }

  if (limit !== null) {
    limitClause = ' LIMIT ?';
    params.push(toInt(limit));
  }

  const [rows] = await pool.query(
    `SELECT
       t.test_id AS testId,
       t.title AS testName,
       DATE_FORMAT(ta.submitted_at, '%Y-%m-%d') AS date,
       ROUND(COALESCE(ta.total_score, 0), 2) AS score,
       t.total_marks AS totalMarks,
       ROUND(COALESCE(ta.accuracy_percent, 0), 2) AS accuracy
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     JOIN students s ON s.user_id = ta.user_id
     WHERE s.student_id = ?
       AND ta.status = 'submitted'
       AND t.test_type = 'sme'${teacherClause}
     ORDER BY ta.submitted_at DESC${limitClause}`,
    params
  );

  return rows;
};

export const getWeakTopicsForContext = async ({ studentId, teacherUserId = null, limit = 5 }) => {
  const params = [toInt(studentId)];
  let teacherClause = '';

  if (teacherUserId !== null) {
    teacherClause = ' AND t.created_by = ?';
    params.push(toInt(teacherUserId));
  }

  params.push(toInt(limit) || 5);

  const [rows] = await pool.query(
    `SELECT
       COALESCE(sm.module_name, es.section_name, 'General') AS topic,
       SUM(
         CASE
           WHEN aa.is_correct = 1 THEN 0
           ELSE 1
         END
       ) AS issueCount
     FROM tests t
     JOIN test_attempts ta ON ta.test_id = t.test_id AND ta.status = 'submitted'
     JOIN students s ON s.user_id = ta.user_id
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     JOIN questions q ON q.question_id = aa.question_id
     LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
     LEFT JOIN test_questions tq ON tq.test_id = t.test_id AND tq.question_id = aa.question_id
     LEFT JOIN exam_sections es ON es.section_id = tq.section_id
     WHERE s.student_id = ?
       AND t.test_type = 'sme'${teacherClause}
     GROUP BY topic
     HAVING issueCount > 0
     ORDER BY issueCount DESC, topic ASC
     LIMIT ?`,
    params
  );

  return rows;
};

export const getSubjectFilterOptions = async () => {
  const [rows] = await pool.query(
    `SELECT DISTINCT
       LOWER(cs.subject_name) AS value,
       cs.subject_name AS label
     FROM tests t
     JOIN course_subjects cs ON cs.subject_id = t.subject_id
     WHERE t.test_type = 'sme'
     ORDER BY cs.subject_name ASC`
  );

  return rows;
};

export const getCourseFilterOptions = async () => {
  const [rows] = await pool.query(
    `SELECT DISTINCT
       LOWER(cat.exam_code) AS value,
       cat.category_name AS label
     FROM categories cat
     JOIN courses c ON c.category_id = cat.category_id
     ORDER BY cat.category_name ASC`
  );

  return rows;
};
