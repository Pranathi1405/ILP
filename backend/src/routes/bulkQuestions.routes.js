/**
 * src/routes/bulkQuestions.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes for the Bulk Questions Upload module.
 * All routes require authentication and teacher role.
 *
 * POST /api/bulk-questions/parse-doc
 *   Multipart form upload of a .docx file.
 *   Returns structured question preview with base64 images.
 *   File size limit: 20 MB (Word docs with embedded images can be large).
 *
 * POST /api/bulk-questions/confirm
 *   JSON body: { questions: [...] }  (parsed questions with module_ids filled in)
 *   Returns upload summary: total, inserted, failed, errors.
 *
 * GET /api/bulk-questions/modules?subjectId=<id>
 *   Returns published modules for a subject (teacher must be assigned to it).
 *   Powers the module_id dropdown on the review page.
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  parseDoc,
  confirmUpload,
  getModulesForSubject,
} from '../controllers/bulkQuestions.controller.js';

const router = Router();

// multer: memory storage, 20 MB limit (Word docs with images can be large)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are accepted'), false);
    }
  },
});

// ── Phase 1: Parse .docx → question preview ──────────────────────────────────
router.post(
  '/parse-doc',
  authenticate,
  authorize('teacher'),
  upload.single('file'),
  parseDoc
);

// ── Phase 2: Confirm reviewed questions → DB insert ──────────────────────────
router.post(
  '/confirm',
  authenticate,
  authorize('teacher'),
  confirmUpload
);

// ── Helper: module dropdown ───────────────────────────────────────────────────
router.get(
  '/modules',
  authenticate,
  authorize('teacher'),
  getModulesForSubject
);

export default router;