/**
 * ============================================================
 * SME Test Controller
 * ------------------------------------------------------------
 * Module  : SME Test Engine
 * Author  : NDMATRIX
 * Description:
 * Handles HTTP requests for SME test creation, question
 * management, attempt flow, results and analytics.
 * ============================================================
 */
// In smeTest.controller.js — add these 3 imports from customUGtest service
import {
  getAvailableExams,
  getSubjectsForExam,
  getChaptersBySubject,
} from '../services/customUGtest.service.js';

// GET /api/sme-tests/exams
export const getExams = async (req, res) => {
  try {
    const data = await getAvailableExams(req.user.id);
    sendSuccess(res, 200, 'Exams fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/exams/:examCode/subjects
export const getSubjects = async (req, res) => {
  try {
    const data = await getSubjectsForExam(req.params.examCode, req.user.id);
    sendSuccess(res, 200, 'Subjects fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/chapters?subjectId=2
export const getChapters = async (req, res) => {
  try {
    const data = await getChaptersBySubject(req.query.subjectId); // ← fix here
    sendSuccess(res, 200, 'Chapters fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

import * as smeTestService from '../services/smeTest.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';

// GET /api/sme-tests/teacher/dealing-subjects
export const getTeacherDealingSubjects = async (req, res) => {
  try {
    const data = await smeTestService.getTeacherDealingSubjectsService(req.user.id);
    sendSuccess(res, 200, 'Teacher dealing subjects fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/sme-tests
export const createSmeTest = async (req, res) => {
  try {
    const data = await smeTestService.createSmeTest(req.user.id, req.body);
    sendSuccess(res, 201, 'SME test created successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests
// Teacher → their own tests | Student → published tests
export const getSmeTests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;
    let result;

    if (userType === 'teacher') {
      result = await smeTestService.getMySmeTests(userId, req.query);
    } else {
      result = await smeTestService.getPublishedSmeTests(req.query, req.user.id);
    }

    sendPaginated(res, 'Tests fetched successfully', result.data, result.pagination);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/:id
export const getSmeTestById = async (req, res) => {
  try {
    const data = await smeTestService.getSmeTestById(req.params.id, req.user.id, req.user.type);
    sendSuccess(res, 200, 'Test fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
// PATCH /api/sme-tests/:id
export const updateSmeTest = async (req, res) => {
  try {
    const data = await smeTestService.updateSmeTest(
      req.params.id,
      req.user.id,
      req.body
    );
    sendSuccess(res, 200, 'Test updated successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/:id/available-questions
export const getAvailableQuestions = async (req, res) => {
  try {
    const data = await smeTestService.getAvailableQuestions(req.params.id, req.query);
    sendSuccess(res, 200, 'Questions fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/sme-tests/:id/questions
export const addQuestion = async (req, res) => {
  try {
    const data = await smeTestService.addQuestion(req.params.id, req.user.id, req.body);
    sendSuccess(res, 201, data.message, data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// DELETE /api/sme-tests/:id/questions/:qid
export const removeQuestion = async (req, res) => {
  try {
    const data = await smeTestService.removeQuestion(req.params.id, req.params.qid, req.user.id);
    sendSuccess(res, 200, data.message, data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// PATCH /api/sme-tests/:id/publish
export const publishTest = async (req, res) => {
  try {
    const data = await smeTestService.publishTest(req.params.id, req.user.id);
    sendSuccess(res, 200, 'Test published successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

export const deleteSmeTest = async (req, res) => {
  try {
    const data = await smeTestService.deleteSmeTest(
      req.params.id,
      req.user.id
    );

    sendSuccess(res, 200, 'Test deleted successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/sme-tests/:id/start
export const startAttempt = async (req, res) => {
  try {
    const data = await smeTestService.startAttempt(req.params.id, req.user.id);
    sendSuccess(res, 200, 'Attempt started successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/sme-tests/:id/submit
export const submitTest = async (req, res) => {
  try {
    const data = await smeTestService.submitTest(req.params.id, req.user.id, req.body.answers);
    sendSuccess(res, 200, 'Test submitted successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/attempts/:attemptId/results
export const getResults = async (req, res) => {
  try {
    const data = await smeTestService.getResults(req.params.attemptId, req.user.id);
    sendSuccess(res, 200, 'Results fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/sme-tests/:id/analytics
export const getSmeTestAnalytics = async (req, res) => {
  try {
    const data = await smeTestService.getSmeTestAnalytics(req.params.id, req.user.id);
    sendSuccess(res, 200, 'Analytics fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
