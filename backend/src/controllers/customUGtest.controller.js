/**
 * ============================================================
 * Custom UG Exam Test Controller
 * ------------------------------------------------------------
 * Module  : Test Generator - Custom UG Exam Engine
 * Author  : NDMATRIX
 * Description:
 * Handles HTTP requests for custom UG exam test generation.
 * Fully self-contained — all calls go through customUGtest.service.
 * No dependency on UG test module.
 * ============================================================
 */
import * as customUgTestService from '../services/customUGtest.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';

// GET /api/custom-ug-t ests/exams/:examCode/pattern
export const getCustomExamPattern = async (req, res) => {
  try {
    const { examCode } = req.params;
    const userId = req.user.id;
    const subjectIds = req.query.subjectIds
      ? req.query.subjectIds.split(',').map(id => parseInt(id)).filter(Boolean)
      : [];
    const difficulty = req.query.difficulty?.trim() || null;

    const data = await customUgTestService.getCustomExamPattern(examCode, userId, subjectIds, difficulty);
    sendSuccess(res, 200, 'Custom exam pattern fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
// POST /api/custom-ug-tests/generate
export const generateCustomUgTest = async (req, res) => {
  try {
    const data = await customUgTestService.generateCustomUgTest(req.user.id, req.body);
    sendSuccess(res, 201, 'Custom UG exam test generated successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};
// GET /api/custom-ug-tests/exams
export const getAvailableExams = async (req, res) => {
  try {
    const data = await customUgTestService.getAvailableExams(req.user.id);
    sendSuccess(res, 200, 'Exams fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/custom-ug-tests/exams/:examCode/subjects
export const getSubjectsForExam = async (req, res) => {
  try {
    const data = await customUgTestService.getSubjectsForExam(req.params.examCode, req.user.id);
    sendSuccess(res, 200, 'Subjects fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/custom-ug-tests/chapters?subjectId=2
export const getChaptersBySubject = async (req, res) => {
  try {
    console.log('query params:', req.query);       // ← add
    console.log('subjectId:', req.query.subjectId); // ← add
    const data = await customUgTestService.getChaptersBySubject(req.query.subjectId);
    sendSuccess(res, 200, 'Chapters fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/custom-ug-tests
export const getMyCustomUgTests = async (req, res) => {
  try {
    const result = await customUgTestService.getMyCustomTests(req.user.id, req.query);
    sendPaginated(res, 'Tests fetched successfully', result.data, result.pagination);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/custom-ug-tests/:testId
export const getCustomUgTestById = async (req, res) => {
  try {
    const data = await customUgTestService.getCustomTestById(req.params.testId, req.user.id);
    sendSuccess(res, 200, 'Test fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/custom-ug-tests/:testId/start
export const startAttempt = async (req, res) => {
  try {
    const data = await customUgTestService.startAttempt(req.params.testId, req.user.id);
    sendSuccess(res, 200, 'Attempt started successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/custom-ug-tests/:testId/submit
export const submitTest = async (req, res) => {
  try {
    const data = await customUgTestService.submitTest(req.params.testId, req.user.id, req.body.answers);
    sendSuccess(res, 200, 'Test submitted successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/custom-ug-tests/attempts/:attemptId/results
export const getResults = async (req, res) => {
  try {
    const data = await customUgTestService.getResults(req.params.attemptId, req.user.id);
    sendSuccess(res, 200, 'Results fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};