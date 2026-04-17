/**
 * AUTHORS: Harshitha Ravuri, NDMATRIX
 * server.js – Application Entry Point
 * =====================================
 * This is the FIRST file that runs when starting the backend.
 *
 * Responsibilities:
 * 1. Load environment variables
 * 2. Import configured Express app
 * 3. Create HTTP server (required for Socket.IO)
 * 4. Attach Socket.IO to HTTP server
 * 5. Test database connection
 * 6. Start listening on configured port
 * 7. Handle graceful shutdown
 * 8. Handle uncaught exceptions and promise rejections
 *
 * IMPORTANT:
 * - All middleware & routes live in src/app.js
 * - Only infrastructure bootstrapping happens here
 */

import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import configured Express app
import app from './src/app.js';

// Import cron jobs
import './src/utils/cronJobs.js';

// Database connection test
import { testDatabaseConnection } from './src/config/database.config.js';

// WebSocket handler
import { registerSocketHandlers,setSocketIO} from './src/websockets/handlers/notification.handler.js';
import { authenticateSocket } from './src/middleware/socketAuth.middleware.js';
import { startWorkers }  from './src/queues/startWorkers.js';

// ── 1. CREATE RAW HTTP SERVER ─────────────────────────────────────────────────

/**
 * Express alone is NOT enough for Socket.IO.
 * Socket.IO must attach to a raw Node.js HTTP server.
 */
const httpServer = createServer(app);

// ── 2. INITIALIZE SOCKET.IO ───────────────────────────────────────────────────

/**
 * Socket.IO enables real-time communication.
 *
 * IMPORTANT (Cookies + CORS):
 * ---------------------------
 * - Cookies are ONLY sent if:
 *   ✔ frontend uses withCredentials: true
 *   ✔ backend sets credentials: true
 *   ✔ origin is NOT '*'
 *
 * - If origin = '*', cookies WILL NOT be sent ❌
 */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL, // MUST be exact frontend URL
    methods: ['GET', 'POST'],
    credentials: true, //  REQUIRED for cookie-based auth
  },
});

/**
 * Attach authentication middleware
 * --------------------------------
 * This runs BEFORE any connection is established.
 * If authentication fails → connection is rejected.
 */
io.use(authenticateSocket);

/**
 * Make io globally accessible (used in notification service)
 */
setSocketIO(io);

/**
 * Register all WebSocket event handlers
 */
registerSocketHandlers(io);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Start BullMQ workers
// ─────────────────────────────────────────────────────────────────────────────

// startWorkers() does three things:
//   a) Starts notification.worker.js — listens to "notification-delivery" queue
//      Handles: DB batch insert + WebSocket emit + push notifications
//
//   b) Starts recurring.worker.js   — listens to "recurring-jobs" queue
//      Handles: the 3 jobs that used to run via setInterval
//
//   c) Registers 3 repeatable jobs in Redis (fire every 60 seconds):
//      - CHECK_SCHEDULED_ANNOUNCEMENTS
//      - EXPIRE_ANNOUNCEMENTS
//      - SEND_PENDING_TEACHER_NOTIFICATIONS
//
// We await it because the worker setup involves async Redis calls
// (removing old repeatable jobs, registering new ones).
if (process.env.ENABLE_QUEUES === 'true') {
  await startWorkers();
}

// ── 3. READ ENV CONFIG ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── 4. START SERVER ───────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    // Ensure DB is connected BEFORE accepting traffic
    await testDatabaseConnection();

    httpServer.listen(PORT, () => {
      console.log(`
ILP Backend Server (${NODE_ENV.toUpperCase()} Mode)

REST API   : http://localhost:${PORT}/api
API Docs   : http://localhost:${PORT}/api/docs
Health     : http://localhost:${PORT}/api/health
WebSocket  : ws://localhost:${PORT}
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// ── 5. GRACEFUL SHUTDOWN ──────────────────────────────────────────────────────

/**
 * Ensures active connections finish before exit.
 */
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  httpServer.close(() => {
    console.log('HTTP server closed. All connections finished.');
    process.exit(0);
  });

  // Force shutdown if hanging
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

// Listen for OS signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── 6. ERROR SAFETY NETS ─────────────────────────────────────────────────────

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ── 7. START APPLICATION ──────────────────────────────────────────────────────
startServer();