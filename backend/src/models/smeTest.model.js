/**
 * ============================================================
 * SME Test Model
 * ------------------------------------------------------------
 * Module  : SME Test Engine
 * Author  : NDMATRIX
 * Description:
 * Database layer for SME test creation, question management,
 * attempt flow and analytics.
 * Shared functions (attempt flow, scoring, results) are imported
 * from testUtils.model.js — no dependency on UG test module.
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

// ============================================================
// TEACHER — TEST MANAGEMENT
// ============================================================

const toInt = (val, def = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
};

const calculateDuration = ({ questions = [], totalQuestions, exam }) => {
  // ✅ BEST ACCURACY (question-level timing)
  if (questions.length > 0) {
    const avgTime = exam?.avg_time_per_question || 60; // fallback = 60 sec
    const totalSec = questions.reduce(
      (sum, q) => sum + (toInt(q.time_per_question, avgTime)),
      0
    );
    return Math.round(totalSec / 60);
  }

  // ✅ FALLBACK (proportional logic)
  if (exam?.total_questions && exam?.duration_mins) {
    return Math.round(
      (toInt(totalQuestions) / toInt(exam.total_questions)) *
      toInt(exam.duration_mins)
    );
  }

  // ✅ LAST FALLBACK
  return toInt(exam?.duration_mins, 60);
};
export const getSubjectSections = async (categoryId, subjectId) => {
  const [rows] = await pool.query(
    `SELECT es.*
     FROM exam_sections es
     WHERE es.category_id = ? AND es.subject_id = ?
     ORDER BY es.sort_order ASC`,
    [parseInt(categoryId), parseInt(subjectId)]
  );
  return rows;
};
export const getTeacherDealingSubjectsModel = `
  SELECT DISTINCT
    cs.subject_id,
    cs.subject_name,
    c.course_id,
    c.course_name,
    cat.category_id AS exam_id,
    cat.exam_code,
    cat.category_name AS exam_name
  FROM course_subjects cs
  JOIN teachers t ON t.teacher_id = cs.teacher_id
  JOIN courses c ON c.course_id = cs.course_id
  JOIN categories cat ON cat.category_id = c.category_id
  WHERE t.user_id = ? AND cs.is_active = 1
  ORDER BY c.course_name ASC
`;

export const getTeacherAssignedExams = async (teacherUserId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT
       cat.category_id AS exam_id,
       cat.exam_code,
       cat.category_name AS exam_name,
       c.course_id,
       c.course_name
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     JOIN courses c ON c.course_id = cs.course_id
     JOIN categories cat ON cat.category_id = c.category_id
     WHERE t.user_id = ? AND cs.is_active = 1
     ORDER BY cat.category_name ASC`,
    [parseInt(teacherUserId)]
  );
  return rows;
};

export const createSmeTest = async (connection, payload) => {
  const {
    teacherUserId,
    examId,
    examCode,
    examName,
    subjectName,
    subjectId,
    questionSource,
    scheduledStart,
    scheduledEnd,
    totalQuestions,
    totalMarks,
    paperNumber,
    // duration is calculated in the service; don't override it here
    duration
  } = payload;

  // ✅ Detect subject-level test safely
  const isSubjectLevelTest = !!subjectId;

  const title = [
    examName,
    isSubjectLevelTest ? subjectName : "Full Test",
    new Date().toISOString().split('T')[0]
  ].filter(Boolean).join(' - ');

  const [result] = await connection.query(
    `INSERT INTO tests
      (created_by, exam_id, subject_id, exam_type, paper_number, test_type,
       status, question_source, title, total_questions, total_marks,
       duration_minutes, negative_marking, scheduled_start, scheduled_end)
     VALUES (?, ?, ?, ?, ?, 'sme', 'draft', ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      toInt(teacherUserId),
      toInt(examId),
      toInt(subjectId),
      examCode,
      toInt(paperNumber, 1),
      questionSource || 'qb',
      title,
      toInt(totalQuestions),
      toInt(totalMarks),
      toInt(duration, calculateDuration({ totalQuestions, exam: { duration_mins: 60 } })),
      scheduledStart || null,
      scheduledEnd || null
    ]
  );

  return result.insertId;
};

export const findSubjectById = async (subjectId) => {
  const [[row]] = await pool.query(
    `SELECT cs.subject_id, cs.subject_name, cs.course_id, cs.display_order,
       c.category_id
     FROM course_subjects cs
     JOIN courses c ON c.course_id = cs.course_id
     WHERE cs.subject_id = ? AND cs.is_active = 1`,
    [parseInt(subjectId)]
  );
  return row || null;
};

export const findSmeTestById = async (testId) => {
  const [[test]] = await pool.query(
    `SELECT t.*,
       cat.category_name AS exam_name, cat.exam_code,
       u.first_name, u.last_name,
       (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.test_id) as questions_added
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     LEFT JOIN users u ON u.user_id = t.created_by
     WHERE t.test_id = ? AND t.test_type = 'sme'`,
    [toInt(testId)]
  );

  if (!test) return null;

  // ✅ SAFER subject extraction
  let subjectName = null;
  if (test.title) {
    const parts = test.title.split(' - ');
    subjectName = parts.length >= 3 ? parts[1] : null;
  }

  // ✅ Sections
  let sections = [];
  if (toInt(test.subject_id)) {
    const [sectionRows] = await pool.query(
      `SELECT es.section_id, es.section_name, es.subject_name,
         es.subject_id, es.subject_id, es.question_type, es.num_questions, es.marks_correct,
         es.marks_incorrect, es.paper_number,
         es.sort_order,
         (SELECT COUNT(*) FROM test_questions tq
          WHERE tq.test_id = ? AND tq.section_id = es.section_id) as questions_added,
         es.num_questions - (SELECT COUNT(*) FROM test_questions tq
          WHERE tq.test_id = ? AND tq.section_id = es.section_id) as remaining
       FROM exam_sections es
       WHERE es.category_id = ? AND es.subject_id = ?
       ORDER BY es.sort_order ASC`,
      [
        toInt(testId),
        toInt(testId),
        toInt(test.exam_id),
        toInt(test.subject_id)
      ]
    );

    sections = sectionRows;
  }

  // ✅ Questions
  const [questions] = await pool.query(
    `SELECT tq.question_id, tq.source, tq.section_id,
       tq.marks_correct, tq.marks_incorrect,
       tq.question_type, tq.sort_order,
       q.question_text, q.difficulty,
       q.question_type as db_question_type,
       q.question_image_url, q.image_position,
       q.paragraph_id, p.paragraph_text, p.paragraph_image_url,
       q.is_manual, q.correct_answer, q.explanation,
       GROUP_CONCAT(
         JSON_OBJECT(
           'option_id', qo.option_id,
           'option_text', qo.option_text,
           'option_image_url', IFNULL(qo.option_image_url, ''),
           'is_correct', qo.is_correct
         ) ORDER BY qo.option_id
       ) as options
     FROM test_questions tq
     JOIN questions q ON q.question_id = tq.question_id
     LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
     LEFT JOIN question_options qo ON qo.question_id = tq.question_id
     WHERE tq.test_id = ?
     GROUP BY tq.question_id
     ORDER BY tq.sort_order ASC`,
    [toInt(testId)]
  );

  const parsedQuestions = questions.map(q => ({
    ...q,
    options: safeParseJson(q.options, [], true)
  }));

  const allSectionsComplete =
    sections.length > 0 &&
    sections.every(s => toInt(s.questions_added) >= toInt(s.num_questions));

  return {
    ...test,
    subject: subjectName,
    sections,
    all_sections_complete: allSectionsComplete,
    questions: parsedQuestions
  };
};
export const updateSmeTestMeta = async (connection, testId, fields) => {
  const allowed = [
    'title', 'status', 'paper_number', 'duration_minutes',
    'total_marks', 'negative_marking', 'scheduled_start', 'scheduled_end'
  ];
  const setClauses = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (setClauses.length === 0) return;

  values.push(parseInt(testId));
  await connection.query(
    `UPDATE tests SET ${setClauses.join(', ')} WHERE test_id = ?`,
    values
  );
};

export const updateQuestionAndOptions = async (connection, questionId, fields) => {
  // Update question row
  const qAllowed = ['question_text', 'difficulty', 'correct_answer'];
  const qSet = [];
  const qVals = [];

  for (const key of qAllowed) {
    if (fields[key] !== undefined) {
      qSet.push(`${key} = ?`);
      qVals.push(fields[key]);
    }
  }

  if (qSet.length > 0) {
    qVals.push(parseInt(questionId));
    await connection.query(
      `UPDATE questions SET ${qSet.join(', ')} WHERE question_id = ?`,
      qVals
    );
  }

  // Update options if provided
  if (Array.isArray(fields.options) && fields.options.length > 0) {
    for (const opt of fields.options) {
      if (!opt.option_id || opt.option_id < 0) continue; // skip new/temp options
      await connection.query(
        `UPDATE question_options SET option_text = ?, is_correct = ? WHERE option_id = ? AND question_id = ?`,
        [opt.option_text, opt.is_correct ? 1 : 0, parseInt(opt.option_id), parseInt(questionId)]
      );
    }
  }
};

// Also update test_questions row-level marks/type if needed
export const updateTestQuestionMeta = async (connection, testId, questionId, fields) => {
  const allowed = ['marks_correct', 'marks_incorrect'];
  const setClauses = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (setClauses.length === 0) return;

  values.push(parseInt(testId), parseInt(questionId));
  await connection.query(
    `UPDATE test_questions SET ${setClauses.join(', ')} WHERE test_id = ? AND question_id = ?`,
    values
  );
};
export const findSmeTestsByTeacher = async (teacherUserId, { page = 1, limit = 10 } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM tests WHERE created_by = ? AND test_type = 'sme'`,
    [parseInt(teacherUserId)]
  );
  const [rows] = await pool.query(
    `SELECT t.test_id, t.title, t.status, t.question_source,
       t.scheduled_start, t.scheduled_end, t.total_questions,
       t.total_marks, t.duration_minutes, t.created_at,
       cat.category_name AS exam_name, cat.exam_code,
       (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.test_id) as questions_added,
       (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_id = t.test_id) as total_attempts
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.created_by = ? AND t.test_type = 'sme'
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [parseInt(teacherUserId), parseInt(limit), offset]
  );
  return {
    data: rows,
    pagination: {
      total: Number(total), page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(Number(total) / parseInt(limit))
    }
  };
};

export const findPublishedSmeTests = async ({ page = 1, limit = 10, userId } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM tests WHERE test_type = 'sme' AND status = 'published'`
  );
  const [rows] = await pool.query(
    `SELECT t.test_id, t.title, t.status, t.question_source,
       t.scheduled_start, t.scheduled_end, t.total_questions,
       t.total_marks, t.duration_minutes,
       cat.category_name AS exam_name, cat.exam_code,
       u.first_name, u.last_name,
       ta.status AS attempt_status,
       ta.attempt_id
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     JOIN users u ON u.user_id = t.created_by
     LEFT JOIN test_attempts ta ON ta.test_id = t.test_id AND ta.user_id = ?
     WHERE t.test_type = 'sme' AND t.status = 'published'
     ORDER BY t.scheduled_start ASC
     LIMIT ? OFFSET ?`,
    [parseInt(userId) || 0, parseInt(limit), offset]
  );
  return {
    data: rows,
    pagination: {
      total: Number(total), page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(Number(total) / parseInt(limit))
    }
  };
};

export const deleteTestCascade = async (connection, testId) => {

  // 1️⃣ Delete attempt answers
  await connection.query(
    `DELETE aa FROM attempt_answers aa
     JOIN test_attempts ta ON ta.attempt_id = aa.attempt_id
     WHERE ta.test_id = ?`,
    [testId]
  );

  // 2️⃣ Delete attempts
  await connection.query(
    `DELETE FROM test_attempts WHERE test_id = ?`,
    [testId]
  );

  // 3️⃣ Delete test questions mapping
  await connection.query(
    `DELETE FROM test_questions WHERE test_id = ?`,
    [testId]
  );

  // 4️⃣ Delete the test itself
  await connection.query(
    `DELETE FROM tests WHERE test_id = ?`,
    [testId]
  );
};

// ============================================================
// TEACHER — QUESTION MANAGEMENT
// ============================================================

export const getAvailableQbQuestions = async (subjectId, questionType, { difficulty, page = 1, limit = 50 } = {}) => {
  const typeMap = {
    mcq_single: 'mcq', mcq_multi: 'mcq_multi',
    nat: 'numerical', match_list: 'match_list'
  };
  const dbType = typeMap[questionType] || questionType;

  const conditions = [
    'sm.subject_id = ?', 'q.is_active = 1',
    'q.is_manual = 0', 'q.question_type = ?'
  ];
  const params = [parseInt(subjectId), dbType];

  if (difficulty) {
    conditions.push('q.difficulty = ?');
    params.push(difficulty);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${conditions.join(' AND ')} AND sm.is_published = 1`,
    params
  );
  const [rows] = await pool.query(
    `SELECT q.question_id, q.question_text, q.difficulty, q.question_type,
       q.question_image_url, q.image_position,
       q.paragraph_id, p.paragraph_text, p.paragraph_image_url,
       GROUP_CONCAT(
         JSON_OBJECT(
           'option_id', qo.option_id,
           'option_text', qo.option_text,
           'option_image_url', IFNULL(qo.option_image_url, ''),
           'is_correct', qo.is_correct
         ) ORDER BY qo.option_id
       ) as options
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
     LEFT JOIN question_options qo ON qo.question_id = q.question_id
     WHERE ${conditions.join(' AND ')} AND sm.is_published = 1
     GROUP BY q.question_id
     ORDER BY q.difficulty ASC, q.question_id ASC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );
  return {
    data: rows.map(q => ({ ...q, options: safeParseJson(q.options, [], true) })),
    pagination: {
      total: Number(total), page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(Number(total) / parseInt(limit))
    }
  };
};

export const getSectionQuestionCounts = async (testId) => {
  const [rows] = await pool.query(
    `SELECT section_id, COUNT(*) as count FROM test_questions WHERE test_id = ? GROUP BY section_id`,
    [parseInt(testId)]
  );
  const map = {};
  for (const row of rows) map[row.section_id] = Number(row.count);
  return map;
};

export const getTestQuestionCount = async (testId) => {
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?`,
    [parseInt(testId)]
  );
  return Number(count);
};

export const getAddedQuestionIdsForSection = async (testId, sectionId) => {
  const [rows] = await pool.query(
    `SELECT question_id FROM test_questions WHERE test_id = ? AND section_id = ?`,
    [parseInt(testId), parseInt(sectionId)]
  );
  return rows.map(r => r.question_id);
};

export const getAddedQuestionIdsForTest = async (testId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT question_id FROM test_questions WHERE test_id = ?`,
    [parseInt(testId)]
  );
  return rows.map(r => r.question_id);
};

export const addQbQuestions = async (connection, testId, sectionId, questionIds, sectionData) => {
  const [existing] = await connection.query(
    `SELECT question_id FROM test_questions WHERE test_id = ?`,
    [parseInt(testId)]
  );
  const existingIds = existing.map(r => r.question_id);
  const newIds = questionIds.filter(id => !existingIds.includes(id));
  if (newIds.length === 0) return 0;

  const [[{ total }]] = await connection.query(
    `SELECT COUNT(*) as total FROM test_questions WHERE test_id = ?`,
    [parseInt(testId)]
  );

  const [questionChapters] = await connection.query(
    `SELECT question_id, module_id FROM questions WHERE question_id IN (?)`,
    [newIds]
  );
  const chapterMap = {};
  for (const q of questionChapters) chapterMap[q.question_id] = q.module_id;

  const values = newIds.map((qid, idx) => [
    parseInt(testId), parseInt(qid), 'qb',
    parseInt(sectionId), chapterMap[qid] || null,
    sectionData.marks_correct, sectionData.marks_incorrect,
    sectionData.question_type, sectionData.paper_number || 1,
    Number(total) + idx + 1
  ]);

  await connection.query(
    `INSERT INTO test_questions
      (test_id, question_id, source, section_id, module_id, marks_correct,
       marks_incorrect, question_type, paper_number, sort_order)
     VALUES ?`,
    [values]
  );
  return newIds.length;
};
export const addManualQuestion = async (
  connection,
  testId,
  teacherUserId,
  {
    subjectId,
    questionText,
    questionType,
    difficulty,
    options,
    correctAnswer,
    explanation,
    sectionData
  }
) => {
  const typeMap = {
    mcq_single: 'mcq',
    mcq_multi: 'mcq_multi',
    nat: 'numerical',
    match_list: 'match_list'
  };

  const dbType = typeMap[questionType] || questionType;

  const [[moduleRow]] = await connection.query(
    `SELECT module_id
     FROM subject_modules
     WHERE subject_id = ?
       AND is_published = 1
     ORDER BY module_id ASC
     LIMIT 1`,
    [parseInt(subjectId)]
  );

  if (!moduleRow) {
    throw {
      status: 400,
      message: 'No module found for selected subject'
    };
  }

  const moduleId = parseInt(moduleRow.module_id);

  const [qResult] = await connection.query(
    `INSERT INTO questions
      (
        module_id,
        difficulty,
        question_type,
        question_text,
        marks,
        created_by,
        is_manual,
        is_active,
        correct_answer,
        explanation
      )
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [
      moduleId,
      difficulty,
      dbType,
      questionText,
      sectionData.marks_correct,
      parseInt(teacherUserId),
      correctAnswer || null,
      explanation || null
    ]
  );

  const questionId = qResult.insertId;

  if (Array.isArray(options) && options.length > 0) {
    const optionValues = options.map((opt) => [
      questionId,
      opt.option_text,
      opt.is_correct ? 1 : 0
    ]);

    await connection.query(
      `INSERT INTO question_options
        (question_id, option_text, is_correct)
       VALUES ?`,
      [optionValues]
    );
  }

  const [[{ count }]] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM test_questions
     WHERE test_id = ?`,
    [parseInt(testId)]
  );

  await connection.query(
    `INSERT INTO test_questions
      (
        test_id,
        question_id,
        source,
        section_id,
        module_id,
        marks_correct,
        marks_incorrect,
        question_type,
        paper_number,
        sort_order
      )
     VALUES (?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)`,
    [
      parseInt(testId),
      questionId,
      sectionData.section_id,
      moduleId,
      sectionData.marks_correct,
      sectionData.marks_incorrect,
      sectionData.question_type,
      sectionData.paper_number || 1,
      Number(count) + 1
    ]
  );

  return questionId;
};

export const removeQuestion = async (testId, questionId) => {
  const [result] = await pool.query(
    `DELETE FROM test_questions WHERE test_id = ? AND question_id = ?`,
    [parseInt(testId), parseInt(questionId)]
  );
  return result.affectedRows;
};

export const publishTest = async (testId) => {
  await pool.query(
    `UPDATE tests SET status = 'published' WHERE test_id = ?`,
    [parseInt(testId)]
  );
};

// ============================================================
// STUDENT — ATTEMPT FLOW
// ============================================================

export const findExistingAttempt = async (testId, userId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_attempts
     WHERE test_id = ? AND user_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [parseInt(testId), parseInt(userId)]
  );
  return row || null;
};

// ============================================================
// ANALYTICS
// ============================================================

export const getSmeTestAnalytics = async (testId) => {
  const [[stats]] = await pool.query(
    `SELECT
       COUNT(*) as total_attempts,
       COUNT(CASE WHEN status = 'submitted' THEN 1 END) as completed_attempts,
       ROUND(AVG(CASE WHEN status = 'submitted' THEN total_score END), 2) as avg_score,
       MAX(CASE WHEN status = 'submitted' THEN total_score END) as highest_score,
       MIN(CASE WHEN status = 'submitted' THEN total_score END) as lowest_score,
       ROUND(AVG(CASE WHEN status = 'submitted' THEN accuracy_percent END), 2) as avg_accuracy,
       ROUND(AVG(CASE WHEN status = 'submitted' THEN time_taken_sec END), 0) as avg_time_sec
     FROM test_attempts WHERE test_id = ?`,
    [parseInt(testId)]
  );

  const [questionStats] = await pool.query(
    `SELECT
       aa.question_id,
       LEFT(MIN(aa.question_text_snapshot), 80) as question_text,
       COUNT(*) as total_attempts,
       SUM(aa.is_correct) as correct_count,
       ROUND((SUM(aa.is_correct) / COUNT(*)) * 100, 1) as accuracy_percent,
       ROUND(AVG(aa.marks_obtained), 2) as avg_marks
     FROM attempt_answers aa
     JOIN test_attempts ta ON ta.attempt_id = aa.attempt_id
     WHERE ta.test_id = ? AND ta.status = 'submitted'
     GROUP BY aa.question_id
     ORDER BY accuracy_percent ASC`,
    [parseInt(testId)]
  );

  const [distribution] = await pool.query(
    `SELECT
       CASE
         WHEN total_score < t.total_marks * 0.25 THEN '0-25%'
         WHEN total_score < t.total_marks * 0.50 THEN '25-50%'
         WHEN total_score < t.total_marks * 0.75 THEN '50-75%'
         ELSE '75-100%'
       END as score_range,
       COUNT(*) as student_count
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     WHERE ta.test_id = ? AND ta.status = 'submitted'
     GROUP BY score_range ORDER BY score_range ASC`,
    [parseInt(testId)]
  );

  return { overall: stats, question_stats: questionStats, score_distribution: distribution };
};
