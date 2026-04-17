import * as bulkQuestionsService from '../services/bulkQuestions.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import pool from '../config/database.config.js';

export const parseDoc = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded. Please attach a .docx file.');
    }
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return sendError(res, 400, 'Only .docx files are supported.');
    }
    const questions = await bulkQuestionsService.parseDocForPreview(req.file.buffer);
    if (!questions || questions.length === 0) {
      return sendError(res, 422, 'No questions found in the document. Make sure blocks are separated by --- and use the correct KEY: value format.');
    }
    return sendSuccess(res, 200, `${questions.length} question(s) parsed successfully`, {
      total: questions.length,
      questions,
    });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to parse document');
  }
};

export const confirmUpload = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return sendError(res, 400, 'questions array is required');
    }
    const result = await bulkQuestionsService.confirmBulkUpload(req.user.id, questions);
    const statusCode = result.failed === 0 ? 201 : 207;
    const message =
      result.failed === 0
        ? `All ${result.inserted} question(s) uploaded successfully`
        : `${result.inserted} question(s) uploaded, ${result.failed} failed`;
    return sendSuccess(res, statusCode, message, result);
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Bulk upload failed');
  }
};

export const getModulesForSubject = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId || isNaN(parseInt(subjectId))) {
      return sendError(res, 400, 'subjectId query param is required');
    }
    const id = parseInt(subjectId);
    const teacherUserId = req.user.id;
    const [[access]] = await pool.query(
      `SELECT cs.subject_id 
       FROM course_subjects cs
       JOIN teachers t ON t.teacher_id = cs.teacher_id
       WHERE t.user_id = ? AND cs.subject_id = ? AND cs.is_active = 1`,
      [teacherUserId, id]
    );
    if (!access) {
      return sendError(res, 403, 'You are not assigned to this subject');
    }
    const [modules] = await pool.query(
      `SELECT module_id, module_name, module_order
       FROM subject_modules
       WHERE subject_id = ? AND is_published = 1
       ORDER BY module_order ASC, module_name ASC`,
      [id]
    );
    return sendSuccess(res, 200, 'Modules fetched successfully', { modules });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to fetch modules');
  }
};