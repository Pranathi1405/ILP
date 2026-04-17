/**
 * ============================================================
 * Custom UG Exam Test Model
 * ------------------------------------------------------------
 * Module  : Test Generator - Custom UG Exam Engine
 * Author  : NDMATRIX
 * Description:
 * Database layer for custom UG exam test generation.
 * Shared functions (findExamByCode, attempt flow, scoring)
 * are imported from testUtils.model.js
 * ============================================================
 */
import pool from '../config/database.config.js';
import { safeParseJson } from '../utils/safeParseJson.js';

// ─── Re-export shared utilities so service only needs one import ──
export {
  findExamByCode,
  findTestById,
  createAttempt,
  findAttemptById,
  findActiveAttempt,
  submitAttempt,
  getAttemptResults,
} from './testUtils.model.js';

// ─── Get subscription + plan for a user ───────────────────────
export const findActiveSubscriptionWithPlan = async (userId) => {
  const [rows] = await pool.query(
    `SELECT uts.*, p.custom_test_limit, p.plan_code
     FROM user_test_subscriptions uts
     JOIN plans p ON p.plan_id = uts.plan_id
     WHERE uts.user_id = ? AND uts.is_active = 1
     ORDER BY uts.created_at DESC
     LIMIT 1`,
    [parseInt(userId)]
  );
  return rows[0] || null;
};

// ─── Get exams allowed for a user based on their subscriptions ─
export const getUserAllowedExams = async (userId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT 
       cat.category_id AS exam_id,
       cat.exam_code,
       cat.category_name AS exam_name,
       cat.total_marks,
       cat.total_questions,
       cat.duration_mins,
       cat.total_papers,
       cat.has_partial_marking,
       cat.notes
     FROM user_test_subscriptions uts
     JOIN courses c ON c.course_id = uts.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     WHERE uts.user_id = ? AND uts.is_active = 1
     ORDER BY cat.category_name ASC`,
    [parseInt(userId)]
  );
  return rows;
};

// ─── Get total distinct subject count for an exam ─────────────
export const countDistinctSubjectsInExam = async (categoryId) => {
  const [[{ totalSubjectsInExam }]] = await pool.query(
    `SELECT COUNT(DISTINCT subject_id) AS totalSubjectsInExam
     FROM exam_sections WHERE category_id = ?`,
    [parseInt(categoryId)]
  );
  return Number(totalSubjectsInExam) || 1;
};

// ─── Increment custom tests used counter ──────────────────────
export const incrementCustomTestsUsed = async (connection, subscriptionId) => {
  await connection.query(
    `UPDATE user_test_subscriptions
     SET custom_tests_used = custom_tests_used + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [parseInt(subscriptionId)]
  );
};

// ─── Get sections filtered to selected subjects ────────────────
export const findSectionsForSubjects = async (categoryId, subjectIds, paperNumber = null) => {
  const placeholders = subjectIds.map(() => '?').join(',');
  const baseParams = [
    parseInt(categoryId),
    parseInt(categoryId), // for exam_id fallback
    ...subjectIds.map(id => parseInt(id)),
    ...subjectIds.map(id => parseInt(id)),
  ];

  const buildQuery = (includePaper) => {
    const params = [...baseParams];
    let sql = `
      SELECT es.*, cs.subject_name
      FROM exam_sections es
      LEFT JOIN course_subjects cs ON cs.subject_id = es.subject_id
      WHERE (es.category_id = ? OR es.exam_id = ?)
        AND (
          es.subject_id IN (${placeholders})
          OR (es.global_subject_id IS NOT NULL AND es.global_subject_id IN (${placeholders}))
        )
    `;

    if (includePaper && paperNumber !== null) {
      sql += ` AND (es.paper_number = ? OR es.paper_number IS NULL)`;
      params.push(parseInt(paperNumber));
    }

    sql += ` ORDER BY es.sort_order ASC`;
    return { sql, params };
  };

  // First try with paper filter (if provided)
  let { sql, params } = buildQuery(true);
  let [rows] = await pool.query(sql, params);

  // Fallback: if nothing and paper filter applied, retry without paper filter
  if (!rows.length && paperNumber !== null) {
    ({ sql, params } = buildQuery(false));
    [rows] = await pool.query(sql, params);
  }

  return rows;
};
export const getExamPatternSections = async (categoryId, subjectIds = [], paperNumber = null) => {
  const params = [parseInt(categoryId), parseInt(categoryId)];
  let sql = `
    SELECT
      es.paper_number,
      es.section_id,
      es.section_name,
      es.question_type,
      es.num_questions,
      es.marks_correct,
      es.marks_incorrect,
      es.marks_partial,
      es.is_optional,
      es.subject_id,
      es.subject_name,
      es.sort_order
    FROM exam_sections es
    WHERE (es.category_id = ? OR es.exam_id = ?)
  `;

  if (subjectIds.length > 0) {
    sql += ` AND (es.subject_id IN (${subjectIds.map(() => '?').join(',')})
                 OR (es.global_subject_id IS NOT NULL AND es.global_subject_id IN (${subjectIds.map(() => '?').join(',')})))`;
    params.push(...subjectIds.map(id => parseInt(id)), ...subjectIds.map(id => parseInt(id)));
  }

  if (paperNumber !== null) {
    sql += ` AND (es.paper_number = ? OR es.paper_number IS NULL)`;
    params.push(parseInt(paperNumber));
  }

  sql += ` ORDER BY es.paper_number ASC, es.subject_name ASC, es.sort_order ASC`;

  const [rows] = await pool.query(sql, params);
  return rows;
};

// ─── Count available questions with filters ────────────────────
export const countQuestionsWithDifficulty = async (
  subjectId,
  questionType,
  difficulty = null,
  moduleIds = []
) => {
  const typeMap = {
    mcq_single: 'mcq', mcq_multi: 'mcq_multi',
    nat: 'numerical', match_list: 'match_list'
  };

  const conditions = [
    'q.is_active = 1',
    'q.question_type = ?',
    'sm.subject_id = ?'
  ];
  const params = [typeMap[questionType] || questionType, parseInt(subjectId)];

  if (difficulty) {
    conditions.push('q.difficulty = ?');
    params.push(difficulty);
  }

  if (moduleIds.length > 0) {
    conditions.push(`q.module_id IN (${moduleIds.map(() => '?').join(',')})`);
    params.push(...moduleIds);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total 
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return Number(total);
};

// ─── Get random questions with filters ────────────────────────
export const getQuestionsWithDifficulty = async (
  subjectId,
  questionType,
  difficulty = null,
  limit,
  moduleIds = [],
  excludeQuestionIds = []
) => {
  const typeMap = {
    mcq_single: 'mcq', mcq_multi: 'mcq_multi',
    nat: 'numerical', match_list: 'match_list'
  };

  const conditions = [
    'q.is_active = 1',
    'q.question_type = ?',
    'sm.subject_id = ?'
  ];
  const params = [typeMap[questionType] || questionType, parseInt(subjectId)];

  if (difficulty) {
    conditions.push('q.difficulty = ?');
    params.push(difficulty);
  }

  if (moduleIds.length > 0) {
    conditions.push(`q.module_id IN (${moduleIds.map(() => '?').join(',')})`);
    params.push(...moduleIds);
  }

  if (excludeQuestionIds.length > 0) {
    conditions.push(`q.question_id NOT IN (${excludeQuestionIds.map(() => '?').join(',')})`);
    params.push(...excludeQuestionIds.map(id => parseInt(id)));
  }

  const sql = `
    SELECT q.question_id, q.question_text, q.question_type, q.difficulty,
      q.marks, q.module_id,
      GROUP_CONCAT(
        JSON_OBJECT('option_id', qo.option_id, 'option_text', qo.option_text)
        ORDER BY qo.option_id
      ) AS options
    FROM questions q
    JOIN subject_modules sm ON sm.module_id = q.module_id
    LEFT JOIN question_options qo ON qo.question_id = q.question_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY q.question_id
    ORDER BY RAND()
    LIMIT ${parseInt(limit)}
  `;

  const [rows] = await pool.query(sql, params);
  return rows.map(q => ({
    ...q,
    options: safeParseJson(q.options, [], true)
  }));
};

// ─── Get all custom tests for a user (paginated) ──────────────
export const findCustomTestsByUser = async (userId) => {
  const searchTerm = '%practice%';

  const [rows] = await pool.query(
    `SELECT 
      t.test_id, 
      t.title, 
      t.exam_type, 
      t.paper_number,
      t.total_questions, 
      t.total_marks, 
      t.duration_minutes, 
      t.created_at,
      ep.exam_name,

      ta.attempt_id,  -- ✅ FIX: include attempt_id
      ta.total_score, 
      ta.accuracy_percent,

      (ta.total_score / t.total_marks) AS score_ratio

   FROM tests t

   LEFT JOIN exam_patterns ep 
     ON ep.exam_id = t.exam_id

   LEFT JOIN (
      SELECT ta1.*
      FROM test_attempts ta1
      INNER JOIN (
          SELECT test_id, user_id, MAX(attempt_id) AS latest_attempt_id
          FROM test_attempts
          WHERE user_id = ?
          GROUP BY test_id, user_id
      ) ta2 
      ON ta1.attempt_id = ta2.latest_attempt_id
   ) ta 
   ON ta.test_id = t.test_id

   WHERE t.created_by = ?
     AND t.test_type = 'custom'
     AND t.is_deleted = 0
     AND LOWER(t.title) NOT LIKE ?

   ORDER BY score_ratio DESC, ta.total_score DESC
   LIMIT 3;`,
    [parseInt(userId), parseInt(userId), searchTerm]
  );

  return {
    data: rows
  };
};

// ─── Create a custom UG test record ───────────────────────────
export const createCustomUgTest = async (
  connection,
  { userId, examId, examCode, examName, subjectNames = [], difficulty, totalQuestions, totalMarks, duration }
) => {
  const subjectList = subjectNames.join(', ');
  const difficultyLabel = difficulty && difficulty !== 'all' ? ` - ${difficulty}` : '';
  const title = `${examName} - ${subjectList}${difficultyLabel} - ${new Date().toISOString().split('T')[0]}`;

  const [result] = await connection.query(
    `INSERT INTO tests
      (created_by, test_type, exam_id, exam_type, paper_number, title,
       total_questions, total_marks, duration_minutes, negative_marking, question_source)
     VALUES (?, 'custom', ?, ?, 1, ?, ?, ?, ?, 1, 'qb')`,
    [
      parseInt(userId), parseInt(examId), examCode,
      title, parseInt(totalQuestions), parseInt(totalMarks), parseInt(duration)
    ]
  );
  return result.insertId;
};

// ─── Insert test questions ─────────────────────────────────────
export const insertCustomUgTestQuestions = async (connection, testId, questions) => {
  const values = questions.map(q => [
    parseInt(testId),
    parseInt(q.question_id),
    q.section_id,
    q.module_id || null,
    q.marks_correct,
    q.marks_incorrect,
    q.question_type,
    q.paper_number || 1,
    q.sort_order,
  ]);

  await connection.query(
    `INSERT INTO test_questions
      (test_id, question_id, section_id, module_id, marks_correct,
       marks_incorrect, question_type, paper_number, sort_order)
     VALUES ?`,
    [values]
  );
};
// ─── Get subjects for an exam ──────────────────────────────────
// customUGtest.model.js
export const getSubjectsForExam = async (examCode, userId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT 
       cs.subject_id,
       cs.subject_name,
       cs.display_order
     FROM user_test_subscriptions uts
     JOIN courses c ON c.course_id = uts.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     JOIN course_subjects cs ON cs.course_id = c.course_id
     WHERE cat.exam_code = ? 
       AND uts.user_id = ? 
       AND uts.is_active = 1
       AND cs.is_active = 1
     ORDER BY cs.display_order ASC`,
    [examCode, parseInt(userId)]
  );
  return rows;
};
export const getChaptersBySubject = async (subjectId) => {
  const [rows] = await pool.query(
    `SELECT 
       m.module_id,
       m.module_name,
       m.display_order
     FROM subject_modules m
     WHERE m.subject_id = ?
       AND m.is_published = 1
     ORDER BY m.display_order ASC`,
    [parseInt(subjectId)]
  );
  return rows;
};

// ─── Log custom UG test generation ────────────────────────────
export const logCustomUgTestGeneration = async (
  connection,
  { userId, examId, examCode, subscriptionId, testId }
) => {
  await connection.query(
    `INSERT INTO test_generation_logs
      (user_id, subject_id, subscription_id, test_id, exam_id, exam_type, paper_number)
     VALUES (?, NULL, ?, ?, ?, ?, 1)`,
    [
      parseInt(userId), parseInt(subscriptionId),
      parseInt(testId), parseInt(examId), examCode
    ]
  );
};
