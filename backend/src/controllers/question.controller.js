/**
 * ============================================================
 * Question Controller
 * ------------------------------------------------------------
 * Module  : Question Bank
 * Author  : NDMATRIX
 * Description:
 * Handles HTTP requests for question bank management.
 * ============================================================
 */
import * as questionService from '../services/question.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';

// POST /api/questions
export const addQuestion = async (req, res) => {
  try {
    const data = await questionService.addQuestion(req.user.id, req.body);
    sendSuccess(res, 201, 'Question added successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/questions/paragraph
export const addParagraphQuestion = async (req, res) => {
  try {
    const data = await questionService.addParagraphQuestion(req.user.id, req.body);
    sendSuccess(res, 201, 'Paragraph question added successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/questions/bulk
export const addBulkQuestions = async (req, res) => {
  try {
    const data = await questionService.addBulkQuestions(req.user.id, req.body.questions);
    sendSuccess(res, 201, 'Bulk upload completed', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/questions?subjectId=259&difficulty=easy&questionType=mcq&page=1&limit=20
export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId, difficulty, questionType, page, limit } = req.query;
    const result = await questionService.getQuestionsBySubject(
      req.user.id, subjectId, { difficulty, questionType, page, limit }
    );
    sendPaginated(res, 'Questions fetched successfully', result.data, result.pagination);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/questions/:id
export const getQuestionById = async (req, res) => {
  try {
    const data = await questionService.getQuestionById(req.params.id);
    sendSuccess(res, 200, 'Question fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
// PATCH /api/questions/:id
export const updateQuestion = async (req, res) => {
  try {
    const data = await questionService.updateQuestion(
      req.user.id,
      req.params.id,
      req.body
    );
    sendSuccess(res, 200, 'Question updated successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// DELETE /api/questions/:id
export const deleteQuestion = async (req, res) => {
  try {
    const data = await questionService.deleteQuestion(req.user.id, req.params.id);
    sendSuccess(res, 200, data.message, data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};