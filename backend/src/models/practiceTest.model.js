// /**
//  * ============================================================
//  * Practice Test Model
//  * ------------------------------------------------------------
//  * Module  : Test Generator - Practice Test Engine
//  * Author  : Sathvik Goli, Harshitha Ravuri
//  * Description:
//  * Handles all database interactions for self-prepared practice
//  * tests. User selects subject, chapters, question types,
//  * difficulty, count, and hint delay. Instant per-question
//  * feedback is supported — answers are saved one at a time.
//  * ============================================================
//  */

import pool from '../config/database.config.js';

// ─── Student access helpers ────────────────────────────────────────────────────

export const findStudentCourseAccess = async (userId, courseId) => {
  const [[row]] = await pool.query(
    `SELECT c.course_id, c.course_name
     FROM students st
     JOIN course_enrollments ce ON ce.student_id = st.student_id
     JOIN courses c             ON c.course_id   = ce.course_id
     WHERE st.user_id = ? AND ce.course_id = ?
     LIMIT 1`,
    [parseInt(userId), parseInt(courseId)]
  );
  return row || null;
};

export const findAccessibleSubjectForStudent = async (userId, subjectId, courseId = null) => {
  const query = `
    SELECT cs.subject_id, cs.subject_name, cs.course_id
    FROM students st
    JOIN course_enrollments ce ON ce.student_id = st.student_id
    JOIN course_subjects    cs ON cs.course_id  = ce.course_id
    WHERE st.user_id    = ?
      AND cs.subject_id = ?
      AND cs.is_active  = 1
      ${courseId ? 'AND cs.course_id = ?' : ''}
    LIMIT 1
  `;
  const params = courseId
    ? [parseInt(userId), parseInt(subjectId), parseInt(courseId)]
    : [parseInt(userId), parseInt(subjectId)];

  const [[row]] = await pool.query(query, params);
  return row || null;
};

export const countAccessibleModulesForStudent = async (
  userId,
  subjectId,
  moduleIds = [],
  courseId = null,
) => {
  if (!Array.isArray(moduleIds) || !moduleIds.length) return 0;

  const cleanIds = moduleIds
    .map((id) => parseInt(id))
    .filter((id) => !isNaN(id) && id > 0);
  if (!cleanIds.length) return 0;

  const query = `
    SELECT COUNT(DISTINCT sm.module_id) AS total
    FROM students st
    JOIN course_enrollments ce ON ce.student_id = st.student_id
    JOIN course_subjects    cs ON cs.course_id  = ce.course_id
                               AND cs.subject_id = ?
                               AND cs.is_active  = 1
    JOIN subject_modules    sm ON sm.subject_id  = cs.subject_id
    WHERE st.user_id = ?
      ${courseId ? 'AND ce.course_id = ?' : ''}
      AND sm.module_id IN (?)
      AND sm.is_published = 1
  `;
  const params = courseId
    ? [parseInt(subjectId), parseInt(userId), parseInt(courseId), cleanIds]
    : [parseInt(subjectId), parseInt(userId), cleanIds];

  const [[row]] = await pool.query(query, params);
  return Number(row?.total ?? 0);
};

// ─── Question availability count ──────────────────────────────────────────────
// Subject is resolved via questions.module_id → subject_modules.subject_id
// No global_subject_id used anywhere.

export const countAvailableQuestions = async ({
  subjectId,
  questionTypes = [],
  difficulty = null,
  moduleIds = [],
}) => {
  const where  = ['q.is_active = 1'];
  const params = [];

  // Always join through subject_modules to resolve subject
  where.push(`sm.subject_id = ?`);
  params.push(parseInt(subjectId));

  if (difficulty) {
    where.push(`q.difficulty = ?`);
    params.push(difficulty);
  }

  if (moduleIds.length === 1) {
    where.push(`q.module_id = ?`);
    params.push(moduleIds[0]);
  } else if (moduleIds.length > 1) {
    where.push(`q.module_id IN (?)`);
    params.push(moduleIds);
  }

  if (questionTypes.length === 1) {
    where.push(`q.question_type = ?`);
    params.push(questionTypes[0]);
  } else if (questionTypes.length > 1) {
    where.push(`q.question_type IN (?)`);
    params.push(questionTypes);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT q.question_id) AS total
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${where.join(' AND ')}`,
    params
  );
  return Number(total);
};

// ─── Fetch randomised questions with options ──────────────────────────────────
// Returns q.module_id so insertPracticeTestQuestions can use it directly.

export const fetchPracticeQuestions = async ({
  subjectId,
  questionTypes = [],
  difficulty = null,
  moduleIds = [],
  limit,
}) => {
  const where  = ['q.is_active = 1'];
  const params = [];

  where.push(`sm.subject_id = ?`);
  params.push(parseInt(subjectId));

  if (difficulty) {
    where.push(`q.difficulty = ?`);
    params.push(difficulty);
  }

  if (moduleIds.length === 1) {
    where.push(`q.module_id = ?`);
    params.push(moduleIds[0]);
  } else if (moduleIds.length > 1) {
    where.push(`q.module_id IN (?)`);
    params.push(moduleIds);
  }

  if (questionTypes.length === 1) {
    where.push(`q.question_type = ?`);
    params.push(questionTypes[0]);
  } else if (questionTypes.length > 1) {
    where.push(`q.question_type IN (?)`);
    params.push(questionTypes);
  }

  const [qRows] = await pool.query(
    `SELECT q.question_id, q.question_text, q.question_type,
            q.difficulty, q.marks, q.explanation, q.hints,
            q.question_image_url, q.image_position,
            q.correct_answer, q.paragraph_id,
            q.module_id                   -- ✅ used directly in test_questions insert
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${where.join(' AND ')}
     GROUP BY q.question_id
     ORDER BY RAND()
     LIMIT ?`,
    [...params, parseInt(limit)]
  );

  if (!qRows.length) return [];

  const questionIds = qRows.map((q) => q.question_id);
  const [optRows] = await pool.query(
    `SELECT option_id, question_id, option_text, option_image_url, is_correct
     FROM question_options
     WHERE question_id IN (?)`,
    [questionIds]
  );

  const optMap = {};
  for (const opt of optRows) {
    if (!optMap[opt.question_id]) optMap[opt.question_id] = [];
    optMap[opt.question_id].push(opt);
  }

  return qRows.map((q) => ({ ...q, options: optMap[q.question_id] || [] }));
};

// ─── Create test (inside transaction) ─────────────────────────────────────────
// Aligns with updated tests schema:
//   test_type = 'custom', exam_type = 'practice'
//   is_deleted = 0, is_active = 1
//   exam_id = NULL (practice tests are not exam-linked)
//   scheduled_start / scheduled_end = NULL (self-paced)

export const createPracticeTest = async (conn, {
  subject_id,
  created_by,
  title,
  totalQuestions,
  totalMarks,
}) => {
  const [result] = await conn.execute(
    `INSERT INTO tests
       (subject_id, exam_id, exam_type, paper_number,
        created_by, test_type, status, question_source,
        title, total_questions, total_marks, duration_minutes,
        negative_marking, is_deleted, is_active)
     VALUES (?, NULL, 'practice', 1,
             ?, 'custom', 'published', 'qb',
             ?, ?, ?, 0,
             0, 0, 1)`,
    [
      parseInt(subject_id),
      parseInt(created_by),
      title,
      parseInt(totalQuestions),
      Math.round(parseFloat(totalMarks)),
    ]
  );
  return result.insertId;
};

// ─── Insert test questions (inside transaction) ────────────────────────────────
// module_id taken from q.module_id (already on question object).
// No global_subject_id — removed entirely.

export const insertPracticeTestQuestions = async (conn, testId, questions) => {
  if (!questions.length) return;

  // questions.question_type is DB-side ('mcq','numerical',…)
  // test_questions.question_type is ENUM ('mcq_single','nat',…)
  const questionTypeMap = {
    mcq:        'mcq_single',
    mcq_multi:  'mcq_multi',
    numerical:  'nat',
    match_list: 'match_list',
  };

  const values = questions.map((q) => [
    parseInt(testId),
    parseInt(q.question_id),
    'qb',                                             // source
    q.marks || 1,                                     // marks (display)
    null,                                             // section_id — NULL for practice
    q.module_id || null,                              // ✅ from questions.module_id directly
    parseFloat(q.marks_correct),
    parseFloat(q.marks_incorrect),
    questionTypeMap[q.question_type] || 'mcq_single',
    1,                                                // paper_number
    q.sort_order,
  ]);

  await conn.query(
    `INSERT INTO test_questions
       (test_id, question_id, source, marks, section_id, module_id,
        marks_correct, marks_incorrect, question_type, paper_number, sort_order)
     VALUES ?`,
    [values]
  );
};

// ─── Find single test by ID ────────────────────────────────────────────────────

export const findPracticeTestById = async (testId) => {
  const [[test]] = await pool.query(
    `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
            t.created_by, t.created_at, t.status, t.exam_type,
            t.subject_id, t.negative_marking, t.duration_minutes
     FROM tests t
     WHERE t.test_id    = ?
       AND t.test_type  = 'custom'
       AND t.exam_type  = 'practice'
       AND t.is_deleted = 0`,
    [parseInt(testId)]
  );
  if (!test) return null;

  // Fetch questions — correct answers excluded for active tests (sent on feedback only)
  const [questions] = await pool.query(
    `SELECT tq.question_id, tq.sort_order, tq.marks_correct, tq.marks_incorrect,
            tq.question_type, tq.module_id,
            q.question_text, q.difficulty, q.marks,
            q.question_image_url, q.image_position, q.hints,
            q.paragraph_id,
            p.paragraph_text, p.paragraph_image_url,
            sm.module_name AS chapter_name,
            cs.subject_name
     FROM test_questions tq
     JOIN questions q       ON q.question_id  = tq.question_id
     LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
     -- ✅ resolve subject via module_id → subject_modules → course_subjects
     LEFT JOIN subject_modules sm ON sm.module_id  = q.module_id
     LEFT JOIN course_subjects cs ON cs.subject_id = sm.subject_id AND cs.is_active = 1
     WHERE tq.test_id = ?
     ORDER BY tq.sort_order ASC`,
    [parseInt(testId)]
  );

  const qIds = questions.map((q) => q.question_id);
  const optMap = {};

  if (qIds.length) {
    const [opts] = await pool.query(
      `SELECT option_id, question_id, option_text, option_image_url
       FROM question_options
       WHERE question_id IN (?)
       ORDER BY option_id ASC`,
      [qIds]
    );
    for (const o of opts) {
      if (!optMap[o.question_id]) optMap[o.question_id] = [];
      optMap[o.question_id].push(o);   // is_correct NOT exposed to frontend
    }
  }

  return {
    ...test,
    questions: questions.map((q) => ({
      ...q,
      options: optMap[q.question_id] || [],
    })),
  };
};

// ─── List practice tests for a user ───────────────────────────────────────────
// Filters by exam_type = 'practice' — not by title LIKE anymore.

export const findPracticeTestsByUser = async (userId, query = {}) => {
  const page   = Math.max(1, parseInt(query.page)  || 1);
  const limit  = Math.min(50, parseInt(query.limit) || 10);
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tests
     WHERE created_by = ?
       AND test_type  = 'custom'
       AND exam_type  = 'practice'
       AND is_deleted = 0`,
    [parseInt(userId)]
  );

  const [rows] = await pool.query(
    `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
            t.created_at, t.status, t.subject_id,
            ta.attempt_id, ta.status AS attempt_status,
            ta.total_score, ta.accuracy_percent, ta.submitted_at
     FROM tests t
     LEFT JOIN test_attempts ta
       ON ta.test_id = t.test_id AND ta.user_id = ?
     WHERE t.created_by = ?
       AND t.test_type  = 'custom'
       AND t.exam_type  = 'practice'
       AND t.is_deleted = 0
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [parseInt(userId), parseInt(userId), limit, offset]
  );

  return {
    data: rows,
    pagination: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
  };
};

// ─── Attempt management ────────────────────────────────────────────────────────

export const findActiveAttempt = async (testId, userId) => {
  const [[row]] = await pool.query(
    `SELECT attempt_id, test_id, user_id, started_at, status
     FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status = 'in_progress'
     LIMIT 1`,
    [parseInt(testId), parseInt(userId)]
  );
  return row || null;
};

export const findAttemptById = async (attemptId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_attempts WHERE attempt_id = ?`,
    [parseInt(attemptId)]
  );
  return row || null;
};

export const createAttempt = async (testId, userId) => {
  const [result] = await pool.query(
    `INSERT INTO test_attempts
       (test_id, user_id, started_at, status, attempt_number, paper_number)
     VALUES (?, ?, NOW(), 'in_progress', 1, 1)`,
    [parseInt(testId), parseInt(userId)]
  );
  return result.insertId;
};

// ─── Submit single answer → instant feedback ──────────────────────────────────
// question_type on questions table: 'mcq' | 'mcq_multi' | 'numerical' | 'match_list'
// Scoring logic branches on this DB-side type.

export const saveAnswerAndGetFeedback = async (attemptId, testId, questionId, payload) => {
  const {
    selected_option_id  = null,
    selected_option_ids = null,
    numerical_answer    = null,
  } = payload;

  // Fetch question + marks config from test_questions
  const [[q]] = await pool.query(
    `SELECT q.question_id, q.question_type, q.correct_answer,
            q.explanation,
            tq.marks_correct, tq.marks_incorrect
     FROM questions q
     JOIN test_questions tq
       ON tq.question_id = q.question_id AND tq.test_id = ?
     WHERE q.question_id = ?`,
    [parseInt(testId), parseInt(questionId)]
  );
  if (!q) throw { status: 404, message: 'Question not found in this test' };

  // Correct options
  const [correctOpts] = await pool.query(
    `SELECT option_id, option_text
     FROM question_options
     WHERE question_id = ? AND is_correct = 1`,
    [parseInt(questionId)]
  );

  // All options (for feedback display)
  const [allOpts] = await pool.query(
    `SELECT option_id, option_text, option_image_url, is_correct
     FROM question_options
     WHERE question_id = ?
     ORDER BY option_id ASC`,
    [parseInt(questionId)]
  );

  // ── Grade ──────────────────────────────────────────────────────────────────
  let isCorrect    = false;
  let isPartial    = false;
  let marksObtained = 0;

  const marksCorrect   = Number(q.marks_correct   || 0);
  const marksIncorrect = Number(q.marks_incorrect  || 0);
  const correctIds     = correctOpts.map((o) => o.option_id);

  if (q.question_type === 'mcq') {
    isCorrect     = selected_option_id === correctIds[0];
    marksObtained = isCorrect
      ? marksCorrect
      : selected_option_id ? -marksIncorrect : 0;

  } else if (q.question_type === 'mcq_multi') {
    const selected = (
      Array.isArray(selected_option_ids)
        ? selected_option_ids
        : JSON.parse(selected_option_ids || '[]')
    ).map(Number).sort();
    const correct = correctIds.map(Number).sort();

    isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
    if (isCorrect) {
      marksObtained = marksCorrect;
    } else if (selected.length) {
      const goodPicks = selected.filter((id) => correct.includes(id));
      const badPicks  = selected.filter((id) => !correct.includes(id));
      if (!badPicks.length && goodPicks.length) {
        isPartial     = true;
        marksObtained = (marksCorrect / correct.length) * goodPicks.length;
      }
    }

  } else if (q.question_type === 'numerical') {
    isCorrect     = String(numerical_answer).trim() === String(q.correct_answer).trim();
    marksObtained = isCorrect
      ? marksCorrect
      : numerical_answer !== null ? -marksIncorrect : 0;
  }

  marksObtained = parseFloat(Number(marksObtained || 0).toFixed(2));

  // ── Upsert into attempt_answers ────────────────────────────────────────────
  await pool.query(
    `INSERT INTO attempt_answers
       (attempt_id, question_id,
        selected_option_id, selected_option_ids, numerical_answer,
        correct_option_id,  correct_option_ids,  correct_numerical,
        correct_option_text, selected_option_text,
        question_text_snapshot, all_options,
        is_correct, is_partial, marks_obtained)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       selected_option_id     = VALUES(selected_option_id),
       selected_option_ids    = VALUES(selected_option_ids),
       numerical_answer       = VALUES(numerical_answer),
       correct_option_id      = VALUES(correct_option_id),
       correct_option_ids     = VALUES(correct_option_ids),
       correct_numerical      = VALUES(correct_numerical),
       correct_option_text    = VALUES(correct_option_text),
       selected_option_text   = VALUES(selected_option_text),
       question_text_snapshot = VALUES(question_text_snapshot),
       all_options            = VALUES(all_options),
       is_correct             = VALUES(is_correct),
       is_partial             = VALUES(is_partial),
       marks_obtained         = VALUES(marks_obtained)`,
    [
      attemptId,
      questionId,
      selected_option_id,
      selected_option_ids ? JSON.stringify(selected_option_ids) : null,
      numerical_answer,
      correctIds[0] || null,
      JSON.stringify(correctIds),
      q.correct_answer,
      correctOpts[0]?.option_text || null,
      allOpts.find((o) => o.option_id === selected_option_id)?.option_text || null,
      q.question_text,
      JSON.stringify(allOpts),
      isCorrect ? 1 : 0,
      isPartial ? 1 : 0,
      marksObtained,
    ]
  );

  // ── Return instant feedback ────────────────────────────────────────────────
  return {
    questionId,
    question_id:      questionId,
    isCorrect,
    is_correct:       isCorrect ? 1 : 0,
    isPartial,
    is_partial:       isPartial ? 1 : 0,
    marksObtained,
    marks_obtained:   marksObtained,
    correctOptionId:  correctIds[0] || null,
    correct_option_id: correctIds[0] || null,
    correctOptionIds: correctIds,
    correct_option_ids: correctIds,
    correctOptionText: correctOpts[0]?.option_text || null,
    correct_option_text: correctOpts[0]?.option_text || null,
    correctNumerical: q.correct_answer || null,
    correct_numerical: q.correct_answer || null,
    explanation:  q.explanation,
    allOptions:   allOpts,
    all_options:  allOpts,
  };
};

// ─── Submit full test → finalise attempt ──────────────────────────────────────

export const submitPracticeAttempt = async (attemptId, testId, answers) => {
  // Grade each answer individually (upserts handle re-submissions)
  for (const ans of answers) {
    const questionId = ans.questionId ?? ans.question_id;
    if (!questionId) continue;
    await saveAnswerAndGetFeedback(attemptId, testId, questionId, {
      selected_option_id:  ans.selected_option_id  ?? null,
      selected_option_ids: ans.selected_option_ids ?? null,
      numerical_answer:    ans.numerical_answer    ?? null,
    });
  }

  // Compute final score from attempt_answers
  const [[scoreRow]] = await pool.query(
    `SELECT
       COUNT(*)                                   AS total,
       SUM(is_correct = 1)                        AS correct,
       SUM(is_correct = 0 AND marks_obtained < 0) AS wrong,
       SUM(is_correct = 0 AND marks_obtained = 0) AS skipped,
       SUM(marks_obtained)                        AS total_score
     FROM attempt_answers
     WHERE attempt_id = ?`,
    [parseInt(attemptId)]
  );

  const accuracy = scoreRow.total > 0
    ? parseFloat(((scoreRow.correct / scoreRow.total) * 100).toFixed(2))
    : 0;

  await pool.query(
    `UPDATE test_attempts SET
       status           = 'submitted',
       submitted_at     = NOW(),
       total_score      = ?,
       accuracy_percent = ?,
       time_taken_sec   = TIMESTAMPDIFF(SECOND, started_at, NOW())
     WHERE attempt_id = ?`,
    [scoreRow.total_score || 0, accuracy, parseInt(attemptId)]
  );

  return {
    totalQuestions: scoreRow.total,
    correct:        scoreRow.correct,
    wrong:          scoreRow.wrong,
    skipped:        scoreRow.skipped,
    totalScore:     scoreRow.total_score || 0,
    accuracy,
  };
};

// ─── Get attempt results with full review ─────────────────────────────────────

export const getAttemptResults = async (attemptId) => {
  const [[attempt]] = await pool.query(
    `SELECT ta.attempt_id, ta.test_id, ta.user_id, ta.status,
            ta.total_score, ta.accuracy_percent, ta.time_taken_sec,
            ta.started_at, ta.submitted_at,
            t.title, t.total_questions, t.total_marks, t.subject_id
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     WHERE ta.attempt_id = ?`,
    [parseInt(attemptId)]
  );
  if (!attempt) return null;

  const [answers] = await pool.query(
    `SELECT
       aa.question_id,
       COALESCE(aa.question_text_snapshot, q.question_text) AS question_text,
       aa.selected_option_id,
       aa.selected_option_ids,
       aa.numerical_answer,
       aa.correct_option_id,
       aa.correct_option_ids,
       aa.correct_numerical,
       aa.correct_option_text,
       aa.selected_option_text,
       aa.all_options,
       aa.is_correct,
       aa.is_partial,
       aa.marks_obtained,
       q.difficulty,
       q.question_type,
       q.explanation,
       q.hints,
       tq.sort_order,
       tq.module_id,
       sm.module_name AS chapter_name,
       cs.subject_name
     FROM attempt_answers aa
     JOIN questions q         ON q.question_id  = aa.question_id
     JOIN test_questions tq   ON tq.question_id = aa.question_id
                              AND tq.test_id     = ?
     -- ✅ Subject resolved through module_id — no global_subject_id
     LEFT JOIN subject_modules sm ON sm.module_id  = q.module_id
     LEFT JOIN course_subjects cs ON cs.subject_id = sm.subject_id AND cs.is_active = 1
     WHERE aa.attempt_id = ?
     ORDER BY tq.sort_order ASC`,
    [attempt.test_id, parseInt(attemptId)]
  );

  return {
    ...attempt,
    answers: answers.map((a) => ({
      ...a,
      all_options:         a.all_options         ? JSON.parse(a.all_options)         : [],
      selected_option_ids: a.selected_option_ids ? JSON.parse(a.selected_option_ids) : null,
      correct_option_ids:  a.correct_option_ids  ? JSON.parse(a.correct_option_ids)  : null,
    })),
  };
};

// ─── Summary across all practice tests ───────────────────────────────────────

export const getPracticeResultsSummary = async (userId) => {
  const [[overall]] = await pool.query(
    `SELECT
       COUNT(DISTINCT ta.attempt_id)      AS total_tests,
       SUM(aa.is_correct = 1)             AS total_correct,
       COUNT(aa.question_id)              AS total_questions,
       ROUND(AVG(ta.accuracy_percent), 2) AS avg_accuracy,
       SUM(ta.total_score)                AS total_score
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     WHERE ta.user_id = ? AND ta.status = 'submitted'`,
    [parseInt(userId)]
  );

  // Per-subject breakdown via module_id → subject_modules
  const [bySubject] = await pool.query(
    `SELECT sm.subject_id,
            cs.subject_name,
            COUNT(aa.question_id)      AS total,
            SUM(aa.is_correct = 1)     AS correct,
            ROUND(SUM(aa.is_correct = 1) / COUNT(aa.question_id) * 100, 2) AS accuracy
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id  = ta.attempt_id
     JOIN questions q        ON q.question_id  = aa.question_id
     JOIN subject_modules sm ON sm.module_id   = q.module_id
     LEFT JOIN course_subjects cs ON cs.subject_id = sm.subject_id AND cs.is_active = 1
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     GROUP BY sm.subject_id, cs.subject_name`,
    [parseInt(userId)]
  );

  // Weakest chapters (accuracy < 60%)
  const [weakChapters] = await pool.query(
    `SELECT q.module_id,
            sm.module_name,
            COUNT(aa.question_id)  AS total,
            SUM(aa.is_correct = 1) AS correct,
            ROUND(SUM(aa.is_correct = 1) / COUNT(aa.question_id) * 100, 2) AS accuracy
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     JOIN questions q        ON q.question_id = aa.question_id
     LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     GROUP BY q.module_id, sm.module_name
     HAVING accuracy < 60
     ORDER BY accuracy ASC
     LIMIT 5`,
    [parseInt(userId)]
  );

  return { overall, bySubject, weakChapters };
};

// ─── Hint fetcher ─────────────────────────────────────────────────────────────

export const getQuestionHint = async (attemptId, testId, questionId) => {
  const [[q]] = await pool.query(
    `SELECT q.hints
     FROM questions q
     JOIN test_questions tq ON tq.question_id = q.question_id
     WHERE tq.test_id = ? AND q.question_id = ?`,
    [parseInt(testId), parseInt(questionId)]
  );
  return { hint: q?.hints || null };
};

// ─── Insert question (admin/teacher) ──────────────────────────────────────────

export const insertQuestion = async (userId, data) => {
  const {
    moduleId, difficulty, questionType, questionText,
    marks, correctAnswer, explanation, hints,
    options = [],
  } = data;

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [result] = await conn.execute(
      `INSERT INTO questions
         (module_id, difficulty, question_type, question_text, marks,
          correct_answer, explanation, hints, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        parseInt(moduleId), difficulty, questionType,
        questionText, parseInt(marks),
        correctAnswer || null, explanation || null,
        hints || null, parseInt(userId),
      ]
    );
    const questionId = result.insertId;

    if (options.length) {
      const optVals = options.map((o) => [
        questionId,
        o.text || o.option_text,
        o.imageUrl || o.option_image_url || null,
        o.isCorrect || o.is_correct ? 1 : 0,
      ]);
      await conn.query(
        `INSERT INTO question_options
           (question_id, option_text, option_image_url, is_correct)
         VALUES ?`,
        [optVals]
      );
    }

    await conn.commit();
    return questionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const findQuestionById = async (questionId) => {
  const [[q]] = await pool.query(
    `SELECT q.*,
            sm.module_name AS chapter_name,
            cs.subject_name
     FROM questions q
     LEFT JOIN subject_modules sm ON sm.module_id  = q.module_id
     LEFT JOIN course_subjects cs ON cs.subject_id = sm.subject_id AND cs.is_active = 1
     WHERE q.question_id = ?`,
    [parseInt(questionId)]
  );
  if (!q) return null;

  const [options] = await pool.query(
    `SELECT option_id, option_text, option_image_url, is_correct
     FROM question_options
     WHERE question_id = ?
     ORDER BY option_id ASC`,
    [parseInt(questionId)]
  );

  return { ...q, options };
};

export const findSubjectById = async (subjectId) => {
  const [[row]] = await pool.query(
    `SELECT subject_id, subject_name, course_id
     FROM course_subjects
     WHERE subject_id = ? AND is_active = 1`,
    [parseInt(subjectId)]
  );
  return row || null;
};