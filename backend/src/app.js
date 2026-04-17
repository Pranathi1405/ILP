/**
 * AUTHORS: Harshitha Ravuri, Nithyasri
 
 * src/app.js – Express Application Configuration
 * =================================================
 * This file CONFIGURES the Express application.
 *
 * IMPORTANT:
 * - This file DOES NOT start the server.
 * - This file DOES NOT create an HTTP server.
 * - This file DOES NOT initialize Socket.IO.
 *
 * Responsibilities:
 * 1. Create Express app instance
 * 2. Register security middleware (CORS, cookies)
 * 3. Register body parsing middleware
 * 4. Register development logging
 * 5. Mount Swagger documentation
 * 6. Mount API route modules
 * 7. Register 404 handler
 * 8. Register global error handler
 *
 * Pattern:
 * Configure here → Export app → server.js wraps it inside HTTP server
 */

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';

// Internal imports
//notification and announcement routes
import notificationRoutes from './routes/notification.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
//auth and admin routes
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
//course, category, subject, module routes
import categoriesRoutes from './routes/categories.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import subjectRoutes from './routes/subjects.routes.js';
import moduleRoutes from './routes/modules.routes.js';
//import videoRoutes from './routes/videos.routes.js';
import studyMaterialRoutes from './routes/studyMaterial.routes.js';
//analytics routes
import analyticsEventsRoutes from './routes/analyticsEvents.routes.js';
import studentAnalyticsRoutes from './routes/studentAnalytics.routes.js';
import teacherAnalyticsRoutes from './routes/teacherAnalytics.routes.js';
import adminAnalyticsRoutes from './routes/adminAnalytics.routes.js';
import parentAnalyticsRoutes from './routes/parentAnalytics.routes.js';
import smePerformanceRoutes from './routes/smePerformance.routes.js';
//users routes
import userCourseRoutes from './routes/userCourse.routes.js';
// tests
import customUGtestRoutes from './routes/customUGtest.routes.js';
import smeTestRoutes from './routes/smeTest.routes.js';
import practiceTestRoutes from './routes/practiceTest.routes.js';
import adminSmeRoutes from './routes/admin.sme.routes.js';
import teacherSmeRoutes from './routes/teacher.sme.routes.js';
import studentSmeRoutes from './routes/student.sme.routes.js';
import bulkQuestionsRoutes from './routes/bulkQuestions.routes.js';
// payment routes
import paymentRoutes from './routes/payment.routes.js';
// doubt routes
import doubtRoutes from './routes/doubt.routes.js';
import liveClassRoutes from './routes/liveClass.routes.js';
import questionRoutes from './routes/question.routes.js';
import settingRoutes from './routes/settings.routes.js';
import { swaggerSpec, swaggerUiOptions } from './config/swagger/index.js';
import morgan from 'morgan';
import logger from './utils/logger.js';

// ── 1. CREATE EXPRESS APPLICATION ─────────────────────────────────────────────
const app = express();
const IS_DEV = process.env.NODE_ENV !== 'production';
app.set('trust proxy', 1);
// ── 2. SECURITY MIDDLEWARE ─────────────────────────────────────────────────────

app.use(
  cors({
    // ✅ Allow frontend + test HTML (important fix)
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(cookieParser());

// ── 3. BODY PARSING MIDDLEWARE ────────────────────────────────────────────────

// ✅ IMPORTANT: webhook needs raw BEFORE json parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(morgan(IS_DEV ? 'dev' : 'combined', { stream: logger.stream }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ SERVE STATIC FILES (FIXES "Failed to fetch")
app.use(express.static('public'));
//bulk questions upload 
app.use('/api/bulk-questions', bulkQuestionsRoutes);
app.use('/uploads', express.static('src/uploads'));

// ── 4. REQUEST LOGGING (Development Only) ────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── 5. SWAGGER API DOCUMENTATION ─────────────────────────────────────────────

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── 6. HEALTH CHECK ENDPOINT ──────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ILP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ── 7. ROOT ENDPOINT ──────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'ILP Backend API is running ✅',
  });
});

// ── 8. REGISTER ROUTES ─────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/custom-ug-tests', customUGtestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoriesRoutes);
// //question routes
app.use('/api/questions', questionRoutes);
//SME TEST Routes

app.use('/api/admin/sme-tests', adminSmeRoutes);
app.use('/api/teacher/sme-tests', teacherSmeRoutes);
app.use('/api/sme-tests', studentSmeRoutes);
app.use('/api/sme-tests', smeTestRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
//app.use('/api/videos', videoRoutes);

//users
app.use('/api/userCourse', userCourseRoutes);

//analytics routes
//unified endpoint is registered at /api/analytics/events
app.use('/api/analytics', analyticsEventsRoutes);
app.use('/api/analytics/student', studentAnalyticsRoutes);
app.use('/api/analytics/teacher', teacherAnalyticsRoutes);
app.use('/api/analytics/admin', adminAnalyticsRoutes);
app.use('/api/analytics/parent', parentAnalyticsRoutes);
app.use('/api/v1', smePerformanceRoutes);

// ✅ PAYMENT ROUTES (webhook already handled above)
app.use('/api/payments', paymentRoutes);

app.use('/api/settings', settingRoutes);
app.use('/api/practice-tests', practiceTestRoutes);

// ── 9. 404 HANDLER ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Check /api/docs for available endpoints.',
  });
});

// ── 10. GLOBAL ERROR HANDLER ───────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong. Please try again.',
  });
});

export default app;
