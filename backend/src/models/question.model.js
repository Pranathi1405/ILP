/**
 * ============================================================
 * Question Model
 * ------------------------------------------------------------
 * Module  : Question Bank
 * Author  : Nithyasri 
 * Description:
 * Database layer for adding questions to the question bank.
 * Supports MCQ, MCQ Multi, NAT, Match List, Paragraph types.
 * ============================================================
 */
import pool from '../config/database.config.js';

// ─── Check if teacher is assigned to subject ─────────────────
export const isTeacherAssignedToSubject = async (teacherUserId, subjectId) => {
  const [[row]] = await pool.query(
    `SELECT cs.subject_id 
     FROM course_subjects cs
     JOIN teachers t ON t.teacher_id = cs.teacher_id
     WHERE t.user_id = ? AND cs.subject_id = ? AND cs.is_active = 1`,
    [parseInt(teacherUserId), parseInt(subjectId)]
  );
  return !!row;
};

// ─── Check if module belongs to subject ──────────────────────
export const isModuleInSubject = async (moduleId, subjectId) => {
  const [[row]] = await pool.query(
    `SELECT module_id FROM subject_modules
     WHERE module_id = ? AND subject_id = ? AND is_published = 1`,
    [parseInt(moduleId), parseInt(subjectId)]
  );
  return !!row;
};

// ─── Insert a single question ─────────────────────────────────
export const insertQuestion = async (connection, {
  subjectId, moduleId, difficulty, questionType,
  questionText, questionImageUrl, imagePosition,
  marks, createdBy, correctAnswer, explanation,
  hints, idealTimeMins, paragraphId
}) => {
  const [result] = await connection.query(
    `INSERT INTO questions
  (module_id, difficulty, question_type,
   question_text, question_image_url, image_position,
   marks, created_by, is_manual, is_active,
   correct_answer, explanation, hints, ideal_time_mins, paragraph_id)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)`,
[
  parseInt(moduleId),
  difficulty,
  questionType,
  questionText,
  questionImageUrl || null,
  imagePosition || 'above',
  parseInt(marks),
  parseInt(createdBy),
  correctAnswer || null,
  explanation ? JSON.stringify(explanation) : null,
  hints || null,
  idealTimeMins || null,
  paragraphId || null
]
  );
  return result.insertId;
};

// ─── Insert options for a question ────────────────────────────
export const insertOptions = async (connection, questionId, options) => {
  if (!options || options.length === 0) return;
  const values = options.map(opt => [
    parseInt(questionId),
    opt.option_text,
    opt.option_image_url || null,
    opt.is_correct ? 1 : 0
  ]);
  await connection.query(
    `INSERT INTO question_options 
      (question_id, option_text, option_image_url, is_correct) 
     VALUES ?`,
    [values]
  );
};

// ─── Insert a paragraph ───────────────────────────────────────
export const insertParagraph = async (connection, {
  paragraphText, paragraphImageUrl, moduleId, createdBy
}) => {
  const [result] = await connection.query(
    `INSERT INTO paragraphs
      (paragraph_text, paragraph_image_url, module_id, created_by, is_manual, is_active)
     VALUES (?, ?, ?, ?, 1, 1)`,
    [
      paragraphText,
      paragraphImageUrl || null,
      parseInt(moduleId),
      parseInt(createdBy)
    ]
  );
  return result.insertId;
};

// ─── Get question by ID (with options) ───────────────────────
export const findQuestionById = async (questionId) => {
  const [[question]] = await pool.query(
    `SELECT q.*, sm.module_name, sm.subject_id,
       cs.subject_name,
       p.paragraph_text, p.paragraph_image_url
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     JOIN course_subjects cs ON cs.subject_id = sm.subject_id
     LEFT JOIN paragraphs p ON p.paragraph_id = q.paragraph_id
     WHERE q.question_id = ?`,
    [parseInt(questionId)]
  );
  if (!question) return null;

  if (question.explanation) {
    try {
      question.explanation = JSON.parse(question.explanation);
    } catch {
      question.explanation = { text: question.explanation, image_url: null, video_url: null };
    }
  }

  const [options] = await pool.query(
    `SELECT option_id, option_text, option_image_url, is_correct
     FROM question_options
     WHERE question_id = ?
     ORDER BY option_id ASC`,
    [parseInt(questionId)]
  );

  return { ...question, options };
};
// ─── Get questions by subject (paginated) ─────────────────────
export const findQuestionsBySubject = async (subjectId, { page = 1, limit = 20, difficulty, questionType } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['sm.subject_id = ?', 'q.is_active = 1'];
  const params = [parseInt(subjectId)];

  if (difficulty) {
    conditions.push('q.difficulty = ?');
    params.push(difficulty);
  }
  if (questionType) {
    conditions.push('q.question_type = ?');
    params.push(questionType);
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );

const [rows] = await pool.query(
    `SELECT q.question_id, q.question_type, q.difficulty,
       q.question_text, q.marks, q.ideal_time_mins,
       q.explanation,  -- ← add this
       q.created_at, sm.module_name
     FROM questions q
     JOIN subject_modules sm ON sm.module_id = q.module_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY q.created_at DESC
     LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    params
  );

  return {
  data: rows.map(q => ({
    ...q,
    explanation: q.explanation ? (() => {
      try { return JSON.parse(q.explanation); }
      catch { return { text: q.explanation, image_url: null, video_url: null }; }
    })() : null
  })),
  pagination: {
    total: Number(total),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(Number(total) / parseInt(limit))
  }
}
};
// ─── Check if question is used in any active test ─────────────
export const isQuestionInActiveTest = async (questionId) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM test_questions tq
     JOIN tests t ON t.test_id = tq.test_id
     WHERE tq.question_id = ? 
       AND t.is_deleted = 0
       AND t.status != 'archived'`,
    [parseInt(questionId)]
  );
  return Number(row.total) > 0;
};

// ─── Check if teacher created this question ───────────────────
export const isQuestionCreatedByTeacher = async (questionId, teacherUserId) => {
  const [[row]] = await pool.query(
    `SELECT question_id FROM questions
     WHERE question_id = ? AND created_by = ? AND is_active = 1`,
    [parseInt(questionId), parseInt(teacherUserId)]
  );
  return !!row;
};

// ─── Soft delete a question ───────────────────────────────────
export const softDeleteQuestion = async (questionId) => {
  const [result] = await pool.query(
    `UPDATE questions SET is_active = 0, updated_at = CURRENT_TIMESTAMP
     WHERE question_id = ?`,
    [parseInt(questionId)]
  );
  return result.affectedRows > 0;
};

// ─── Update a question ────────────────────────────────────────
export const updateQuestion = async (connection, questionId, fields) => {
  const allowed = [
    'question_text', 'question_image_url', 'image_position',
    'difficulty', 'hints', 'ideal_time_mins', 'correct_answer'
  ];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  // Handle explanation separately (JSON stringify)
  if (fields.explanation !== undefined) {
    updates.push('explanation = ?');
    values.push(fields.explanation ? JSON.stringify(fields.explanation) : null);
  }

  if (!updates.length) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(parseInt(questionId));

  const [result] = await connection.query(
    `UPDATE questions SET ${updates.join(', ')} WHERE question_id = ?`,
    values
  );
  return result.affectedRows > 0;
};

// ─── Delete and reinsert options ──────────────────────────────
export const replaceOptions = async (connection, questionId, options) => {
  await connection.query(
    `DELETE FROM question_options WHERE question_id = ?`,
    [parseInt(questionId)]
  );
  if (options && options.length > 0) {
    await insertOptions(connection, questionId, options);
  }
};