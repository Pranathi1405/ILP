// ============================================================
// src/controllers/parentAnalytics.controller.js
// HTTP handlers for parent analytics endpoints.
// Controllers: validate input → call service → send response.
// ============================================================

import {
  getParentLinkedStudents,
  getParentDashboard,
} from '../services/parentAnalytics.service.js';
import logger from '../utils/logger.js';
import { getParentIdByUserId } from '../models/targetResolution.model.js';
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const sendSuccess = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

const sendError = (res, message = 'Something went wrong', status = 500) =>
  res.status(status).json({ success: false, message });

// ─────────────────────────────────────────────────────────────
// GET /analytics/parent/students
// Returns all students linked to the authenticated parent.
// ─────────────────────────────────────────────────────────────

export const getLinkedStudents = async (req, res) => {
  try {
    const parentId = await getParentIdByUserId(req.user.id);

    if (!parentId) {
      return sendError(res, 'Parent profile not found', 400);
    }

    const data = await getParentLinkedStudents(parentId);
    return sendSuccess(res, data, 'Linked students fetched successfully');
  } catch (error) {
    logger.error('[ParentAnalytics] getLinkedStudents error', { error: error.message });
    if (error.status) return sendError(res, error.message, error.status);
    return sendError(res, 'Failed to fetch linked students');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /analytics/parent/dashboard?studentId=<id>
// Returns the analytics dashboard for one student.
//
// studentId rules (from TRS):
//   - Required if parent has multiple children
//   - Optional if parent has exactly one child
//   - Falls back to is_primary = 1 if set and studentId omitted
// ─────────────────────────────────────────────────────────────

export const getParentDashboardHandler = async (req, res) => {
  try {
    const parentId  = await getParentIdByUserId(req.user.id);
    const studentId = req.query.studentId ?? null;

    if (!parentId) {
      return sendError(res, 'Parent profile not found', 400);
    }

    // studentId must be a positive integer if provided
    if (studentId !== null && (isNaN(studentId) || parseInt(studentId, 10) < 1)) {
      return sendError(res, 'studentId must be a valid positive integer', 400);
    }

    const data = await getParentDashboard(parentId, studentId);
    return sendSuccess(res, data, 'Parent dashboard fetched successfully');
  } catch (error) {
    logger.error('[ParentAnalytics] getParentDashboard error', { error: error.message });
    if (error.status) return sendError(res, error.message, error.status);
    return sendError(res, 'Failed to fetch parent dashboard');
  }
};