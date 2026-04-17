/**
 * src/config/swagger/modules/system.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the System module (health checks, server info).
 */

export const systemSwagger = {

  schemas: {},   // No module-specific schemas

  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Verify the server is running. Used by Docker and load balancers.',
        security: [],  // Public — no JWT required
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'ILP Backend is running',
                  timestamp: '2026-02-27T10:00:00.000Z',
                  environment: 'development',
                },
              },
            },
          },
        },
      },
    },
  },

  tags: [
    { name: 'System', description: 'Health checks and server info' },
  ],
};