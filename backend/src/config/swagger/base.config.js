/**
 * src/config/swagger/base.config.js
 */

export const baseInfo = {
  openapi: '3.0.0',

  info: {
    title: 'Interactive Learning Portal (ILP) — Backend API',
    version: '1.0.0',
    description: `
## ILP Backend REST API Documentation
Complete API reference for the Interactive Learning Portal backend.
    `,
    contact: { name: 'ILP Dev Team — Intern Batch 04' },
  },

  servers: [
    { url: 'http://localhost:3000/api', description: 'Local Development' },
    { url: 'https://api.yourdomain.com/api', description: 'Production' },
  ],

  security: [{ bearerAuth: [] }],
};

export const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Paste JWT token only. Swagger adds Bearer prefix automatically.',
  },
};

export const commonSchemas = {
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation completed successfully' },
      data: { type: 'object', nullable: true },
    },
  },

  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Something went wrong' },
    },
  },
};

export const commonResponses = {
  Unauthorized: { description: '401 Unauthorized' },
  Forbidden: { description: '403 Forbidden' },
  NotFound: { description: '404 Not Found' },
  ValidationError: { description: '400 Validation Error' },
  ServerError: { description: '500 Internal Server Error' },
};

export const swaggerUiOptions = {
  customSiteTitle: 'ILP API Docs',
  swaggerOptions: {
    persistAuthorization: false,
    withCredentials: false,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      delete req.headers.Cookie;
      delete req.headers.cookie;
      return req;
    },
  },
};