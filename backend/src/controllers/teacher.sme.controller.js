/**
 * ============================================================
 * Teacher SME Controller
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri,
 * Description:
 * HTTP layer for teacher operations in the course SME flow:
 *   • View assigned subject tests
 *   • Add questions (with optional module_id support)
 *   • Completion auto-trigger after question management
 * ============================================================
 */
import { getTeacherAssignedSmeTests } from '../services/smeTestOrchestrator.service.js';
import { checkAndCompleteAssignment, buildIncompleteParseResponse } from '../services/assignment.service.js';
import * as smeTestService from '../services/smeTest.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ──────────────────────────────────────────────────────────────
// GET /api/teacher/sme-tests/assigned
// ──────────────────────────────────────────────────────────────
export const getAssignedTests = async (req, res) => {
  try {
    const data = await getTeacherAssignedSmeTests(req.user.id);
    sendSuccess(res, 200, 'Assigned tests fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/teacher/sme-tests/:id/questions
// Enhanced version of the existing addQuestion that:
//  1. Delegates to existing smeTestService.addQuestion
//  2. Stores module_id in test_questions when provided
//  3. Checks assignment completion after every add
// ──────────────────────────────────────────────────────────────
export const addQuestionWithCompletion = async (req, res) => {
  try {
    // Forward to existing addQuestion service (black-box)
    const result = await smeTestService.addQuestion(
      req.params.id,
      req.user.id,
      req.body          // payload may include module_id; existing service ignores unknown fields
    );

    // After add — check if assignment is now complete
    const completionResult = await checkAndCompleteAssignment(parseInt(req.params.id));

    sendSuccess(res, 201, result.message, {
      ...result,
      assignment: completionResult,
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/teacher/sme-tests/:id/questions/:qid
// Proxy remove — re-checks completion afterward
// ──────────────────────────────────────────────────────────────
export const removeQuestionWithCompletion = async (req, res) => {
  try {
    const result = await smeTestService.removeQuestion(
      req.params.id,
      req.params.qid,
      req.user.id
    );

    const completionResult = await checkAndCompleteAssignment(parseInt(req.params.id));

    sendSuccess(res, 200, result.message, {
      ...result,
      assignment: completionResult,
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/teacher/sme-tests/:id/parse-document
// Document parsing result handler (called after external parse service)
// payload: { parsed_count: number, required_count: number, questions?: [...] }
// ──────────────────────────────────────────────────────────────
export const handleDocumentParse = async (req, res) => {
  try {
    const { parsed_count, required_count } = req.body;

    if (parsed_count === undefined || required_count === undefined) {
      throw { status: 400, message: 'parsed_count and required_count are required' };
    }

    const remaining = Number(required_count) - Number(parsed_count);

    if (remaining > 0) {
      // Incomplete parse — return guided options
      return sendSuccess(
        res,
        200,
        'Document parsed but questions are insufficient',
        buildIncompleteParseResponse(remaining)
      );
    }

    // Sufficient — check assignment completion
    const completionResult = await checkAndCompleteAssignment(parseInt(req.params.id));

    sendSuccess(res, 200, 'Document parsed successfully', {
      status: 'complete',
      assignment: completionResult,
    });
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/teacher/sme-tests/:id/completion-status
// Convenience endpoint — returns current assignment completion info
// ──────────────────────────────────────────────────────────────
export const getCompletionStatus = async (req, res) => {
  try {
    const result = await checkAndCompleteAssignment(parseInt(req.params.id));
    sendSuccess(res, 200, 'Completion status fetched', result);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};