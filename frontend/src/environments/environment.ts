/**
 * AUTHOR: Umesh Teja Peddi
 * src/environments/environment.ts
 * ==========================================================================================
 * Development Environment Configuration
 *
 * Purpose:
 * Defines environment-specific variables used throughout the application
 * during local development (non-production builds).
 *
 * Configuration:
 * - production : Indicates whether Angular runs in production mode
 * - apiBaseUrl : Base API endpoint including `/api` prefix for HTTP services
 * - apiUrl     : Root backend server URL used for sockets, assets, or non-API routes
 *
 * Usage:
 * Imported by services to dynamically construct backend URLs instead of
 * hardcoding endpoints, allowing seamless switching between environments.
 *
 * Note:
 * This file is replaced automatically with `environment.prod.ts`
 * during production builds via Angular file replacements.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  apiUrl: 'http://localhost:3000',
};
