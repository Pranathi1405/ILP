// /**
//  * ============================================================
//  * Practice Test Model
//  * ------------------------------------------------------------
//  * Module  : Test Generator - Practice Test Engine
//  * Author  : Sathvik Goli
//  * Description:
//  * Handles all database interactions for self-prepared practice
//  * tests. User selects subject, chapters, question types,
//  * difficulty, count, and hint delay. Instant per-question
//  * feedback is supported — answers are saved one at a time.
//  * ============================================================
//  */

// import pool from '../config/database.config.js';

export const findSubjectById = async (subjectId) => {
  const [[row]] = await pool.query(
    `SELECT subject_id, subject_name, course_id
     FROM course_subjects
     WHERE subject_id = ? AND is_active = 1`,
    [parseInt(subjectId)]
  );
  return row || null;
};

// export const insertQuestion = async (userId, data) => {
//   const {
//     subject_id,
//     module_id,
//     difficulty,
//     question_type,
//     question_text,
//     marks,
//     correct_answer = null,   // for numerical / subjective
//     explanation   = null,
//     hints         = null,
//     options       = [],      // [{ option_text, option_image_url?, is_correct }]
//   } = data;

//   console.log("Data form model is :",data);
//   // ── Validate required fields ──────────────────────────────
//   // if (!subject_id)     throw { status: 400, message: 'subject_id is required' };
//   if (!module_id)     throw { status: 400, message: 'module_id is required' };
//   if (!difficulty)     throw { status: 400, message: 'difficulty is required (easy | medium | hard)' };
//   if (!question_type)  throw { status: 400, message: 'question_type is required' };
//   if (!question_text?.trim()) throw { status: 400, message: 'question_text is required' };
//   if (!marks)          throw { status: 400, message: 'marks is required' };

//   const isMcq = ['mcq', 'mcq_multi', 'match_list'].includes(question_type);

//   if (isMcq) {
//     if (!options.length) {
//       throw { status: 400, message: 'options are required for MCQ / match_list questions' };
//     }
//     const hasCorrect = options.some((o) => o.is_correct);
//     if (!hasCorrect) {
//       throw { status: 400, message: 'At least one option must be marked as correct' };
//     }
//   }

//   if (question_type === 'numerical' && !correct_answer) {
//     throw { status: 400, message: 'correct_answer is required for numerical questions' };
//   }

//   const connection = await pool.getConnection();
//   await connection.beginTransaction();

//   try {
//     // 1. Insert question row
//     const [result] = await connection.query(
//       `INSERT INTO questions
//         ( subject_id, module_id, difficulty, question_type,
//          question_text, marks, correct_answer, explanation, hints,
//          created_by, is_manual)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
//       [
//         subject_id ? parseInt(subject_id) : null,
//         parseInt(module_id),
//         difficulty,
//         question_type,
//         question_text.trim(),
//         parseInt(marks),
//         correct_answer || null,
//         explanation   || null,
//         hints         || null,
//         parseInt(userId),
//       ],
//     );
//     console.log("result arraey is :",result);
//     const questionId = result.insertId;

//     // 2. Insert options (MCQ / mcq_multi / match_list only)
//     if (options.length > 0) {
//       const optionValues = options.map((o) => [
//         questionId,
//         o.option_text,
//         o.option_image_url || null,
//         o.is_correct ? 1 : 0,
//       ]);

//       await connection.query(
//         `INSERT INTO question_options
//           (question_id, option_text, option_image_url, is_correct)
//          VALUES ?`,
//         [optionValues],
//       );
//     }

//     await connection.commit();
//     return questionId;
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     connection.release();
//   }
// };

// /**
//  * Fetch the inserted question with its options — returned in the response.
//  */
// export const findQuestionById = async (questionId) => {
//   const [[question]] = await pool.query(
//     `SELECT q.*, gs.subject_name, sm.module_name AS chapter_name
//      FROM questions q
//      LEFT JOIN global_subjects gs ON gs.subject_id = q.subject_id
//      LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
//      WHERE q.question_id = ?`,
//     [parseInt(questionId)],
//   );
//   if (!question) return null;

//   const [options] = await pool.query(
//     `SELECT option_id, option_text, option_image_url, is_correct
//      FROM question_options
//      WHERE question_id = ?
//      ORDER BY option_id ASC`,
//     [parseInt(questionId)],
//   );

//   return { ...question, options };
// };

// // questions table     : 'mcq' | 'mcq_multi' | 'numerical' | 'match_list'
// // test_questions ENUM : 'mcq_single' | 'mcq_multi' | 'nat' | 'match_list'
// const DB_TO_TQ = {
//   mcq: 'mcq_single',
//   mcq_multi: 'mcq_multi',
//   numerical: 'nat',
//   match_list: 'match_list',
// };

// // Reverse map — used when scoring (tq.question_type → logic branch)
// const TQ_TO_DB = {
//   mcq_single: 'mcq',
//   mcq_multi: 'mcq_multi',
//   nat: 'numerical',
//   match_list: 'match_list',
// };

// // ─── Question availability ─────────────────────────────────────

// export const countAvailableQuestions = async ({
//   globalSubjectId,
//   questionTypes = [],   // DB-side types: 'mcq', 'numerical', etc.
//   difficulty = null,
//   globalModuleId = [],
// }) => {
//   const where  = [];
//   const params = [];

//   // always required
//   where.push(`q.is_active = 1`);
//   where.push(`q.subject_id = ?`);
//   params.push(parseInt(globalSubjectId));

//   where.push(`q.difficulty = ?`);
//   params.push(difficulty);

//   if (questionTypes.length > 0) {
//     conditions.push(`question_type IN (${questionTypes.map(() => '?').join(',')})`);
//     params.push(...questionTypes);
//   }
//   if (difficulty) {
//     conditions.push('difficulty = ?');
//     params.push(difficulty);
//   }
//   if (chapterIds.length > 0) {
//     conditions.push(`module_id IN (${chapterIds.map(() => '?').join(',')})`);
//     params.push(...chapterIds.map((id) => parseInt(id)));
//   }

//   //check if it chapter or subject wise
//   if (globalModuleId.length > 0) {
//     where.push(`q.global_module_id IN (?)`);
//     params.push(globalModuleId.map(Number));
//   }

//   const whereClause = where.join('\n  AND ');
//   const query = `
//     SELECT COUNT(*) AS total
//     FROM questions q
//     WHERE ${whereClause}
//   `;

//   const [[{ total }]] = await pool.query(query, params);
//   return total;
// };

// export const getGlobalSubjectId = async(subjectId) =>{
//   const [rows] = await pool.query(`SELECT subject_id FROM course_subjects WHERE subject_id = ?`, [subjectId]);
//   return rows[0].subject_id;
// }

// export const getGlobalModuleId = async(moduleId) => {
//   const [rows] = await pool.query(`SELECT global_module_id FROM subject_modules WHERE module_id = ?`,[moduleId]);
//   return rows[0].global_module_id;
// }

// export const fetchPracticeQuestions = async ({
//   globalSubjectId,
//   questionTypes = [],
//   difficulty = null,
//   globalModuleId = [],
//   limit
// }) => {
//   const conditions = ['q.is_active = 1', 'q.subject_id = ?'];
//   const params = [parseInt(globalSubjectId)];

//   if (questionTypes.length > 0) {
//     conditions.push(`q.question_type IN (${questionTypes.map(() => '?').join(',')})`);
//     params.push(...questionTypes);
//   }
//   if (difficulty) {
//     conditions.push('q.difficulty = ?');
//     params.push(difficulty);
//   }
//   if (globalModuleId.length > 0) {
//     conditions.push(`q.global_module_id IN (${globalModuleId.map(() => '?').join(',')})`);
//     params.push(...moduleId.map((id) => parseInt(id)));
//   }
//   // if (excludeIds.length > 0) {
//   //   conditions.push(`q.question_id NOT IN (${excludeIds.map(() => '?').join(',')})`);
//   //   params.push(...excludeIds.map((id) => parseInt(id)));
//   // }

//   const [rows] = await pool.query(
//     `SELECT q.question_id, q.question_text, q.question_type, q.difficulty,
//             q.question_image_url, q.image_position,
//             q.paragraph_id, p.paragraph_text, p.paragraph_image_url
//      FROM questions q
//      LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
//      WHERE ${conditions.join(' AND ')}
//      ORDER BY RAND()
//      LIMIT ${parseInt(limit)}`,
//     params,
//   );

//   if (!rows.length) return [];

//   const questionIds = rows.map((q) => q.question_id);
//   const [options] = await pool.query(
//     `SELECT question_id, option_id, option_text, option_image_url
//      FROM question_options WHERE question_id IN (?) ORDER BY option_id ASC`,
//     [questionIds],
//   );

//   const optionsMap = {};
//   for (const opt of options) {
//     if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
//     optionsMap[opt.question_id].push({
//       option_id: opt.option_id,
//       option_text: opt.option_text,
//       option_image_url: opt.option_image_url || null,
//     });
//   }

//   return rows.map((q) => ({ ...q, options: optionsMap[q.question_id] || [] }));
// };

// // ─── Test creation ─────────────────────────────────────────────

// /**
//  * FIX 1: test_type = 'custom'  (ENUM doesn't have 'practice')
//  * FIX 1: exam_type = 'practice' (varchar — used to filter practice tests)
//  * FIX 1: mode     = 'custom'
//  * FIX 3: no notes column — removed
//  */
// export const createPracticeTest = async (
//   connection,
//   {subjectId, created_by, title, totalQuestions, totalMarks },
// ) => {
//   const [result] = await connection.query(
//     `INSERT INTO tests
//       (subject_id, exam_id, exam_type, paper_number, created_by, test_type, question_source, negative_marking, title, total_questions, total_marks, duration_minutes)
//      VALUES (?, 100, 'practice', 100, ?, 'practice', 'qb', 1, ?, ?, ?, 300)`,
//     [
//       subjectId,
//       created_by,
//       title,
//       parseInt(totalQuestions),
//       Math.round(parseFloat(totalMarks))   // total_marks is INT in schema
//     ],
//   );
//   return result.insertId;
// };
// // export const createPracticeTest = async (
// //   connection,
// //   { userId, title, totalQuestions, totalMarks, duration, negativeMarking },
// // ) => {
// //   const [result] = await connection.query(
// //     `INSERT INTO tests
// //       (created_by, test_type, mode, exam_type, title,
// //        total_questions, total_marks, duration_minutes, negative_marking)
// //      VALUES (?, 'custom', 'custom', 'practice', ?, ?, ?, ?, ?)`,
// //     [
// //       parseInt(userId),
// //       title,
// //       parseInt(totalQuestions),
// //       Math.round(parseFloat(totalMarks)),   // total_marks is INT in schema
// //       parseInt(duration),
// //       negativeMarking ? 1 : 0,
// //     ],
// //   );
// //   return result.insertId;
// // };
// /**
//  * FIX 2: DB_TO_TQ converts q.question_type ('mcq','numerical')
//  *         to test_questions ENUM ('mcq_single','nat')
//  * FIX 4: no module_id column — removed from INSERT
//  */
// export const insertPracticeTestQuestions = async (connection, testId, questions) => {
//   const values = questions.map((q) => [
//     parseInt(testId),
//     parseInt(q.question_id),
//     'qb',                                          // source ENUM
//     Math.round(parseFloat(q.marks_correct)),       // marks INT col
//     null,                                          // section_id NULL for practice
//     parseFloat(q.marks_correct),
//     parseFloat(q.marks_incorrect),
//     DB_TO_TQ[q.question_type] || 'mcq_single',    // FIX 2
//     1,                                             // paper_number
//     q.sort_order,
//   ]);

//   await connection.query(
//     `INSERT INTO test_questions
//       (test_id, question_id, source, marks, section_id,
//        marks_correct, marks_incorrect, question_type, paper_number, sort_order)
//      VALUES ?`,
//     [values],
//   );
// };

// // ─── Test retrieval ────────────────────────────────────────────

// export const findPracticeTestsByUser = async (userId, { page = 1, limit = 10 } = {}) => {
//   const offset = (parseInt(page) - 1) * parseInt(limit);

//   const [[{ total }]] = await pool.query(
//     `SELECT COUNT(*) AS total FROM tests
//      WHERE created_by = ? AND test_type = 'custom'
//        AND exam_type = 'practice' AND is_deleted = 0`,
//     [parseInt(userId)],
//   );

//   const [rows] = await pool.query(
//     `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
//             t.negative_marking, t.created_at,
//             ta.attempt_id, ta.status AS attempt_status,
//             ta.total_score, ta.accuracy_percent, ta.submitted_at
//      FROM tests t
//      LEFT JOIN test_attempts ta ON ta.test_id = t.test_id AND ta.user_id = ?
//      WHERE t.created_by = ? AND t.test_type = 'custom'
//        AND t.exam_type = 'practice' AND t.is_deleted = 0
//      ORDER BY t.created_at DESC
//      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
//     [parseInt(userId), parseInt(userId)],
//   );

//   return {
//     data: rows,
//     pagination: {
//       total: Number(total),
//       page: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(Number(total) / parseInt(limit)),
//     },
//   };
// };

// export const findPracticeTestById = async (testId) => {
//   const [[test]] = await pool.query(
//     `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
//             t.negative_marking
//      FROM tests t
//      WHERE t.test_id = ? AND t.exam_type = 'practice' AND t.is_deleted = 0`,
//     [parseInt(testId)],
//   );
//   if (!test) return null;

//   const [questions] = await pool.query(
//     `SELECT tq.question_id, tq.marks_correct, tq.marks_incorrect,
//             tq.question_type, tq.sort_order, q.module_id,
//             q.question_text, q.difficulty, q.question_image_url,
//             q.image_position, q.paragraph_id,
//             p.paragraph_text, p.paragraph_image_url,
//             gs.subject_name, sm.module_name AS chapter_name
//      FROM test_questions tq
//      JOIN questions q ON q.question_id = tq.question_id
//      LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
//      LEFT JOIN global_subjects gs ON gs.subject_id = q.subject_id
//      LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
//      WHERE tq.test_id = ?
//      ORDER BY tq.sort_order ASC`,
//     [parseInt(testId)],
//   );

//   const questionIds = questions.map((q) => q.question_id);
//   const optionsMap = {};

//   if (questionIds.length > 0) {
//     const [options] = await pool.query(
//       `SELECT question_id, option_id, option_text, option_image_url
//        FROM question_options WHERE question_id IN (?) ORDER BY option_id ASC`,
//       [questionIds],
//     );
//     for (const opt of options) {
//       if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
//       optionsMap[opt.question_id].push({
//         option_id: opt.option_id,
//         option_text: opt.option_text,
//         option_image_url: opt.option_image_url || null,
//       });
//     }
//   }

//   test.questions = questions.map((q) => ({
//     ...q,
//     options: optionsMap[q.question_id] || [],
//   }));
//   return test;
// };

// // ─── Attempt management ────────────────────────────────────────

// export const createAttempt = async (testId, userId) => {
//   const [[{ attempt_count }]] = await pool.query(
//     `SELECT COUNT(*) AS attempt_count FROM test_attempts
//      WHERE test_id = ? AND user_id = ?`,
//     [parseInt(testId), parseInt(userId)],
//   );
//   const [result] = await pool.query(
//     `INSERT INTO test_attempts
//       (test_id, attempt_number, paper_number, user_id, started_at, status)
//      VALUES (?, ?, 1, ?, NOW(), 'in_progress')`,
//     [parseInt(testId), parseInt(attempt_count) + 1, parseInt(userId)],
//   );
//   return result.insertId;
// };

// export const findAttemptById = async (attemptId) => {
//   const [[row]] = await pool.query(
//     `SELECT * FROM test_attempts WHERE attempt_id = ?`,
//     [parseInt(attemptId)],
//   );
//   return row || null;
// };

// export const findActiveAttempt = async (testId, userId) => {
//   const [[row]] = await pool.query(
//     `SELECT * FROM test_attempts
//      WHERE test_id = ? AND user_id = ? AND status = 'in_progress'`,
//     [parseInt(testId), parseInt(userId)],
//   );
//   return row || null;
// };

// // ─── Submit + score (same logic as Ugtest.model.js) ────────────

// export const submitPracticeAttempt = async (attemptId, testId, answers) => {
//   const connection = await pool.getConnection();
//   await connection.beginTransaction();

//   try {
//     const [questionData] = await connection.query(
//       `SELECT DISTINCT tq.question_id, tq.marks_correct, tq.marks_incorrect, tq.question_type
//        FROM test_questions tq WHERE tq.test_id = ?`,
//       [parseInt(testId)],
//     );

//     const questionIds = questionData.map((r) => r.question_id);
//     const questionMetaMap = {};

//     if (questionIds.length > 0) {
//       const [meta] = await connection.query(
//         `SELECT question_id, question_text, correct_answer, explanation, question_type
//          FROM questions WHERE question_id IN (?)`,
//         [questionIds],
//       );
//       for (const q of meta) questionMetaMap[q.question_id] = q;
//     }

//     const [correctOptions] = await connection.query(
//       `SELECT question_id, option_id, option_text FROM question_options
//        WHERE question_id IN (?) AND is_correct = 1 ORDER BY option_id ASC`,
//       [questionIds],
//     );
//     const correctOptionsMap = {};
//     for (const opt of correctOptions) {
//       if (!correctOptionsMap[opt.question_id]) correctOptionsMap[opt.question_id] = [];
//       correctOptionsMap[opt.question_id].push({ option_id: opt.option_id, option_text: opt.option_text });
//     }

//     const [allOptions] = await connection.query(
//       `SELECT question_id, option_id, option_text FROM question_options WHERE question_id IN (?)`,
//       [questionIds],
//     );
//     const optionTextMap = {};
//     const allOptionsMap = {};
//     for (const opt of allOptions) {
//       optionTextMap[opt.option_id] = opt.option_text;
//       if (!allOptionsMap[opt.question_id]) allOptionsMap[opt.question_id] = [];
//       allOptionsMap[opt.question_id].push({ option_id: opt.option_id, option_text: opt.option_text });
//     }

//     const questionMap = {};
//     for (const row of questionData) {
//       const correctOpts = correctOptionsMap[row.question_id] || [];
//       // FIX 2: tq stores 'mcq_single'/'nat' — convert back for scoring logic
//       const dbType = TQ_TO_DB[row.question_type] || row.question_type;
//       questionMap[row.question_id] = {
//         marks_correct: parseFloat(row.marks_correct),
//         marks_incorrect: parseFloat(row.marks_incorrect),
//         question_type: dbType,
//         correct_option_ids: correctOpts.map((o) => o.option_id),
//         correct_option_texts: correctOpts.map((o) => o.option_text),
//       };
//     }

//     let totalScore = 0;
//     let correctCount = 0;
//     const answerRows = [];
//     const submittedMap = {};
//     for (const a of answers) submittedMap[a.question_id] = a;

//     for (const questionId of questionIds) {
//       const q = questionMap[questionId];
//       if (!q) continue;
//       const meta = questionMetaMap[questionId] || {};
//       const answer = submittedMap[questionId] || null;

//       let marksObtained = 0, isCorrect = 0, isPartial = 0;
//       const isNat = q.question_type === 'numerical';

//       if (answer) {
//         if (isNat) {
//           if (answer.numerical_answer !== undefined && answer.numerical_answer !== null) {
//             isCorrect = parseFloat(answer.numerical_answer) === parseFloat(meta.correct_answer) ? 1 : 0;
//             marksObtained = isCorrect ? q.marks_correct : 0;
//           }
//         } else if (q.question_type === 'mcq_multi') {
//           const selected = answer.selected_option_ids || [];
//           const correct = q.correct_option_ids;
//           const correctSelected = selected.filter((id) => correct.includes(id)).length;
//           const wrongSelected = selected.filter((id) => !correct.includes(id)).length;
//           if (wrongSelected > 0) { marksObtained = q.marks_incorrect; }
//           else if (correctSelected === correct.length) { isCorrect = 1; marksObtained = q.marks_correct; }
//           else if (correctSelected > 0) { isPartial = 1; marksObtained = correctSelected; }
//         } else {
//           isCorrect = answer.selected_option_id && answer.selected_option_id === q.correct_option_ids[0] ? 1 : 0;
//           marksObtained = isCorrect ? q.marks_correct : answer.selected_option_id ? q.marks_incorrect : 0;
//         }
//         totalScore += marksObtained;
//         if (isCorrect) correctCount++;
//       }

//       answerRows.push([
//         parseInt(attemptId), parseInt(questionId),
//         answer?.selected_option_id ? parseInt(answer.selected_option_id) : null,
//         answer?.selected_option_ids ? JSON.stringify(answer.selected_option_ids) : null,
//         q.correct_option_ids.length === 1 ? q.correct_option_ids[0] : null,
//         q.correct_option_ids.length > 1 ? JSON.stringify(q.correct_option_ids) : null,
//         isNat ? (meta.correct_answer || null) : null,
//         answer?.selected_option_id ? (optionTextMap[answer.selected_option_id] || null) : null,
//         q.correct_option_texts.length > 0 ? q.correct_option_texts.join(' | ') : null,
//         meta.question_text || null,
//         allOptionsMap[questionId] ? JSON.stringify(allOptionsMap[questionId]) : null,
//         answer?.numerical_answer !== undefined ? (answer.numerical_answer || null) : null,
//         isCorrect, isPartial, marksObtained,
//       ]);
//     }

//     await connection.query(
//       `INSERT INTO attempt_answers
//         (attempt_id, question_id, selected_option_id, selected_option_ids,
//          correct_option_id, correct_option_ids, correct_numerical,
//          selected_option_text, correct_option_text, question_text_snapshot,
//          all_options, numerical_answer, is_correct, is_partial, marks_obtained)
//        VALUES ?`,
//       [answerRows],
//     );

//     const accuracy = answers.length > 0
//       ? ((correctCount / answers.length) * 100).toFixed(2) : '0.00';

//     await connection.query(
//       `UPDATE test_attempts
//        SET status='submitted', submitted_at=NOW(), total_score=?, accuracy_percent=?
//        WHERE attempt_id=?`,
//       [totalScore, accuracy, parseInt(attemptId)],
//     );

//     await connection.commit();
//     return { totalScore, accuracy, correctCount, totalQuestions: questionIds.length };
//   } catch (err) {
//     await connection.rollback();
//     throw err;
//   } finally {
//     connection.release();
//   }
// };

// // ─── Results ───────────────────────────────────────────────────

// export const getAttemptResults = async (attemptId) => {
//   const [[attempt]] = await pool.query(
//     `SELECT ta.*, t.title, t.total_mark, t.negative_marking
//      FROM test_attempts ta
//      JOIN tests t ON t.test_id = ta.test_id
//      WHERE ta.attempt_id = ?`,
//     [parseInt(attemptId)],
//   );
//   if (!attempt) return null;

//   const [answers] = await pool.query(
//     `SELECT tq.question_id, tq.sort_order, tq.marks_correct, tq.marks_incorrect,
//             tq.question_type,
//             q.question_text, q.difficulty, q.question_image_url,
//             q.image_position, q.paragraph_id, q.explanation, q.hints,
//             p.paragraph_text, p.paragraph_image_url,
//             gs.subject_name, sm.module_name AS chapter_name,
//             aa.selected_option_id, aa.selected_option_ids,
//             aa.selected_option_text, aa.numerical_answer,
//             aa.correct_option_id, aa.correct_option_ids,
//             aa.correct_numerical, aa.correct_option_text,
//             aa.all_options, aa.is_correct, aa.is_partial, aa.marks_obtained,
//             CASE
//               WHEN aa.question_id IS NULL THEN 'not_answered'
//               WHEN aa.selected_option_id IS NULL
//                    AND aa.selected_option_ids IS NULL
//                    AND aa.numerical_answer IS NULL THEN 'not_answered'
//               ELSE 'answered'
//             END AS answer_status
//      FROM test_questions tq
//      JOIN questions q ON q.question_id = tq.question_id
//      LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
//      LEFT JOIN global_subjects gs ON gs.subject_id = q.subject_id
//      LEFT JOIN subject_modules sm ON sm.module_id = q.module_id
//      LEFT JOIN attempt_answers aa
//        ON aa.question_id = tq.question_id AND aa.attempt_id = ?
//      WHERE tq.test_id = ?
//      ORDER BY tq.sort_order ASC`,
//     [parseInt(attemptId), parseInt(attempt.test_id)],
//   );

//   return {
//     ...attempt,
//     answers: answers.map((a) => ({
//       ...a,
//       all_options: a.all_options ? JSON.parse(a.all_options) : [],
//       selected_option_ids: a.selected_option_ids ? JSON.parse(a.selected_option_ids) : null,
//       correct_option_ids: a.correct_option_ids ? JSON.parse(a.correct_option_ids) : null,
//     })),
//   };
// };

import pool from '../config/database.config.js';

export const findStudentCourseAccess = async (userId, courseId) => {
  const [[row]] = await pool.query(
    `SELECT c.course_id, c.course_name
     FROM students st
     JOIN course_enrollments ce
       ON ce.student_id = st.student_id
     JOIN courses c
       ON c.course_id = ce.course_id
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
    JOIN course_enrollments ce
      ON ce.student_id = st.student_id
    JOIN course_subjects cs
      ON cs.course_id = ce.course_id
    WHERE st.user_id = ?
      AND cs.subject_id = ?
      AND cs.is_active = 1
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
  if (!Array.isArray(moduleIds) || !moduleIds.length) {
    return 0;
  }

  const cleanModuleIds = moduleIds
    .map((id) => parseInt(id))
    .filter((id) => !isNaN(id) && id > 0);

  if (!cleanModuleIds.length) {
    return 0;
  }

  const query = `
    SELECT COUNT(DISTINCT sm.module_id) AS total
    FROM students st
    JOIN course_enrollments ce
      ON ce.student_id = st.student_id
    JOIN course_subjects cs
      ON cs.course_id = ce.course_id
     AND cs.subject_id = ?
     AND cs.is_active = 1
    JOIN subject_modules sm
      ON sm.subject_id = cs.subject_id
    WHERE st.user_id = ?
      ${courseId ? 'AND ce.course_id = ?' : ''}
      AND sm.module_id IN (?)
      AND sm.is_published = 1
  `;

  const params = courseId
    ? [parseInt(subjectId), parseInt(userId), parseInt(courseId), cleanModuleIds]
    : [parseInt(subjectId), parseInt(userId), cleanModuleIds];

  const [[row]] = await pool.query(query, params);
  return Number(row?.total ?? 0);
};

// ─── Subject/Module helpers ────────────────────────────────────────────────────



// ─── Question availability count ──────────────────────────────────────────────

export const countAvailableQuestions = async ({
  subjectId,
  questionTypes,
  difficulty,
  moduleIds = [],
}) => {
  const where = [`q.is_active = 1`];
  const params = [];
  let joins = '';

  if (subjectId) {
    joins += ` JOIN subject_modules sm ON sm.module_id = q.module_id`;
    where.push(`sm.subject_id = ?`);
    params.push(subjectId);
  }
  if (difficulty) { where.push(`q.difficulty = ?`); params.push(difficulty); }
  if (moduleIds.length === 1) {
    where.push(`q.module_id = ?`);
    params.push(moduleIds[0]);
  } else if (moduleIds.length > 1) {
    where.push(`q.module_id IN (?)`);
    params.push(moduleIds);
  }

  if (questionTypes?.length === 1) {
    where.push(`q.question_type = ?`);
    params.push(questionTypes[0]);
  } else if (questionTypes?.length > 1) {
    where.push(`q.question_type IN (?)`);
    params.push(questionTypes);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT q.question_id) AS total
     FROM questions q
     ${joins}
     WHERE ${where.join(' AND ')}`,
    params
  );
  return total;
};

// ─── Fetch randomised questions with options ───────────────────────────────────

export const fetchPracticeQuestions = async ({
  subjectId,
  questionTypes,
  difficulty,
  moduleIds = [],
  limit,
}) => {
  const where = [`q.is_active = 1`];
  const params = [];
  let joins = '';

  if (subjectId) {
    joins += ` JOIN subject_modules sm ON sm.module_id = q.module_id`;
    where.push(`sm.subject_id = ?`);
    params.push(subjectId);
  }
  if (difficulty) { where.push(`q.difficulty = ?`); params.push(difficulty); }
  if (moduleIds.length === 1) {
    where.push(`q.module_id = ?`);
    params.push(moduleIds[0]);
  } else if (moduleIds.length > 1) {
    where.push(`q.module_id IN (?)`);
    params.push(moduleIds);
  }

  if (questionTypes?.length === 1) {
    where.push(`q.question_type = ?`);
    params.push(questionTypes[0]);
  } else if (questionTypes?.length > 1) {
    where.push(`q.question_type IN (?)`);
    params.push(questionTypes);
  }

  const [qRows] = await pool.query(
    `SELECT q.question_id, q.question_text, q.question_type,
            q.difficulty, q.marks, q.explanation, q.hints,
            q.question_image_url, q.correct_answer, q.paragraph_id
     FROM questions q
     ${joins}
     WHERE ${where.join(' AND ')}
     GROUP BY q.question_id, q.question_text, q.question_type,
              q.difficulty, q.marks, q.explanation, q.hints,
              q.question_image_url, q.correct_answer, q.paragraph_id
     ORDER BY RAND()
     LIMIT ?`,
    [...params, parseInt(limit)]
  );

  if (!qRows.length) return [];

  const questionIds = qRows.map(q => q.question_id);

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

  return qRows.map(q => ({
    ...q,
    options: optMap[q.question_id] || [],
  }));
};

// ─── Create test + insert questions (called inside transaction) ────────────────

export const createPracticeTest = async (conn, { subject_id, created_by, title, totalQuestions, totalMarks }) => {
  const [result] = await conn.execute(
    `INSERT INTO tests
       (subject_id, created_by, test_type, status,
        title, total_questions, total_marks, duration_minutes,
        negative_marking, is_active)
     VALUES (?, ?, 'custom', 'published', ?, ?, ?, 0, 0, 1)`,
    [subject_id, created_by, title, totalQuestions, totalMarks]
  );
  return result.insertId;
};

export const insertPracticeTestQuestions = async (conn, testId, questions) => {
  if (!questions.length) return;
  const questionTypeMap = {
    mcq: 'mcq_single',
    mcq_multi: 'mcq_multi',
    numerical: 'nat',
    match_list: 'match_list',
  };

  const values = questions.map(q => [
    testId,
    q.question_id,
    'qb',
    q.marks || 1,
    null,           // section_id
    null,           // module_id
    q.marks_correct || 1,
    q.marks_incorrect || 0,
    questionTypeMap[q.question_type] || 'mcq_single',
    1,              // paper_number
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

// ─── Find test ─────────────────────────────────────────────────────────────────

export const findPracticeTestById = async (testId) => {
  const [[test]] = await pool.query(
    `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
            t.created_by, t.created_at, t.status,
            t.subject_id, t.negative_marking, t.duration_minutes
     FROM tests t
     WHERE t.test_id = ? AND t.test_type = 'custom' AND t.is_deleted = 0`,
    [testId]
  );
  if (!test) return null;

  // fetch questions with options (correct answer excluded for active tests)
  const [questions] = await pool.query(
    `SELECT tq.question_id, tq.sort_order, tq.marks_correct, tq.marks_incorrect,
            q.question_text, q.question_type, q.difficulty, q.marks,
            q.question_image_url, q.hints
     FROM test_questions tq
     JOIN questions q ON q.question_id = tq.question_id
     WHERE tq.test_id = ?
     ORDER BY tq.sort_order`,
    [testId]
  );

  const qIds = questions.map(q => q.question_id);
  let optMap = {};
  if (qIds.length) {
    const [opts] = await pool.query(
      `SELECT option_id, question_id, option_text, option_image_url
       FROM question_options WHERE question_id IN (?)`,
      [qIds]
    );
    for (const o of opts) {
      if (!optMap[o.question_id]) optMap[o.question_id] = [];
      optMap[o.question_id].push(o);   // is_correct NOT sent to frontend
    }
  }

  return {
    ...test,
    questions: questions.map(q => ({
      ...q,
      options: optMap[q.question_id] || [],
    })),
  };
};

export const findPracticeTestsByUser = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, parseInt(query.limit) || 10);
  const offset = (page - 1) * limit;

  const searchTerm = '%practice%';

  const [rows] = await pool.query(
    `SELECT t.test_id, t.title, t.total_questions, t.total_marks,
            t.created_at, t.status,
            ta.attempt_id, ta.status AS attempt_status,
            ta.total_score, ta.accuracy_percent, ta.submitted_at
     FROM tests t
     LEFT JOIN test_attempts ta 
       ON ta.test_id = t.test_id AND ta.user_id = ?
     WHERE t.created_by = ? 
       AND t.test_type = 'custom' 
       AND t.is_deleted = 0
       AND LOWER(t.title) LIKE ?
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, searchTerm, limit, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total 
     FROM tests
     WHERE created_by = ? 
       AND test_type = 'custom' 
       AND is_deleted = 0
       AND LOWER(title) LIKE ?`,
    [userId, searchTerm]
  );

  return {
    data: rows,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Attempt management ────────────────────────────────────────────────────────

export const findActiveAttempt = async (testId, userId) => {
  const [[row]] = await pool.query(
    `SELECT attempt_id, test_id, user_id, started_at, status
     FROM test_attempts
     WHERE test_id = ? AND user_id = ? AND status = 'in_progress'
     LIMIT 1`,
    [testId, parseInt(userId)]
  );
  return row || null;
};

export const findAttemptById = async (attemptId) => {
  const [[row]] = await pool.query(
    `SELECT * FROM test_attempts WHERE attempt_id = ?`,
    [attemptId]
  );
  return row || null;
};

export const createAttempt = async (testId, userId) => {
  const [result] = await pool.query(
    `INSERT INTO test_attempts
       (test_id, user_id, started_at, status, attempt_number, paper_number)
     VALUES (?, ?, NOW(), 'in_progress', 1, 1)`,
    [testId, parseInt(userId)]
  );
  return result.insertId;
};

// ─── Submit single answer → return instant feedback ───────────────────────────

export const saveAnswerAndGetFeedback = async (attemptId, testId, questionId, payload) => {
  const {
    selected_option_id = null,
    selected_option_ids = null,
    numerical_answer = null,
  } = payload;

  // fetch question + correct answer + explanation
  const [[q]] = await pool.query(
    `SELECT q.question_id, q.question_type, q.correct_answer,
            q.explanation, q.marks,
            tq.marks_correct, tq.marks_incorrect
     FROM questions q
     JOIN test_questions tq ON tq.question_id = q.question_id AND tq.test_id = ?
     WHERE q.question_id = ?`,
    [testId, questionId]
  );
  if (!q) throw { status: 404, message: 'Question not found in this test' };

  // fetch correct options
  const [correctOpts] = await pool.query(
    `SELECT option_id, option_text FROM question_options
     WHERE question_id = ? AND is_correct = 1`,
    [questionId]
  );

  // fetch all options for display
  const [allOpts] = await pool.query(
    `SELECT option_id, option_text, option_image_url, is_correct
     FROM question_options WHERE question_id = ?`,
    [questionId]
  );

  // ── Grade ──────────────────────────────────────────────────────────────────
  let isCorrect = false;
  let isPartial = false;
  let marksObtained = 0;
  const marksCorrect = Number(q.marks_correct || 0);
  const marksIncorrect = Number(q.marks_incorrect || 0);
  const correctIds = correctOpts.map(o => o.option_id);

  if (q.question_type === 'mcq') {
    isCorrect = selected_option_id === correctIds[0];
    marksObtained = isCorrect ? marksCorrect : (selected_option_id ? -marksIncorrect : 0);

  } else if (q.question_type === 'mcq_multi') {
    const selected = (Array.isArray(selected_option_ids)
      ? selected_option_ids
      : JSON.parse(selected_option_ids || '[]')
    ).map(Number).sort();
    const correct = correctIds.map(Number).sort();

    isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
    if (isCorrect) {
      marksObtained = marksCorrect;
    } else if (selected.length) {
      const goodPicks = selected.filter(id => correct.includes(id));
      const badPicks = selected.filter(id => !correct.includes(id));
      if (!badPicks.length && goodPicks.length) {
        isPartial = true;
        marksObtained = (marksCorrect / correct.length) * goodPicks.length;
      }
    }

  } else if (q.question_type === 'numerical') {
    isCorrect = String(numerical_answer).trim() === String(q.correct_answer).trim();
    marksObtained = isCorrect ? marksCorrect : (numerical_answer !== null ? -marksIncorrect : 0);
  }

  marksObtained = parseFloat(Number(marksObtained || 0).toFixed(2));

  // ── Save to attempt_answers ────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO attempt_answers
       (attempt_id, question_id,
        selected_option_id, selected_option_ids, numerical_answer,
        correct_option_id, correct_option_ids, correct_numerical,
        correct_option_text, selected_option_text,
        question_text_snapshot,
        all_options,
        is_correct, is_partial, marks_obtained)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       selected_option_id    = VALUES(selected_option_id),
       selected_option_ids   = VALUES(selected_option_ids),
       numerical_answer      = VALUES(numerical_answer),
       correct_option_id     = VALUES(correct_option_id),
       correct_option_ids    = VALUES(correct_option_ids),
       correct_numerical     = VALUES(correct_numerical),
       correct_option_text   = VALUES(correct_option_text),
       selected_option_text  = VALUES(selected_option_text),
       question_text_snapshot= VALUES(question_text_snapshot),
       all_options           = VALUES(all_options),
       is_correct            = VALUES(is_correct),
       is_partial            = VALUES(is_partial),
       marks_obtained        = VALUES(marks_obtained)`,
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
      allOpts.find(o => o.option_id === selected_option_id)?.option_text || null,
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
    question_id: questionId,
    isCorrect,
    is_correct: isCorrect ? 1 : 0,
    isPartial,
    is_partial: isPartial ? 1 : 0,
    marksObtained,
    marks_obtained: marksObtained,
    correctOptionId: correctIds[0] || null,
    correct_option_id: correctIds[0] || null,
    correctOptionIds: correctIds,
    correct_option_ids: correctIds,
    correctOptionText: correctOpts[0]?.option_text || null,
    correct_option_text: correctOpts[0]?.option_text || null,
    correctNumerical: q.correct_answer || null,
    correct_numerical: q.correct_answer || null,
    explanation: q.explanation,
    allOptions: allOpts,
    all_options: allOpts,
  };
};

// ─── Submit full test → finalise attempt ──────────────────────────────────────

export const submitPracticeAttempt = async (attemptId, testId, answers) => {
  // process each answer
  for (const ans of answers) {
    const questionId = ans.questionId ?? ans.question_id;
    if (!questionId) continue;

    await saveAnswerAndGetFeedback(attemptId, testId, questionId, {
      selected_option_id: ans.selected_option_id ?? null,
      selected_option_ids: ans.selected_option_ids ?? null,
      numerical_answer: ans.numerical_answer ?? null,
    });
  }

  // compute final score from attempt_answers
  const [[scoreRow]] = await pool.query(
    `SELECT
       COUNT(*)                                    AS total,
       SUM(is_correct = 1)                         AS correct,
       SUM(is_correct = 0 AND marks_obtained < 0)  AS wrong,
       SUM(is_correct = 0 AND marks_obtained = 0)  AS skipped,
       SUM(marks_obtained)                         AS total_score
     FROM attempt_answers
     WHERE attempt_id = ?`,
    [attemptId]
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
    [scoreRow.total_score || 0, accuracy, attemptId]
  );

  return {
    totalQuestions: scoreRow.total,
    correct: scoreRow.correct,
    wrong: scoreRow.wrong,
    skipped: scoreRow.skipped,
    totalScore: scoreRow.total_score || 0,
    accuracy,
  };
};

// ─── Get results with full review ────────────────────────────────────────────

export const getAttemptResults = async (attemptId) => {
  const [[attempt]] = await pool.query(
    `SELECT ta.attempt_id, ta.test_id, ta.user_id, ta.status,
            ta.total_score, ta.accuracy_percent, ta.time_taken_sec,
            ta.started_at, ta.submitted_at,
            t.title, t.total_questions, t.total_marks
     FROM test_attempts ta
     JOIN tests t ON t.test_id = ta.test_id
     WHERE ta.attempt_id = ?`,
    [attemptId]
  );

  if (!attempt) return null;

  const [answers] = await pool.query(
    `SELECT 
      aa.question_id,
      COALESCE(aa.question_text_snapshot, q.question_text) AS question_text, -- ✅ BEST PRACTICE
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
      tq.sort_order
   FROM attempt_answers aa
   JOIN questions q 
      ON q.question_id = aa.question_id
   JOIN test_questions tq 
      ON tq.question_id = aa.question_id 
      AND tq.test_id = ?
   WHERE aa.attempt_id = ?
   ORDER BY tq.sort_order`,
    [attempt.test_id, attemptId]
  );

  return { ...attempt, answers };
};

// ─── Summary across all practice tests ───────────────────────────────────────

export const getPracticeResultsSummary = async (userId) => {
  const [[overall]] = await pool.query(
    `SELECT
       COUNT(DISTINCT ta.attempt_id)   AS total_tests,
       SUM(aa.is_correct = 1)          AS total_correct,
       COUNT(aa.question_id)           AS total_questions,
       ROUND(AVG(ta.accuracy_percent), 2) AS avg_accuracy,
       SUM(ta.total_score)             AS total_score
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     WHERE ta.user_id = ? AND ta.status = 'submitted'`,
    [userId]
  );

  // per-subject breakdown
  const [bySubject] = await pool.query(
    `SELECT sm.subject_id,
            COUNT(aa.question_id)      AS total,
            SUM(aa.is_correct = 1)     AS correct,
            ROUND(SUM(aa.is_correct = 1) / COUNT(aa.question_id) * 100, 2) AS accuracy
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     JOIN questions q        ON q.question_id = aa.question_id
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     GROUP BY sm.subject_id`,
    [userId]
  );

  // weakest chapters (accuracy < 60%)
  const [weakChapters] = await pool.query(
    `SELECT q.module_id,
            COUNT(aa.question_id)  AS total,
            SUM(aa.is_correct = 1) AS correct,
            ROUND(SUM(aa.is_correct = 1) / COUNT(aa.question_id) * 100, 2) AS accuracy
     FROM test_attempts ta
     JOIN attempt_answers aa ON aa.attempt_id = ta.attempt_id
     JOIN questions q        ON q.question_id = aa.question_id
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     GROUP BY q.module_id
     HAVING accuracy < 60
     ORDER BY accuracy ASC
     LIMIT 5`,
    [userId]
  );

  return { overall, bySubject, weakChapters };
};

// ─── Insert question (admin/teacher) ──────────────────────────────────────────

export const insertQuestion = async (userId, data) => {
  const {
    subjectId, moduleId,
    difficulty, questionType, questionText,
    marks, correctAnswer, explanation, hints,
    options = [],
  } = data;

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    if (subjectId && moduleId) {
      const [[mapping]] = await conn.query(
        `SELECT 1
         FROM subject_modules
         WHERE subject_id = ? AND module_id = ?
         LIMIT 1`,
        [subjectId, moduleId]
      );
      if (!mapping) {
        throw { status: 400, message: 'Selected module does not belong to the selected subject' };
      }
    }

    const [result] = await conn.execute(
      `INSERT INTO questions
         (module_id, difficulty, question_type, question_text, marks, correct_answer,
          explanation, hints, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [moduleId, difficulty, questionType, questionText, marks,
        correctAnswer, explanation, hints, userId]
    );
    const questionId = result.insertId;

    if (options.length) {
      const optVals = options.map(o => [questionId, o.text, o.imageUrl || null, o.isCorrect ? 1 : 0]);
      await conn.query(
        `INSERT INTO question_options (question_id, option_text, option_image_url, is_correct) VALUES ?`,
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
    `SELECT q.*, GROUP_CONCAT(qo.option_text) AS options
     FROM questions q
     LEFT JOIN question_options qo ON qo.question_id = q.question_id
     WHERE q.question_id = ?
     GROUP BY q.question_id`,
    [questionId]
  );
  return q || null;
};

export const getQuestionHint = async (attemptId, testId, questionId) => {
  const [[q]] = await pool.query(
    `SELECT q.hints FROM questions q
     JOIN test_questions tq ON tq.question_id = q.question_id
     WHERE tq.test_id = ? AND q.question_id = ?`,
    [testId, questionId]
  );
  return { hint: q?.hints || null };
}; 
