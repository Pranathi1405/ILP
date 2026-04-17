/**
 * ============================================================
 * Student SME Controller
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for student-facing course SME test operations:
 *   • List full (parent) published tests with timing status
 *   • Get test pattern / section structure
 *   • Get test questions (via existing findSmeTestById)
 *   • Start / submit attempt
 *   • Get results with extended metrics
 * ============================================================
 */
import { getFullSmeTests, getTestPattern } from '../services/smeTestOrchestrator.service.js';
import * as smeTestService from '../services/smeTest.service.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ──────────────────────────────────────────────────────────────
// GET /api/sme-tests/full
// Published parent tests with timing status
// ──────────────────────────────────────────────────────────────
export const getFullPublishedTests = async (req, res) => {
  try {
    const data = await getFullSmeTests();
    sendSuccess(res, 200, 'Full SME tests fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/sme-tests/:id/pattern
// ──────────────────────────────────────────────────────────────
export const getPattern = async (req, res) => {
  try {
    const data = await getTestPattern(req.params.id);
    sendSuccess(res, 200, 'Test pattern fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/sme-tests/:id/questions
// Returns full test details including shuffled questions for student
// ──────────────────────────────────────────────────────────────
export const getTestQuestions = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

    // Reuse existing black-box utility
    const test = await SmeTestModel.findSmeTestById(id);
    if (!test) throw { status: 404, message: 'Test not found' };
    if (test.status !== 'published') {
      throw { status: 403, message: 'Test is not available' };
    }

    sendSuccess(res, 200, 'Test questions fetched successfully', test);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/sme-tests/:id/start
// ──────────────────────────────────────────────────────────────
export const startAttempt = async (req, res) => {
  try {
    const data = await smeTestService.startAttempt(req.params.id, req.user.id);
    sendSuccess(res, 200, 'Attempt started successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/sme-tests/:id/submit
// ──────────────────────────────────────────────────────────────
export const submitTest = async (req, res) => {
  try {
    const data = await smeTestService.submitTest(
      req.params.id,
      req.user.id,
      req.body.answers
    );
    sendSuccess(res, 200, 'Test submitted successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/sme-tests/:id/results
// Extended results with derived metrics
// ──────────────────────────────────────────────────────────────
export const getTestResults = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    // Find the student's submitted attempt for this test
    const attempt = await SmeTestModel.findExistingAttempt(testId, userId);
    if (!attempt) throw { status: 404, message: 'No attempt found for this test' };
    if (attempt.status === 'in_progress') {
      throw { status: 400, message: 'Test not submitted yet' };
    }

    // Check result release time
    const test = await SmeTestModel.findSmeTestById(testId);
    if (!test) throw { status: 404, message: 'Test not found' };

    const now = new Date();
    const end = new Date(test.scheduled_end);
    if (now < end) {
      throw { status: 400, message: `Results will be available after ${test.scheduled_end}` };
    }

    // Fetch full attempt results (existing black-box)
    const results = await SmeTestModel.getAttemptResults(attempt.attempt_id);
    if (!results) throw { status: 404, message: 'Results not found' };

    // ── Extended metrics ──────────────────────────────────────
    const answers = results.answers || [];
    const totalQuestions = answers.length;
    const attempted = answers.filter(a => a.answer_status === 'answered').length;
    const unattempted = totalQuestions - attempted;
    const correct = answers.filter(a => a.is_correct === 1).length;
    const incorrect = answers.filter(a => a.answer_status === 'answered' && a.is_correct !== 1).length;
    const accuracy = attempted > 0 ? parseFloat(((correct / attempted) * 100).toFixed(2)) : 0;

    sendSuccess(res, 200, 'Results fetched successfully', {
      ...results,
      metrics: {
        total_questions: totalQuestions,
        attempted,
        unattempted,
        correct,
        incorrect,
        score: results.total_score,
        total_marks: test.total_marks,
        accuracy,
      },
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};