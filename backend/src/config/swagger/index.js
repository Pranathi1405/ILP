/**
 * src/config/swagger/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single entry point for Swagger / OpenAPI configuration.
 *
 * Merges the base config with every module's schemas, paths, and tags into
 * the final `swaggerSpec` object consumed by swagger-ui-express.
 *
 * ┌─────────────────────────────────────────────┐
 * │  How to add a NEW module:                   │
 * │  1. Create src/config/swagger/modules/      │
 * │        <module-name>.swagger.js             │
 * │     Export: { schemas, paths, tags }        │
 * │  2. Import it below (Section 1)             │
 * │  3. Add it to MODULE_REGISTRY (Section 2)   │
 * └─────────────────────────────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

import {
  baseInfo,
  securitySchemes,
  commonSchemas,
  commonResponses,
  swaggerUiOptions,               // Re-exported for convenience
} from './base.config.js';

import { systemSwagger          } from './modules/system.swagger.js';
import { notificationsSwagger   } from './modules/notifications.swagger.js';
import { customUgTestsSwagger   } from './modules/customUgTests.swagger.js';
import { studentAnalyticsSwagger} from './modules/studentAnalytics.swagger.js';
import { teacherAnalyticsSwagger} from './modules/teacherAnalytics.swagger.js';
import { adminAnalyticsSwagger  } from './modules/adminAnalytics.swagger.js';
import { doubtsSwagger } from './modules/doubt.swagger.js';
import { liveClassesSwagger } from './modules/liveClass.swagger.js';
import { courseSwagger } from './modules/courses.swagger.js';
import { parentAnalyticsSwagger } from './modules/parentAnalytics.swagger.js';
import { categorySwagger } from './modules/categories.swagger.js';
import { subjectSwagger } from './modules/subjects.swagger.js';
import { moduleSwagger } from './modules/modules.swagger.js';
import { studyMaterialSwagger } from './modules/studyMaterial.swagger.js';
import { paymentsSwagger } from './modules/payments.swagger.js';
import { questionSwagger } from './modules/question.swagger.js';
import { smeTestSwagger } from './modules/smeTest.swagger.js';
import { smePerformanceSwagger } from './modules/smePerformance.swagger.js';
import { userCourseSwagger } from './modules/userCourse.swagger.js';
import { analyticsEventsSwagger } from './modules/analyticsEvents.swagger.js';
import { smeSwagger} from './modules/courseSme.swagger.js';
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: MODULE REGISTRY
// Add new modules here — order controls the Swagger UI sidebar sequence.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_REGISTRY = [
  systemSwagger,
  notificationsSwagger,
  customUgTestsSwagger,
  smeTestSwagger,
  smePerformanceSwagger,
  studentAnalyticsSwagger,
  teacherAnalyticsSwagger,
  adminAnalyticsSwagger,
  parentAnalyticsSwagger,
  doubtsSwagger,
  liveClassesSwagger,
  courseSwagger,
  categorySwagger,
  subjectSwagger,
  moduleSwagger,
  questionSwagger,
  studyMaterialSwagger,
  paymentsSwagger,
  userCourseSwagger,
  analyticsEventsSwagger,
  smeSwagger,
  // ── Upcoming modules (uncomment when ready) ────────────────────────────────
  // authSwagger,
  // coursesSwagger,
  // paymentsSwagger,
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: MERGE HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges all registered modules into a single flat spec object.
 * Each module contributes: schemas, paths, and tags.
 *
 * @param {Array<{schemas, paths, tags}>} modules
 * @returns {{ schemas: object, paths: object, tags: Array }}
 */
function mergeModules(modules) {
  return modules.reduce(
    (acc, mod) => ({
      schemas: { ...acc.schemas, ...(mod.schemas ?? {}) },
      paths:   { ...acc.paths,   ...(mod.paths   ?? {}) },
      tags:    [ ...acc.tags,    ...(mod.tags     ?? []) ],
    }),
    { schemas: {}, paths: {}, tags: [] },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: FINAL SPEC ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

const { schemas: moduleSchemas, paths, tags } = mergeModules(MODULE_REGISTRY);

export const swaggerSpec = {
  ...baseInfo,

  components: {
    securitySchemes,
    schemas:   { ...commonSchemas,   ...moduleSchemas },
    responses: { ...commonResponses },
  },

  paths,
  tags,
};

// Re-export UI options so the Express setup only imports from this one file
export { swaggerUiOptions };
