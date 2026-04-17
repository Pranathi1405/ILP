 import * as QuestionModel from '../models/question.model.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const addQuestion = async (req, res) => {
  try {
    const question = await QuestionModel.createQuestion(req.body, req.user.id);
    return sendSuccess(res, 201, 'Question added successfully', { question });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to add question');
  }
};

export const addParagraphQuestion = async (req, res) => {
  try {
    const result = await QuestionModel.createParagraphQuestion(req.body, req.user.id);
    return sendSuccess(res, 201, 'Paragraph question added successfully', result);
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to add paragraph question');
  }
};

export const addBulkQuestions = async (req, res) => {
  try {
    const result = await QuestionModel.createBulkQuestions(req.body.questions, req.user.id);
    return sendSuccess(res, 201, 'Bulk questions added successfully', result);
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to add bulk questions');
  }
};

export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return sendError(res, 400, 'subjectId is required');
    const questions = await QuestionModel.findBySubject(parseInt(subjectId));
    return sendSuccess(res, 200, 'Questions fetched successfully', { questions });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to fetch questions');
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const question = await QuestionModel.findQuestionById(parseInt(req.params.id));
    if (!question) return sendError(res, 404, 'Question not found');
    return sendSuccess(res, 200, 'Question fetched successfully', { question });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to fetch question');
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const question = await QuestionModel.updateQuestion(parseInt(req.params.id), req.body);
    return sendSuccess(res, 200, 'Question updated successfully', { question });
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to update question');
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    await QuestionModel.deleteQuestion(parseInt(req.params.id));
    return sendSuccess(res, 200, 'Question deleted successfully');
  } catch (err) {
    return sendError(res, err.status || 500, err.message || 'Failed to delete question');
  }
};