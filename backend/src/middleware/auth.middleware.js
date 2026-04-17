/**
 * AUTHORS: Sathvik Goli,
 * Authentication Middleware
 * **/
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { checkTeacherApproval } from '../services/auth.services.js';
export const authenticate = async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ message: 'Access token not found. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role, permissions: decoded.permissions || [] };
    if (req.user.role === 'teacher') {
      const checkteacher = await checkTeacherApproval(decoded.id);
      if (!checkteacher) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. You will be notified once approved.',
        });
      }
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ message: 'Access token expired. Please refresh your session.' });
    }
    return res.status(401).json({ message: 'Invalid access token.' });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
};

export const requirePermission = (...allowedPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (req.user.role == 'super_admin') {
      return next();
    }

    const permissions = req.user?.permissions || {};

    const hasPermission = allowedPermissions.some((permission) => permissions[permission] === true);

    if (!hasPermission) {
      return res.status(403).json({
        message: `Access denied. Required permission(s): ${allowedPermissions.join(', ')}.`,
      });
    }

    next();
  };
};
// ── Common role guards (shorthand) ───────────────────────────────────────────

export const studentOnly = authorize('student');
export const teacherOnly = authorize('teacher');
export const parentOnly = authorize('parent');
export const adminOnly = authorize('admin');
export const teacherOrAdmin = authorize('teacher', 'admin');
export const allRoles = authorize('student', 'teacher', 'parent', 'admin');

export const userManagerOnly = requirePermission('user_management');
export const courseManagerOnly = requirePermission('course_management');
export const financeManagerOnly = requirePermission('finance_management');
export const announementManagerOnly = requirePermission('announcement_management');

export const rlimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  message: 'Too many requests within 5 minutes',
});