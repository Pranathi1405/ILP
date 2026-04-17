/**
 * ============================================================
 * Admin SME Controller
 * ------------------------------------------------------------
 * Module  : SME Test Engine — Course Level
 * Author  : Harshitha Ravuri
 * Description:
 * HTTP layer for admin operations:
 *   • Create course-level SME test (parent + child tests + assignments)
 *   • Publish course SME test (with completion guard)
 * ============================================================
 */
import {
  createCourseSmeTest,
  publishCourseSmeTest,
} from '../services/smeTestOrchestrator.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { getAssignmentsForParent as fetchAssignments } from '../services/assignment.service.js';

// POST /api/admin/sme-tests
export const createAdminSmeTest = async (req, res) => {
  try {
    const data = await createCourseSmeTest(req.user.id, req.body);
    sendSuccess(res, 201, 'Course SME test created successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// PATCH /api/admin/sme-tests/:id/publish
export const publishAdminSmeTest = async (req, res) => {
  try {
    const data = await publishCourseSmeTest(req.params.id);
    sendSuccess(res, 200, 'Course SME test published successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};

// GET /api/admin/sme-tests/:id/assignments
// Useful for admin dashboard — view all subject assignment statuses
export const getTestAssignments = async (req, res) => {
  try {
    const data = await fetchAssignments(req.params.id);
    sendSuccess(res, 200, 'Assignments fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};