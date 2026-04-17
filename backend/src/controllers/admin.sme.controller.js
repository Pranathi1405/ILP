/**
 * ============================================================
 * Admin SME Controller
 * ------------------------------------------------------------
 * Module  : Course-Level SME Test Engine
 * Author  : Harshitha Ravuri
 * ============================================================
 */
import {
  createCourseSmeTest,
  getAllCourseSmeTests,
  publishCourseSmeTest,
} from '../services/smeTestOrchestrator.service.js';
import { getAssignmentsForParent } from '../services/assignment.service.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/responseHandler.js';

// POST /api/admin/sme-tests
export const createAdminSmeTest = async (req, res) => {
  try {
    const data = await createCourseSmeTest(req.user.id, req.body);
    sendSuccess(res, 201, 'Course SME test created successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message, err.details);
  }
};

// GET /api/admin/sme-tests
export const getAdminSmeTests = async (req, res) => {
  try {
    const result = await getAllCourseSmeTests(req.query);
    sendPaginated(res, 'Course SME tests fetched successfully', result.data, result.pagination);
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
    // Include pending_subjects detail in response when publish is blocked
    sendError(res, err.status || 500, err.message, err.details);
  }
};

// GET /api/admin/sme-tests/:id/assignments
export const getTestAssignments = async (req, res) => {
  try {
    const data = await getAssignmentsForParent(req.params.id);
    sendSuccess(res, 200, 'Assignments fetched successfully', data);
  } catch (err) {
    sendError(res, err.status || 500, err.message);
  }
};