/**
 * ============================================================
 * Shared Test Utility Model
 * ------------------------------------------------------------
 * Module  : Test Generator (Shared)
 * Author  : NDMATRIX
 * Description:
 * Shared database functions used by both Custom UG Test and
 * SME Test modules. Extracted from the dissolved UG Test module.
 * Import from here — do NOT duplicate these in other models.
 * ============================================================
 */
import pool from '../config/database.config.js';

// ─── Get exam pattern by exam_code ────────────────────────────
// In testUtils.model.js
export const findExamByCode = async (examCode) => {
  const [[row]] = await pool.query(
    `SELECT 
       category_id AS exam_id,
       exam_code,
       category_name AS exam_name,
       total_marks,
       total_questions,
       duration_mins,
       total_papers,
       has_partial_marking,
       notes,
       is_active
     FROM categories 
     WHERE exam_code = ? AND is_active = 1`,
    [examCode]
  );
  return row || null;
};

// ─── Get test by ID with questions and options ─────────────────
// NOTE: is_correct intentionally excluded — only shown in results
export const findTestById = async (testId) => {
  const [[test]] = await pool.query(
    `SELECT t.*, cat.category_name AS exam_name, cat.has_partial_marking
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.test_id = ? AND t.is_deleted = 0`,
    [parseInt(testId)]
  );
  if (!test) return null;

  const [questions] = await pool.query(
    `SELECT tq.question_id, tq.section_id, tq.marks_correct, tq.marks_incorrect,
       tq.question_type, tq.paper_number, tq.sort_order,
       q.question_text, q.difficulty,
       es.subject_name, es.section_name
     FROM test_questions tq
     JOIN questions q ON q.question_id = tq.question_id
     LEFT JOIN exam_sections es ON es.section_id = tq.section_id
     WHERE tq.test_id = ?
     ORDER BY tq.paper_number ASC, tq.sort_order ASC`,
    [parseInt(testId)]
  );

  const questionIds = questions.map(q => q.question_id);
  let optionsMap = {};

  if (questionIds.length > 0) {
    const [options] = await pool.query(
      `SELECT question_id, option_id, option_text
       FROM question_options
       WHERE question_id IN (?)
       ORDER BY option_id ASC`,
      [questionIds]
    );
    for (const opt of options) {
      if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
      optionsMap[opt.question_id].push({
        option_id: opt.option_id,
        option_text: opt.option_text
      });
    }
  }

  test.questions = questions.map(q => ({
    ...q,
    options: optionsMap[q.question_id] || [],
  }));

  return test;
};

// ─── Create a test attempt ─────────────────────────────────────
export const createAttempt = async (testId, userId, paperNumber = 1) => {
  const [[testRow]] = await pool.query(
    `SELECT t.exam_id, cat.category_name AS exam_name
     FROM tests t
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE t.test_id = ?`,
    [parseInt(testId)]
  );

  const [[{ attempt_count }]] = await pool.query(
    `SELECT COUNT(*) AS attempt_count FROM test_attempts
     WHERE test_id = ? AND user_id = ?`,
    [parseInt(testId), parseInt(userId)]
  );
  const attemptNumber = parseInt(attempt_count) + 1;

  const [result] = await pool.query(
    `INSERT INTO test_attempts
      (test_id, exam_id, exam_name, attempt_number, paper_number, user_id, started_at, status)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), 'in_progress')`,
    [
      parseInt(testId),
      testRow?.exam_id || null,
      testRow?.exam_name || null,
      attemptNumber,
      parseInt(paperNumber),
      parseInt(userId),
    ]
  );
  return result.insertId;
};

// ─── Find attempt by ID ────────────────────────────────────────
export const findAttemptById = async (attemptId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_attempts WHERE attempt_id = ?`,
    [parseInt(attemptId)]
  );
  return row || null;
};

// ─── Find active in-progress attempt ──────────────────────────
export const findActiveAttempt = async (testId, userId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status = 'in_progress'`,
    [parseInt(testId), parseInt(userId)]
  );
  return row || null;
};

// ─── Submit attempt with full scoring engine ───────────────────
// Supports MCQ single, MCQ multi, NAT, match list
// Stores full snapshots: question text, correct answer, options
export const submitAttempt = async (attemptId, testId, answers) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Get question data per test
    const [questionData] = await connection.query(
      `SELECT DISTINCT tq.question_id, tq.marks_correct, tq.marks_incorrect, tq.question_type
       FROM test_questions tq
       WHERE tq.test_id = ?`,
      [parseInt(testId)]
    );

    const questionIds = questionData.map(r => r.question_id);

    // Get question text, correct_answer (NAT), explanation
    let questionMetaMap = {};
    if (questionIds.length > 0) {
      const [questionMeta] = await connection.query(
        `SELECT question_id, question_text, correct_answer, explanation, question_type
         FROM questions WHERE question_id IN (?)`,
        [questionIds]
      );
      for (const q of questionMeta) questionMetaMap[q.question_id] = q;
    }

    // Get all correct options per question
    const [correctOptions] = await connection.query(
      `SELECT question_id, option_id, option_text
       FROM question_options
       WHERE question_id IN (?) AND is_correct = 1
       ORDER BY option_id ASC`,
      [questionIds]
    );
    const correctOptionsMap = {};
    for (const opt of correctOptions) {
      if (!correctOptionsMap[opt.question_id]) correctOptionsMap[opt.question_id] = [];
      correctOptionsMap[opt.question_id].push({ option_id: opt.option_id, option_text: opt.option_text });
    }

    // Get all options for snapshot
    const [allOptions] = await connection.query(
      `SELECT question_id, option_id, option_text
       FROM question_options WHERE question_id IN (?)`,
      [questionIds]
    );
    const optionTextMap = {};
    const allOptionsMap = {};
    for (const opt of allOptions) {
      optionTextMap[opt.option_id] = opt.option_text;
      if (!allOptionsMap[opt.question_id]) allOptionsMap[opt.question_id] = [];
      allOptionsMap[opt.question_id].push({ option_id: opt.option_id, option_text: opt.option_text });
    }

    // Build question map
    const questionMap = {};
    for (const row of questionData) {
      const correctOpts = correctOptionsMap[row.question_id] || [];
      questionMap[row.question_id] = {
        marks_correct: parseFloat(row.marks_correct),
        marks_incorrect: parseFloat(row.marks_incorrect),
        question_type: row.question_type,
        correct_option_ids: correctOpts.map(o => o.option_id),
        correct_option_texts: correctOpts.map(o => o.option_text),
      };
    }

    let totalScore = 0;
    let correctCount = 0;
    const answerRows = [];

    const submittedAnswerMap = {};
    for (const answer of answers) submittedAnswerMap[answer.question_id] = answer;

    for (const questionId of questionIds) {
      const q = questionMap[questionId];
      if (!q) continue;

      const meta = questionMetaMap[questionId] || {};
      const answer = submittedAnswerMap[questionId] || null;

      let marksObtained = 0;
      let isCorrect = 0;
      let isPartial = 0;

      const dbType = meta.question_type || q.question_type;
      const isNat = dbType === 'numerical' || q.question_type === 'nat';

      if (answer) {
        if (isNat) {
          if (answer.numerical_answer !== undefined && answer.numerical_answer !== null) {
            isCorrect = parseFloat(answer.numerical_answer) === parseFloat(meta.correct_answer) ? 1 : 0;
            marksObtained = isCorrect ? q.marks_correct : 0;
          }
        } else if (q.question_type === 'mcq_multi') {
          const selected = answer.selected_option_ids || [];
          const correct = q.correct_option_ids;
          const correctSelected = selected.filter(id => correct.includes(id)).length;
          const wrongSelected = selected.filter(id => !correct.includes(id)).length;
          if (wrongSelected > 0) {
            marksObtained = q.marks_incorrect;
          } else if (correctSelected === correct.length) {
            isCorrect = 1;
            marksObtained = q.marks_correct;
          } else if (correctSelected > 0) {
            isPartial = 1;
            marksObtained = correctSelected;
          }
        } else {
          isCorrect = answer.selected_option_id && answer.selected_option_id === q.correct_option_ids[0] ? 1 : 0;
          if (isCorrect) {
            marksObtained = q.marks_correct;
          } else if (answer.selected_option_id) {
            marksObtained = q.marks_incorrect;
          }
        }
        totalScore += marksObtained;
        if (isCorrect) correctCount++;
      }

      const correctOptionText = q.correct_option_texts.length > 0
        ? q.correct_option_texts.join(' | ')
        : null;
      const correctOptionIdsJson = q.correct_option_ids.length > 1
        ? JSON.stringify(q.correct_option_ids)
        : null;
      const correctOptionIdSingle = q.correct_option_ids.length === 1
        ? q.correct_option_ids[0]
        : null;
      const selectedOptionText = answer && answer.selected_option_id
        ? (optionTextMap[answer.selected_option_id] || null)
        : null;
      const allOptionsSnapshot = allOptionsMap[questionId]
        ? JSON.stringify(allOptionsMap[questionId])
        : null;

      answerRows.push([
        parseInt(attemptId),
        parseInt(questionId),
        answer && answer.selected_option_id ? parseInt(answer.selected_option_id) : null,
        answer && answer.selected_option_ids ? JSON.stringify(answer.selected_option_ids) : null,
        correctOptionIdSingle,
        correctOptionIdsJson,
        isNat ? (meta.correct_answer || null) : null,
        selectedOptionText,
        correctOptionText,
        meta.question_text || null,
        allOptionsSnapshot,
        answer && answer.numerical_answer !== undefined ? (answer.numerical_answer || null) : null,
        isCorrect,
        isPartial,
        marksObtained,
      ]);
    }

    await connection.query(
      `INSERT INTO attempt_answers
        (attempt_id, question_id,
         selected_option_id, selected_option_ids,
         correct_option_id, correct_option_ids, correct_numerical,
         selected_option_text, correct_option_text, question_text_snapshot,
         all_options,
         numerical_answer,
         is_correct, is_partial, marks_obtained)
       VALUES ?`,
      [answerRows]
    );

    const accuracy = answers.length > 0
      ? ((correctCount / answers.length) * 100).toFixed(2)
      : 0;

    await connection.query(
      `UPDATE test_attempts
       SET status = 'submitted', submitted_at = NOW(),
           total_score = ?, accuracy_percent = ?
       WHERE attempt_id = ?`,
      [totalScore, accuracy, parseInt(attemptId)]
    );

    await connection.commit();
    return { totalScore, accuracy, correctCount, totalQuestions: answers.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Get detailed results for an attempt ──────────────────────
// NOTE: is_correct IS shown here — results endpoint only
export const getAttemptResults = async (attemptId) => {
  const [[attempt]] = await pool.query(
    `SELECT ta.*, t.title, t.total_marks, t.duration_minutes, t.exam_type,
       cat.category_name AS exam_name, cat.has_partial_marking
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     LEFT JOIN categories cat ON cat.category_id = t.exam_id
     WHERE ta.attempt_id = ?`,
    [parseInt(attemptId)]
  );
  if (!attempt) return null;

  const [answers] = await pool.query(
    `SELECT
     tq.question_id,
     q.question_text,
     q.question_type,
     q.difficulty,
     q.explanation,

     tq.marks_correct,
     tq.marks_incorrect,
     tq.section_id,
     es.subject_name,
     es.section_name,
     tq.sort_order,

     aa.selected_option_id,
     aa.selected_option_ids,
     aa.selected_option_text,
     aa.numerical_answer,

     aa.correct_option_id,
     aa.correct_option_ids,
     aa.correct_numerical,
     aa.correct_option_text,

     aa.is_correct,
     aa.is_partial,
     aa.marks_obtained,

     opt.options,  -- ✅ pre-aggregated options

     CASE
       WHEN aa.question_id IS NULL THEN 'not_answered'
       WHEN aa.selected_option_id IS NULL
         AND aa.selected_option_ids IS NULL
         AND aa.numerical_answer IS NULL THEN 'not_answered'
       ELSE 'answered'
     END AS answer_status

   FROM test_questions tq

   JOIN questions q 
     ON q.question_id = tq.question_id

   LEFT JOIN exam_sections es 
     ON es.section_id = tq.section_id

   LEFT JOIN attempt_answers aa
     ON aa.question_id = tq.question_id 
     AND aa.attempt_id = ?

   -- ✅ OPTIMIZED: pre-aggregate options once
   LEFT JOIN (
     SELECT 
       qo.question_id,
       JSON_ARRAYAGG(
         JSON_OBJECT(
           'option_id', qo.option_id,
           'option_text', qo.option_text,
           'is_correct', qo.is_correct
         )
       ) AS options
     FROM question_options qo
     GROUP BY qo.question_id
   ) opt 
     ON opt.question_id = tq.question_id

   WHERE tq.test_id = ?

   ORDER BY tq.sort_order ASC`,
    [parseInt(attemptId), parseInt(attempt.test_id)]
  );

  return { ...attempt, answers };
};
