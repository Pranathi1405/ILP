/**
 * src/utils/logger.js
 * =====================
 * Winston logger — single source of truth for all application logging.
 *
 * Usage anywhere in the project:
 *   import logger from '../utils/logger.js';
 *
 *   logger.info('Server started', { port: 3000 });
 *   logger.warn('Rate limit approaching', { userId: 42 });
 *   logger.error('DB query failed', { error: err.message, query: sql });
 *   logger.debug('Cache miss', { key: 'user:42' });
 *   logger.http('Incoming request');   // used internally by Morgan
 *
 * Log levels (lowest to highest severity):
 *   debug < http < info < warn < error
 *
 * Outputs:
 *   Development → coloured, human-readable console output
 *   Production  → JSON console output (Cloud Logging / Stackdriver compatible)
 *                 + rotating daily log files under logs/
 *
 * Log files created (production only):
 *   logs/error.log          → error level only, kept 30 days
 *   logs/combined.log       → all levels, kept 14 days
 *   logs/exceptions.log     → uncaught exceptions
 *   logs/rejections.log     → unhandled promise rejections
 *
 * Environment variables used:
 *   NODE_ENV   → 'development' | 'production' | 'test'
 *   LOG_LEVEL  → override default level (optional)
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: PATHS
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// logs/ lives at project root (two levels up from src/utils/)
const LOG_DIR = path.join(__dirname, '../../logs');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

const NODE_ENV   = process.env.NODE_ENV || 'development';
const IS_DEV     = NODE_ENV === 'development';
const IS_TEST    = NODE_ENV === 'test';

/**
 * Active log level — can be overridden via LOG_LEVEL env var.
 *
 * Defaults:
 *   development → 'debug'  (see everything)
 *   test        → 'error'  (silence noise during test runs)
 *   production  → 'info'   (info + warn + error)
 */
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_DEV ? 'debug' : IS_TEST ? 'error' : 'info');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: FORMATS
// ─────────────────────────────────────────────────────────────────────────────

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

/**
 * Shared base format applied to every transport:
 *   - timestamp in ISO 8601
 *   - captures stack traces from Error objects
 *   - handles printf-style %s %d splat arguments
 */
const baseFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),     // include err.stack when an Error is passed
  splat(),                     // support logger.info('msg %s', value) style
);

/**
 * Development format — coloured, single-line, human-readable.
 *
 * Example:
 *   2026-03-13 14:22:05.123 [info]  Server started on port 3000
 *   2026-03-13 14:22:06.456 [error] DB query failed { query: 'SELECT ...' }
 *                                   Error: Connection refused
 *                                       at pool.query (database.config.js:42)
 */
const devFormat = combine(
  baseFormat,
  colorize({ all: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    // Strip empty meta so clean messages stay on one line
    const metaStr = Object.keys(meta).length
      ? ' ' + JSON.stringify(meta, null, 0)
      : '';

    const base = `${timestamp} [${level}] ${message}${metaStr}`;

    // Append stack trace on the next line if present
    return stack ? `${base}\n${stack}` : base;
  }),
);

/**
 * Production format — structured JSON.
 * One JSON object per line, Cloud Logging / ELK / Datadog compatible.
 *
 * Example:
 *   {"timestamp":"2026-03-13 14:22:05.123","level":"error","message":"DB query failed","query":"SELECT ...","stack":"Error: ..."}
 */
const prodFormat = combine(
  baseFormat,
  json(),
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TRANSPORTS
// ─────────────────────────────────────────────────────────────────────────────

/** Console transport — always active */
const consoleTransport = new winston.transports.Console({
  format: IS_DEV ? devFormat : prodFormat,
  silent: IS_TEST,   // suppress all output during Jest test runs
});

/**
 * Rotating file — errors only.
 * Keeps 30 days of daily files, max 20 MB per file.
 * Pattern: logs/error-2026-03-13.log
 */
const errorFileTransport = new winston.transports.DailyRotateFile({
  dirname:        LOG_DIR,
  filename:       'error-%DATE%.log',
  datePattern:    'YYYY-MM-DD',
  level:          'error',
  format:         prodFormat,
  maxSize:        '20m',
  maxFiles:       '30d',
  zippedArchive:  true,
});

/**
 * Rotating file — all levels.
 * Keeps 14 days of daily files, max 50 MB per file.
 * Pattern: logs/combined-2026-03-13.log
 */
const combinedFileTransport = new winston.transports.DailyRotateFile({
  dirname:        LOG_DIR,
  filename:       'combined-%DATE%.log',
  datePattern:    'YYYY-MM-DD',
  format:         prodFormat,
  maxSize:        '50m',
  maxFiles:       '14d',
  zippedArchive:  true,
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: LOGGER INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

const transports = [consoleTransport];

// File transports only in production (not needed in dev or test)
if (!IS_DEV && !IS_TEST) {
  transports.push(errorFileTransport, combinedFileTransport);
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports,

  /**
   * Catch uncaught exceptions and log them before the process exits.
   * logs/exceptions.log is written in production.
   */
  exceptionHandlers: IS_DEV || IS_TEST
    ? [consoleTransport]
    : [
        consoleTransport,
        new winston.transports.DailyRotateFile({
          dirname:   LOG_DIR,
          filename:  'exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format:    prodFormat,
          maxFiles:  '30d',
        }),
      ],

  /**
   * Catch unhandled promise rejections.
   * logs/rejections.log is written in production.
   */
  rejectionHandlers: IS_DEV || IS_TEST
    ? [consoleTransport]
    : [
        consoleTransport,
        new winston.transports.DailyRotateFile({
          dirname:   LOG_DIR,
          filename:  'rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          format:    prodFormat,
          maxFiles:  '30d',
        }),
      ],

  // Do NOT force exit on uncaught exception — let the app decide
  exitOnError: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: STREAM FOR MORGAN  (HTTP request logging middleware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Morgan pipes its output through this stream so HTTP access logs
 * appear inside Winston (same format, same destination).
 *
 * Usage in app.js:
 *   import morgan from 'morgan';
 *   import logger from './utils/logger.js';
 *
 *   app.use(morgan('combined', { stream: logger.stream }));
 *   // or in development:
 *   app.use(morgan('dev', { stream: logger.stream }));
 */
logger.stream = {
  write: (message) => {
    // Morgan appends \n — trim before logging
    logger.http(message.trim());
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: STARTUP LOG
// ─────────────────────────────────────────────────────────────────────────────

logger.info('Logger initialised', {
  env:      NODE_ENV,
  level:    LOG_LEVEL,
  filelogs: !IS_DEV && !IS_TEST,
});

export default logger;