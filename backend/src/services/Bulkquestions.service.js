import { v4 as uuidv4 } from 'uuid';
import { bucket } from '../config/gcs.config.js';
import * as QuestionModel from '../models/question.model.js';
import pool from '../config/database.config.js';
import { parseWordFile } from './wordParser.service.js';

// ─── Phase 1: Parse .docx and return preview ─────────────────────────────────
export const parseDocForPreview = async (fileBuffer) => {
  const questions = await parseWordFile(fileBuffer);
  return questions;
};

// ─── Upload a single base64 image to GCS → returns public URL ────────────────
async function uploadBase64Image(base64DataUri, teacherUserId, folder = 'questions') {
  if (!base64DataUri) return null;
  const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1];
  const base64Data = matches[2];
  const ext = mimeType.split('/')[1] || 'png';
  const filename = `${folder}/${teacherUserId}/${uuidv4()}.${ext}`;
  const file = bucket.file(filename);
  const buffer = Buffer.from(base64Data, 'base64');
  await file.save(buffer, { metadata: { contentType: mimeType }, public: true });
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

// ─── Phase 2: Confirm — upload images, insert to DB ──────────────────────────
export const confirmBulkUpload = async (teacherUserId, questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw { status: 400, message: 'questions array is required' };
  }
  if (questions.length > 50) {
    throw { status: 400, message: 'Maximum 50 questions per bulk upload' };
  }

  const missingModuleIds = [];
  questions.forEach((q, i) => { if (!q.module_id) missingModuleIds.push(i + 1); });
  if (missingModuleIds.length > 0) {
    throw { status: 400, message: `Questions at positions ${missingModuleIds.join(', ')} are missing module_id` };
  }

  const results = { success: [], failed: [] };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      if (q.question_type === 'paragraph') {
        const result = await insertParagraphQuestion(teacherUserId, q);
        results.success.push({ index: i, ...result });
      } else {
        const result = await insertSingleQuestion(teacherUserId, q);
        results.success.push({ index: i, question_id: result.question_id });
      }
    } catch (err) {
      results.failed.push({
        index: i,
        question_text: q.question_text || q.paragraph_text || `Question ${i + 1}`,
        error: err.message || 'Unknown error',
      });
    }
  }

  return {
    total: questions.length,
    inserted: results.success.length,
    failed: results.failed.length,
    success: results.success,
    errors: results.failed,
  };
};

// ─── Insert a single question (non-paragraph) ────────────────────────────────
async function insertSingleQuestion(teacherUserId, q) {
  const questionImageUrl = await uploadBase64Image(q.question_image_base64, teacherUserId);
  const processedOptions = await Promise.all(
    (q.options || []).map(async (opt) => ({
      option_text: opt.option_text || '',
      option_image_url: await uploadBase64Image(opt.option_image_base64, teacherUserId, 'options'),
      is_correct: !!opt.is_correct,
    }))
  );

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const questionId = await QuestionModel.insertQuestion(connection, {
      subjectId: null,
      moduleId: q.module_id,
      difficulty: q.difficulty || 'medium',
      questionType: q.question_type,
      questionText: q.question_text,
      questionImageUrl: questionImageUrl || null,
      imagePosition: q.image_position || 'above',
      marks: q.marks || 4,
      createdBy: teacherUserId,
      correctAnswer: q.correct_answer || null,
      explanation: q.explanation || null,
      hints: q.hints || null,
      idealTimeMins: q.ideal_time_mins || null,
      paragraphId: null,
    });
    if (processedOptions.length > 0) {
      await QuestionModel.insertOptions(connection, questionId, processedOptions);
    }
    await connection.commit();
    return QuestionModel.findQuestionById(questionId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ─── Insert a paragraph question ─────────────────────────────────────────────
async function insertParagraphQuestion(teacherUserId, q) {
  const paragraphImageUrl = await uploadBase64Image(q.paragraph_image_base64, teacherUserId, 'paragraphs');

  if (!q.sub_questions || q.sub_questions.length < 2) {
    throw { status: 400, message: 'Paragraph questions require at least 2 sub-questions' };
  }

  const processedSubQs = await Promise.all(
    q.sub_questions.map(async (subQ) => {
      const subQImageUrl = await uploadBase64Image(subQ.question_image_base64, teacherUserId);
      const options = await Promise.all(
        (subQ.options || []).map(async (opt) => ({
          option_text: opt.option_text || '',
          option_image_url: await uploadBase64Image(opt.option_image_base64, teacherUserId, 'options'),
          is_correct: !!opt.is_correct,
        }))
      );
      return { ...subQ, question_image_url: subQImageUrl, options };
    })
  );

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const paragraphId = await QuestionModel.insertParagraph(connection, {
      paragraphText: q.paragraph_text,
      paragraphImageUrl: paragraphImageUrl || null,
      moduleId: q.module_id,
      createdBy: teacherUserId,
    });

    const insertedIds = [];
    for (const subQ of processedSubQs) {
      const questionId = await QuestionModel.insertQuestion(connection, {
        subjectId: null,
        moduleId: q.module_id,
        difficulty: q.difficulty || 'medium',
        questionType: subQ.question_type || 'mcq',
        questionText: subQ.question_text,
        questionImageUrl: subQ.question_image_url || null,
        imagePosition: 'above',
        marks: q.marks || 4,
        createdBy: teacherUserId,
        correctAnswer: subQ.correct_answer || null,
        explanation: subQ.explanation || null,
        hints: subQ.hints || null,
        idealTimeMins: q.ideal_time_mins || null,
        paragraphId,
      });
      if (subQ.options && subQ.options.length > 0) {
        await QuestionModel.insertOptions(connection, questionId, subQ.options);
      }
      insertedIds.push(questionId);
    }

    await connection.commit();
    const inserted = await Promise.all(insertedIds.map((id) => QuestionModel.findQuestionById(id)));
    return { paragraph_id: paragraphId, questions: inserted };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
} 