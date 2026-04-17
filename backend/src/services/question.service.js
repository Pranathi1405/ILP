/**
 * ============================================================
 * Question Service
 * ------------------------------------------------------------
 * Module  : Question Bank
 * Author  : NDMATRIX
 * Description:
 * Business logic for adding questions to the question bank.
 * Supports MCQ, MCQ Multi, NAT, Match List, Paragraph types.
 * ============================================================
 */
import pool from '../config/database.config.js';
import * as QuestionModel from '../models/question.model.js';

// ─── Validate options based on question type ──────────────────
const validateOptions = (questionType, options) => {
  const noOptionTypes = ['numerical'];
  if (noOptionTypes.includes(questionType)) return;

  if (!options || !Array.isArray(options) || options.length < 2) {
    throw { status: 400, message: 'At least 2 options are required' };
  }
  if (options.length > 4) {
    throw { status: 400, message: 'Maximum 4 options allowed' };
  }
  if (!options.some(o => o.is_correct)) {
    throw { status: 400, message: 'At least one correct option is required' };
  }
  if (questionType === 'mcq' && options.filter(o => o.is_correct).length > 1) {
    throw { status: 400, message: 'MCQ single correct can only have 1 correct option' };
  }
  if (questionType === 'mcq_multi' && options.filter(o => o.is_correct).length < 2) {
    throw { status: 400, message: 'MCQ multi correct must have at least 2 correct options' };
  }
};

// ─── Validate teacher has access to subject ───────────────────
const validateTeacherSubjectAccess = async (teacherUserId, subjectId) => {
  const isAssigned = await QuestionModel.isTeacherAssignedToSubject(teacherUserId, subjectId);
  if (!isAssigned) {
    throw {
      status: 403,
      message: 'You are not assigned to this subject'
    };
  }
};

// ─── Validate module belongs to subject ──────────────────────
const validateModuleInSubject = async (moduleId, subjectId) => {
  const isValid = await QuestionModel.isModuleInSubject(moduleId, subjectId);
  if (!isValid) {
    throw {
      status: 400,
      message: 'Module does not belong to this subject'
    };
  }
};

// ─── Add single question ──────────────────────────────────────
export const addQuestion = async (teacherUserId, payload) => {
  const {
    subject_id, module_id, question_type,
    difficulty, question_text, question_image_url,
    image_position, marks, correct_answer,
    explanation, hints, ideal_time_mins, options
  } = payload;

  // Validate required fields
  if (!subject_id) throw { status: 400, message: 'subject_id is required' };
  if (!module_id) throw { status: 400, message: 'module_id is required' };
  if (!question_type) throw { status: 400, message: 'question_type is required' };
  if (!difficulty) throw { status: 400, message: 'difficulty is required' };
  if (!question_text) throw { status: 400, message: 'question_text is required' };
  if (!marks) throw { status: 400, message: 'marks is required' };

  const validTypes = ['mcq', 'mcq_multi', 'numerical', 'match_list'];
  if (!validTypes.includes(question_type)) {
    throw { status: 400, message: `Invalid question_type. Must be one of: ${validTypes.join(', ')}` };
  }

  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(difficulty)) {
    throw { status: 400, message: 'difficulty must be easy, medium or hard' };
  }

  // NAT requires correct_answer
  if (question_type === 'numerical' && !correct_answer) {
    throw { status: 400, message: 'correct_answer is required for numerical questions' };
  }

  // Validate options
  validateOptions(question_type, options);

  // Validate teacher access
  await validateTeacherSubjectAccess(teacherUserId, subject_id);

  // Validate module belongs to subject
  await validateModuleInSubject(module_id, subject_id);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const questionId = await QuestionModel.insertQuestion(connection, {
      subjectId: subject_id,
      moduleId: module_id,
      difficulty,
      questionType: question_type,
      questionText: question_text,
      questionImageUrl: question_image_url || null,
      imagePosition: image_position || 'above',
      marks,
      createdBy: teacherUserId,
      correctAnswer: correct_answer || null,
      explanation: explanation || null,
      hints: hints || null,
      idealTimeMins: ideal_time_mins || null,
      paragraphId: null
    });

    if (options && options.length > 0) {
      await QuestionModel.insertOptions(connection, questionId, options);
    }

    await connection.commit();
    return QuestionModel.findQuestionById(questionId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Add paragraph-based questions ───────────────────────────
export const addParagraphQuestion = async (teacherUserId, payload) => {
  const {
    subject_id, module_id, difficulty,
    marks, ideal_time_mins, paragraph, questions
  } = payload;

  // Validate required fields
  if (!subject_id) throw { status: 400, message: 'subject_id is required' };
  if (!module_id) throw { status: 400, message: 'module_id is required' };
  if (!difficulty) throw { status: 400, message: 'difficulty is required' };
  if (!marks) throw { status: 400, message: 'marks is required' };
  if (!paragraph?.paragraph_text) {
    throw { status: 400, message: 'paragraph.paragraph_text is required' };
  }
  if (!questions || !Array.isArray(questions) || questions.length < 2) {
    throw { status: 400, message: 'At least 2 questions are required for a paragraph' };
  }
console.log('questions received:', JSON.stringify(questions, null, 2));
  // Validate each sub-question
  for (const q of questions) {
    if (!q.question_text) throw { status: 400, message: 'question_text is required for each question' };
    if (!q.question_type) throw { status: 400, message: 'question_type is required for each question' };
    validateOptions(q.question_type, q.options);
  }

  // Validate teacher access
  await validateTeacherSubjectAccess(teacherUserId, subject_id);

  // Validate module belongs to subject
  await validateModuleInSubject(module_id, subject_id);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Insert paragraph first
    const paragraphId = await QuestionModel.insertParagraph(connection, {
      paragraphText: paragraph.paragraph_text,
      paragraphImageUrl: paragraph.paragraph_image_url || null,
      moduleId: module_id,
      createdBy: teacherUserId
    });

    // Insert each sub-question linked to paragraph
    const insertedIds = [];
    for (const q of questions) {
      const questionId = await QuestionModel.insertQuestion(connection, {
        subjectId: subject_id,
        moduleId: module_id,
        difficulty,
        questionType: q.question_type,
        questionText: q.question_text,
        questionImageUrl: q.question_image_url || null,
        imagePosition: q.image_position || 'above',
        marks,
        createdBy: teacherUserId,
        correctAnswer: q.correct_answer || null,
        explanation: q.explanation || null,
        hints: q.hints || null,
        idealTimeMins: ideal_time_mins || null,
        paragraphId
      });

      if (q.options && q.options.length > 0) {
        await QuestionModel.insertOptions(connection, questionId, q.options);
      }

      insertedIds.push(questionId);
    }

    await connection.commit();

    // Return all inserted questions
    const inserted = await Promise.all(
      insertedIds.map(id => QuestionModel.findQuestionById(id))
    );

    return {
      paragraph_id: paragraphId,
      questions: inserted
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Bulk add questions ───────────────────────────────────────
export const addBulkQuestions = async (teacherUserId, questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw { status: 400, message: 'questions array is required' };
  }
  if (questions.length > 50) {
    throw { status: 400, message: 'Maximum 50 questions allowed per bulk upload' };
  }

  const results = { success: [], failed: [] };

  for (let i = 0; i < questions.length; i++) {
    try {
      const question = questions[i];
      if (question.paragraph) {
        const result = await addParagraphQuestion(teacherUserId, question);
        results.success.push({ index: i, ...result });
      } else {
        const result = await addQuestion(teacherUserId, question);
        results.success.push({ index: i, question_id: result.question_id });
      }
    } catch (err) {
      results.failed.push({
        index: i,
        error: err.message || 'Unknown error'
      });
    }
  }

  return results;
};

// ─── Get questions by subject ─────────────────────────────────
export const getQuestionsBySubject = async (teacherUserId, subjectId, query) => {
  const id = parseInt(subjectId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid subject_id' };

  await validateTeacherSubjectAccess(teacherUserId, id);
  return QuestionModel.findQuestionsBySubject(id, query);
};

// ─── Get single question ──────────────────────────────────────
export const getQuestionById = async (questionId) => {
  const id = parseInt(questionId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid question_id' };

  const question = await QuestionModel.findQuestionById(id);
  if (!question) throw { status: 404, message: 'Question not found' };
  return question;
};
// ─── Update a question ────────────────────────────────────────
export const updateQuestion = async (teacherUserId, questionId, payload) => {
  const id = parseInt(questionId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid question_id' };

  // Check question exists and teacher created it
  const isOwner = await QuestionModel.isQuestionCreatedByTeacher(id, teacherUserId);
  if (!isOwner) {
    throw { status: 403, message: 'You can only update questions you created' };
  }

  // Get current question to validate type-specific rules
  const current = await QuestionModel.findQuestionById(id);
  if (!current) throw { status: 404, message: 'Question not found' };

  const {
    question_text, question_image_url, image_position,
    difficulty, hints, ideal_time_mins,
    correct_answer, explanation, options
  } = payload;

  // Validate difficulty if provided
  if (difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      throw { status: 400, message: 'difficulty must be easy, medium or hard' };
    }
  }

  // Validate options if provided
  if (options) {
    validateOptions(current.question_type, options);
  }

  // NAT — if updating correct_answer must be provided
  if (current.question_type === 'numerical' && correct_answer === '') {
    throw { status: 400, message: 'correct_answer cannot be empty for numerical questions' };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await QuestionModel.updateQuestion(connection, id, {
      question_text,
      question_image_url,
      image_position,
      difficulty,
      hints,
      ideal_time_mins,
      correct_answer,
      explanation
    });

    // Replace options if provided
    if (options && options.length > 0) {
      await QuestionModel.replaceOptions(connection, id, options);
    }

    await connection.commit();
    return QuestionModel.findQuestionById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Delete a question ────────────────────────────────────────
export const deleteQuestion = async (teacherUserId, questionId) => {
  const id = parseInt(questionId);
  if (isNaN(id)) throw { status: 400, message: 'Invalid question_id' };

  // Check teacher owns this question
  const isOwner = await QuestionModel.isQuestionCreatedByTeacher(id, teacherUserId);
  if (!isOwner) {
    throw { status: 403, message: 'You can only delete questions you created' };
  }

  // Block delete if question is in an active test
  const inActiveTest = await QuestionModel.isQuestionInActiveTest(id);
  if (inActiveTest) {
    throw {
      status: 400,
      message: 'Cannot delete question — it is part of an active test'
    };
  }

  const deleted = await QuestionModel.softDeleteQuestion(id);
  if (!deleted) throw { status: 404, message: 'Question not found' };

  return { message: 'Question deleted successfully', question_id: id };
};