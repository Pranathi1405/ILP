/**
 * ============================================================
 * Question Service
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Centralized Question Creation
 * Description:
 * Single entry point for inserting questions into:
 *   1. questions table (QB record)
 *   2. test_questions table (test mapping)
 *
 * Sources: 'manual' | 'qb' | 'document'
 *
 * Rules:
 *   - QB source → question must already exist, only inserts test_questions
 *   - manual/document → inserts into questions + options + test_questions
 *   - Duplicate prevention on test_questions before every insert
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as SmeTestModel from '../models/smeTest.model.js';

// ──────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ──────────────────────────────────────────────────────────────

const toInt = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

/**
 * Checks whether question_id is already mapped to test_id.
 * Prevents duplicate test_questions rows.
 */
const isDuplicateInTest = async (connection, testId, questionId) => {
  const [[row]] = await connection.query(
    `SELECT 1 FROM test_questions WHERE test_id = ? AND question_id = ? LIMIT 1`,
    [toInt(testId), toInt(questionId)]
  );
  return !!row;
};

/**
 * Resolves a fallback module_id for a subject (first published module).
 * Required when inserting into questions table.
 */
const resolveModuleId = async (connection, subjectId) => {
  const [[row]] = await connection.query(
    `SELECT module_id FROM subject_modules
     WHERE subject_id = ? AND is_published = 1
     ORDER BY module_id ASC LIMIT 1`,
    [toInt(subjectId)]
  );
  if (!row) throw { status: 400, message: `No published module found for subject ${subjectId}` };
  return row.module_id;
};

/**
 * Gets the next sort_order for a test's question list.
 */
const getNextSortOrder = async (connection, testId) => {
  const [[{ total }]] = await connection.query(
    `SELECT COUNT(*) AS total FROM test_questions WHERE test_id = ?`,
    [toInt(testId)]
  );
  return Number(total) + 1;
};

// ──────────────────────────────────────────────────────────────
// CORE — INSERT QUESTION INTO QB
// ──────────────────────────────────────────────────────────────

/**
 * Inserts a question row + options into the questions / question_options tables.
 * Returns the new question_id.
 *
 * @param {object} connection - Active DB connection (must be in transaction)
 * @param {object} params
 */
const insertQuestionRecord = async (connection, {
  moduleId,
  subjectId,
  teacherUserId,
  questionText,
  questionType,
  difficulty,
  marks,
  correctAnswer,
  explanation,
  options = [],
  source,           // 'manual' | 'document'
}) => {
  // Normalise question_type → DB ENUM value
  const typeMap = {
    mcq_single:  'mcq',
    mcq_multi:   'mcq_multi',
    nat:         'numerical',
    match_list:  'match_list',
    mcq:         'mcq',
    numerical:   'numerical',
    subjective:  'subjective',
  };
  const dbType = typeMap[questionType] || questionType;

  const [result] = await connection.query(
    `INSERT INTO questions
       (module_id, difficulty, question_type,
        question_text, marks, created_by,
        is_manual, is_active,
        correct_answer, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      toInt(moduleId),
      difficulty || 'medium',
      dbType,
      questionText,
      toInt(marks, 1),
      toInt(teacherUserId),
      source === 'manual' ? 1 : 0,   // is_manual flag
      correctAnswer || null,
      explanation ? JSON.stringify(explanation) : null,
    ]
  );
  const questionId = result.insertId;

  // Insert options if present (MCQ types)
  if (options && options.length > 0) {
    const optionValues = options.map(opt => [
      questionId,
      opt.option_text,
      opt.option_image_url || null,
      opt.is_correct ? 1 : 0,
    ]);
    await connection.query(
      `INSERT INTO question_options (question_id, option_text, option_image_url, is_correct) VALUES ?`,
      [optionValues]
    );
  }

  return questionId;
};

// ──────────────────────────────────────────────────────────────
// CORE — INSERT INTO test_questions
// ──────────────────────────────────────────────────────────────

const insertTestQuestion = async (connection, {
  testId,
  questionId,
  sectionId,
  moduleId,
  marksCorrect,
  marksIncorrect,
  questionType,
  paperNumber,
  source,
}) => {
  const sortOrder = await getNextSortOrder(connection, testId);

  await connection.query(
    `INSERT INTO test_questions
       (test_id, question_id, source, section_id, module_id,
        marks_correct, marks_incorrect, question_type, paper_number, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      toInt(testId),
      toInt(questionId),
      source,
      sectionId ? toInt(sectionId) : null,
      moduleId   ? toInt(moduleId)  : null,
      marksCorrect   !== undefined ? marksCorrect   : 1,
      marksIncorrect !== undefined ? marksIncorrect : 0,
      questionType || null,
      paperNumber  || 1,
      sortOrder,
    ]
  );
};

// ──────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────

/**
 * createAndAttachQuestion
 * -----------------------
 * Universal entry point. Handles all 3 sources.
 *
 * @param {object} connection - Active transaction connection
 * @param {object} params
 *   test_id         {number}   - Required
 *   section_id      {number}   - Required
 *   source          {string}   - 'manual' | 'qb' | 'document'
 *   teacher_user_id {number}   - Required for manual/document
 *
 *   // For QB:
 *   question_id     {number}   - Required
 *
 *   // For manual/document:
 *   subject_id      {number}   - Required (to resolve module)
 *   module_id       {number}   - Optional (will auto-resolve if absent)
 *   question_text   {string}   - Required
 *   question_type   {string}   - Required
 *   difficulty      {string}
 *   marks           {number}
 *   correct_answer  {string}
 *   explanation     {object}
 *   options         {Array}
 *
 *   // Section metadata for test_questions row:
 *   marks_correct   {number}
 *   marks_incorrect {number}
 *   paper_number    {number}
 *
 * @returns {{ question_id: number, skipped: boolean }}
 */
export const createAndAttachQuestion = async (connection, params) => {
  const {
    test_id,
    section_id,
    source = 'manual',
    teacher_user_id,
    question_id: existingQid,
    subject_id,
    module_id,
    question_text,
    question_type,
    difficulty,
    marks,
    correct_answer,
    explanation,
    options,
    marks_correct,
    marks_incorrect,
    paper_number,
  } = params;

  if (!test_id)  throw { status: 400, message: 'test_id is required' };
  if (!section_id && source !== 'qb') throw { status: 400, message: 'section_id is required' };

  let questionId;

  if (source === 'qb') {
    // ── QB mode: question must already exist ───────────────────
    if (!existingQid) throw { status: 400, message: 'question_id is required for QB source' };
    questionId = toInt(existingQid);

    // Verify it exists
    const [[qRow]] = await connection.query(
      `SELECT question_id, module_id FROM questions WHERE question_id = ? AND is_active = 1`,
      [questionId]
    );
    if (!qRow) throw { status: 404, message: `Question ${questionId} not found in question bank` };

  } else {
    // ── manual / document: create question first ───────────────
    if (!question_text) throw { status: 400, message: 'question_text is required' };
    if (!question_type) throw { status: 400, message: 'question_type is required' };
    if (!subject_id && !module_id) {
      throw { status: 400, message: 'subject_id or module_id is required' };
    }

    const resolvedModuleId = module_id
      ? toInt(module_id)
      : await resolveModuleId(connection, subject_id);

    questionId = await insertQuestionRecord(connection, {
      moduleId:      resolvedModuleId,
      subjectId:     subject_id,
      teacherUserId: teacher_user_id,
      questionText:  question_text,
      questionType:  question_type,
      difficulty,
      marks,
      correctAnswer: correct_answer,
      explanation,
      options,
      source,
    });
  }

  // ── Duplicate prevention ──────────────────────────────────────
  const alreadyInTest = await isDuplicateInTest(connection, test_id, questionId);
  if (alreadyInTest) {
    return { question_id: questionId, skipped: true, reason: 'duplicate' };
  }

  // ── Fetch section metadata to get marks/type ─────────────────
  let marksC   = marks_correct;
  let marksI   = marks_incorrect;
  let qType    = question_type;
  let paper    = paper_number;
  let moduleId = module_id;

  if (section_id) {
    const [[sectionRow]] = await connection.query(
      `SELECT marks_correct, marks_incorrect, question_type, paper_number
       FROM exam_sections WHERE section_id = ?`,
      [toInt(section_id)]
    );
    if (sectionRow) {
      marksC ??= sectionRow.marks_correct;
      marksI ??= sectionRow.marks_incorrect;
      qType  ??= sectionRow.question_type;
      paper  ??= sectionRow.paper_number;
    }
  }

  // Resolve module_id for test_questions if not set
  if (!moduleId && subject_id) {
    const [[mRow]] = await connection.query(
      `SELECT module_id FROM subject_modules
       WHERE subject_id = ? AND is_published = 1 ORDER BY module_id ASC LIMIT 1`,
      [toInt(subject_id)]
    );
    moduleId = mRow?.module_id || null;
  }

  // ── Insert into test_questions ────────────────────────────────
  await insertTestQuestion(connection, {
    testId:         test_id,
    questionId,
    sectionId:      section_id,
    moduleId,
    marksCorrect:   marksC,
    marksIncorrect: marksI,
    questionType:   qType,
    paperNumber:    paper,
    source,
  });

  return { question_id: questionId, skipped: false };
};

// ──────────────────────────────────────────────────────────────
// BULK HELPER — Document / Batch insert
// ──────────────────────────────────────────────────────────────

/**
 * createAndAttachBulk
 * -------------------
 * Batch version of createAndAttachQuestion for document parsing.
 * Runs inside a single transaction passed by caller.
 * Skips duplicates gracefully.
 *
 * @param {object}   connection
 * @param {object[]} questionList  - Array of question param objects
 * @returns {{ inserted: number, skipped: number, question_ids: number[] }}
 */
export const createAndAttachBulk = async (connection, questionList) => {
  let inserted = 0;
  let skipped  = 0;
  const ids    = [];

  for (const q of questionList) {
    const result = await createAndAttachQuestion(connection, q);
    if (result.skipped) {
      skipped++;
    } else {
      inserted++;
      ids.push(result.question_id);
    }
  }

  return { inserted, skipped, question_ids: ids };
};