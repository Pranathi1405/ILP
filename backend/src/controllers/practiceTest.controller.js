import * as practiceService from '../services/practiceTest.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';

// POST /api/practice-tests/create
export const createPracticeTest = async (req, res) => {
  try {
    const data = await practiceService.createPracticeTest(req.user.id, req.body);
    sendSuccess(res, 201, 'Practice test created successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/practice-tests
export const getAllPracticeTests = async (req, res) => {
  try {
    const result = await practiceService.getAllPracticeTests(req.user.id, req.query);
    sendPaginated(res, 'Practice tests fetched successfully', result.data, result.pagination);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/practice-tests/:testId
export const getPracticeTest = async (req, res) => {
  try {
    const data = await practiceService.getPracticeTest(req.params.testId, req.user.id);
    sendSuccess(res, 200, 'Practice test fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/practice-tests/:testId/start
export const startPracticeTest = async (req, res) => {
  try {
    const data = await practiceService.startPracticeTest(req.params.testId, req.user.id);
    sendSuccess(res, 200, data.resumed ? 'Attempt resumed' : 'Attempt started successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/practice-tests/:testId/answer
// Frontend sends a flat object:
//   { questionId, selected_option_id? }         ← MCQ
//   { questionId, selected_option_ids?: [] }     ← MSQ
//   { questionId, numerical_answer?: string }    ← NAT
// Returns instant feedback: isCorrect, correctOptionId, explanation, allOptions
export const submitAnswer = async (req, res) => {
  try {
    const { questionId, ...answerPayload } = req.body;

    if (!questionId) {
      return sendError(res, 400, 'questionId is required');
    }

    const data = await practiceService.submitAnswer(
      req.params.testId,
      req.user.id,
      questionId,
      answerPayload,
    );
    sendSuccess(res, 200, 'Answer submitted', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/practice-tests/:testId/hint/:questionId
export const getHint = async (req, res) => {
  try {
    const data = await practiceService.getHint(
      req.params.testId,
      req.user.id,
      req.params.questionId,
    );
    sendSuccess(res, 200, 'Hint fetched', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// POST /api/practice-tests/:testId/submit
// Body: { answers: [{ questionId, selected_option_id?, selected_option_ids?, numerical_answer? }] }
export const submitPracticeTest = async (req, res) => {
  try {
    if (!req.body.answers || !Array.isArray(req.body.answers)) {
      return sendError(res, 400, 'answers array is required');
    }
    const data = await practiceService.submitPracticeTest(
      req.params.testId,
      req.user.id,
      req.body.answers,
    );
    sendSuccess(res, 200, 'Test submitted successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/practice-tests/attempts/:attemptId/results
export const getPracticeTestResults = async (req, res) => {
  try {
    const data = await practiceService.getPracticeTestResults(req.params.attemptId, req.user.id);
    sendSuccess(res, 200, 'Results fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/practice-tests/summary
export const getPracticeResultsSummary = async (req, res) => {
  try {
    const data = await practiceService.getPracticeResultsSummary(req.user.id);
    sendSuccess(res, 200, 'Summary fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};