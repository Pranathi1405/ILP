/**
 * ============================================================
 * Student SME Controller
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for student-facing course SME test operations.
 * - Enforces test.status == 'published' before attempt
 * - Enforces schedule window (now within start–end)
 * - Prevents duplicate attempts
 * - Aggregates parent test questions from children
 * ============================================================
 */
import {
  getFullSmeTests,
  getTestPattern,
  getTestWithQuestions,
} from '../services/smeTestOrchestrator.service.js';
import * as smeTestService from '../services/smeTest.service.js';
import * as SmeTestModel from '../models/smeTest.model.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ──────────────────────────────────────────────────────────────
// GET /api/sme-tests/full
// ──────────────────────────────────────────────────────────────
export const getFullPublishedTests = async (req, res) => {
  try {
    const data = await getFullSmeTests(req.user.id);
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
// Parent test → aggregates all child questions (dynamic, no data copy).
// Child  test → standard findSmeTestById response.
// ──────────────────────────────────────────────────────────────
export const getTestQuestions = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw { status: 400, message: 'Invalid test ID' };

    const test = await SmeTestModel.findSmeTestById(id);
    if (!test) throw { status: 404, message: 'Test not found' };
    if (test.status !== 'published') {
      throw { status: 403, message: 'Test is not available' };
    }

    // Use orchestrator so parent tests return merged questions
    const data = await getTestWithQuestions(id);
    sendSuccess(res, 200, 'Test questions fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/sme-tests/:id/start
// Validations:
//   1. test.status === 'published'
//   2. current time within schedule window
//   3. no existing completed attempt (duplicate prevention)
// ──────────────────────────────────────────────────────────────
export const startAttempt = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);

    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    const test = await SmeTestModel.findSmeTestById(testId);
    if (!test) throw { status: 404, message: 'Test not found' };

    // ── 1. Published gate ──────────────────────────────────────
    if (test.status !== 'published') {
      throw { status: 403, message: 'Test is not available yet' };
    }

    // ── 2. Schedule window gate ────────────────────────────────
    const now   = new Date();
    const start = new Date(test.scheduled_start);
    const end   = new Date(test.scheduled_end);

    if (now < start) {
      throw { status: 400, message: `Test starts at ${test.scheduled_start}` };
    }
    if (now > end) {
      throw { status: 400, message: 'Test window has ended' };
    }

    // ── 3. Duplicate attempt guard ─────────────────────────────
    const existing = await SmeTestModel.findExistingAttempt(testId, userId);
    if (existing && existing.status !== 'in_progress') {
      throw { status: 400, message: 'You have already completed this test' };
    }

    // Delegate to existing service (handles in_progress resume internally)
    const data = await smeTestService.startAttempt(testId, userId);
    sendSuccess(res, 200, 'Attempt started successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/sme-tests/:id/submit
// Body: { answers: [{ question_id, selected_option_id }] }
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
// Available only after test.scheduled_end has passed.
// ──────────────────────────────────────────────────────────────
export const getTestResults = async (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    if (isNaN(testId)) throw { status: 400, message: 'Invalid test ID' };

    const attempt = await SmeTestModel.findExistingAttempt(testId, userId);
    if (!attempt) throw { status: 404, message: 'No attempt found for this test' };
    if (attempt.status === 'in_progress') {
      throw { status: 400, message: 'Test not submitted yet' };
    }

    const test = await SmeTestModel.findSmeTestById(testId);
    if (!test) throw { status: 404, message: 'Test not found' };

    const now = new Date();
    const end = new Date(test.scheduled_end);
    if (now < end) {
      throw { status: 400, message: `Results will be available after ${test.scheduled_end}` };
    }

    const results = await SmeTestModel.getAttemptResults(attempt.attempt_id);
    if (!results) throw { status: 404, message: 'Results not found' };

    // Derive extended metrics
    const answers        = results.answers || [];
    const totalQuestions = answers.length;
    const attempted      = answers.filter(a => a.answer_status === 'answered').length;
    const unattempted    = totalQuestions - attempted;
    const correct        = answers.filter(a => a.is_correct === 1).length;
    const incorrect      = answers.filter(
      a => a.answer_status === 'answered' && a.is_correct !== 1
    ).length;
    const accuracy = attempted > 0
      ? parseFloat(((correct / attempted) * 100).toFixed(2))
      : 0;

    sendSuccess(res, 200, 'Results fetched successfully', {
      ...results,
      metrics: {
        total_questions: totalQuestions,
        attempted,
        unattempted,
        correct,
        incorrect,
        score:       results.total_score,
        total_marks: test.total_marks,
        accuracy,
      },
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};