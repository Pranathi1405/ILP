/**
 * src/config/swagger/base.config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Global metadata, servers, security schemes, shared responses, and UI options.
 * Module-specific schemas and paths are defined in ./modules/*.swagger.js
 */

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL METADATA & SERVERS
// ─────────────────────────────────────────────────────────────────────────────

export const baseInfo = {
  openapi: '3.0.0',

  info: {
    title: 'Interactive Learning Portal (ILP) — Backend API',
    version: '1.0.0',
    description: `
## ILP Backend REST API Documentation

Complete API reference for the **Interactive Learning Portal** backend.

### Base URL
- **Development**: \`http://localhost:3000/api\`
- **Production**:  \`https://api.yourdomain.com/api\`

### Authentication
All protected routes require a **Bearer JWT token**:
\`\`\`
Authorization: Bearer <your_token>
\`\`\`
Get your token from: \`POST /api/auth/login\`

### WebSocket (Real-time Notifications)
\`\`\`javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000', { auth: { token: 'your_jwt' } });
socket.on('new_notification', (notification) => console.log(notification));
\`\`\`

### User Roles
| Role | Description |
|---|---|
| \`student\` | Access learning content, own notifications |
| \`teacher\` | Manage courses, notify students |
| \`parent\`  | View student progress, own notifications |
| \`admin\`   | Full access, announcements, broadcast |
    `,
    contact: { name: 'ILP Dev Team — Intern Batch 04' },
  },

  servers: [
    { url: 'http://localhost:3000/api', description: '🔧 Local Development' },
    { url: 'https://api.yourdomain.com/api', description: '🚀 Production' },
  ],

  // JWT applies to all endpoints by default (override per-endpoint with security: [])
 security: [{ BearerAuth: [] }],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY SCHEME
// ─────────────────────────────────────────────────────────────────────────────

export const securitySchemes = {
  BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT token (Swagger adds "Bearer " prefix automatically)',
      },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED / COMMON SCHEMAS — used across all modules
// ─────────────────────────────────────────────────────────────────────────────

export const commonSchemas = {
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string',  example: 'Operation completed successfully' },
      data:    { type: 'object',  nullable: true, description: 'Payload — varies by endpoint' },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string',  example: 'Something went wrong' },
      errors: {
        type: 'array',
        nullable: true,
        description: 'Only present for 400 validation errors',
        items: {
          type: 'object',
          properties: {
            field:   { type: 'string', example: 'title' },
            message: { type: 'string', example: 'title is required' },
          },
        },
      },
    },
  },

  Pagination: {
    type: 'object',
    properties: {
      page:        { type: 'integer', example: 1 },
      limit:       { type: 'integer', example: 20 },
      total:       { type: 'integer', example: 100 },
      total_pages: { type: 'integer', example: 5 },
      has_next:    { type: 'boolean', example: true },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE RESPONSES — referenced as $ref across all modules
// ─────────────────────────────────────────────────────────────────────────────

export const commonResponses = {
  Unauthorized: {
    description: '401 — Missing or invalid JWT token',
    content: {
      'application/json': {
        schema:  { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Authentication required. Please provide a Bearer token.' },
      },
    },
  },

  Forbidden: {
    description: '403 — User lacks required role or ownership',
    content: {
      'application/json': {
        schema:  { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Access denied. Required role: admin. Your role: student' },
      },
    },
  },

  NotFound: {
    description: '404 — Resource does not exist',
    content: {
      'application/json': {
        schema:  { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Resource not found' },
      },
    },
  },

  ValidationError: {
    description: '400 — Request body or params failed validation',
    content: {
      'application/json': {
        schema:  { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          success: false,
          message: 'Validation failed',
          errors:  [{ field: 'title', message: 'title is required' }],
        },
      },
    },
  },

  ServerError: {
    description: '500 — Internal server error',
    content: {
      'application/json': {
        schema:  { $ref: '#/components/schemas/ErrorResponse' },
        example: { success: false, message: 'Something went wrong. Please try again.' },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SWAGGER UI DISPLAY OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const swaggerUiOptions = {
  customSiteTitle: 'ILP API Docs',
  swaggerOptions: {
    persistAuthorization: false,   // ❌ disable caching
    withCredentials: false,        // 🔥 prevent cookies
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    syntaxHighlight: { activated: true, theme: 'monokai' },
  },
};