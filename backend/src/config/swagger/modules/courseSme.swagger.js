/**
 * ============================================================
 * SME Test Module — Swagger Documentation
 * ------------------------------------------------------------
 * Import into swagger.config.js:
 *
 *   import { smeSwagger } from './sme.swagger.js';
 *   // then spread:
 *   paths:      { ...smeSwagger.paths }
 *   schemas:    { ...smeSwagger.schemas }
 *   tags:       [ ...smeSwagger.tags ]
 * ============================================================
 */

export const smeSwagger = {
  tags: [
    { name: 'Admin — SME Tests',   description: 'Admin operations for course-level SME tests' },
    { name: 'Teacher — SME Tests', description: 'Teacher question management for assigned SME tests' },
    { name: 'Student — SME Tests', description: 'Student test attempt and result APIs' },
  ],

  // ──────────────────────────────────────────────────────────────
  // SCHEMAS
  // ──────────────────────────────────────────────────────────────
  schemas: {
    SmeTestCreate: {
      type: 'object',
      required: ['course_id', 'scheduled_start', 'scheduled_end'],
      properties: {
        course_id:       { type: 'integer', example: 3 },
        scheduled_start: { type: 'string', format: 'date-time', example: '2026-05-01T10:00:00Z' },
        scheduled_end:   { type: 'string', format: 'date-time', example: '2026-05-01T13:00:00Z' },
        question_source: { type: 'string', enum: ['manual', 'qb'], default: 'manual' },
      },
    },

    SmeTestCreateResponse: {
      type: 'object',
      properties: {
        parent_test_id:  { type: 'integer' },
        course_id:       { type: 'integer' },
        course_name:     { type: 'string' },
        exam_code:       { type: 'string' },
        scheduled_start: { type: 'string', format: 'date-time' },
        scheduled_end:   { type: 'string', format: 'date-time' },
        child_tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              test_id:         { type: 'integer' },
              subject_id:      { type: 'integer' },
              subject_name:    { type: 'string' },
              teacher_id:      { type: 'integer' },
              teacher_name:    { type: 'string' },
              total_questions: { type: 'integer' },
              sections_count:  { type: 'integer' },
            },
          },
        },
      },
    },

    AssignmentRow: {
      type: 'object',
      properties: {
        assignment_id:     { type: 'integer' },
        parent_test_id:    { type: 'integer' },
        test_id:           { type: 'integer' },
        subject_id:        { type: 'integer' },
        teacher_id:        { type: 'integer' },
        assignment_status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
        question_count:    { type: 'integer' },
        subject_name:      { type: 'string' },
        first_name:        { type: 'string' },
        last_name:         { type: 'string' },
      },
    },

    SectionProgress: {
      type: 'object',
      properties: {
        section_id:    { type: 'integer' },
        section_name:  { type: 'string' },
        question_type: { type: 'string' },
        required:      { type: 'integer' },
        added:         { type: 'integer' },
        remaining:     { type: 'integer' },
        complete:      { type: 'boolean' },
      },
    },

    AssignmentStatus: {
      type: 'object',
      properties: {
        completed:   { type: 'boolean' },
        remaining:   { type: 'integer' },
        total_added: { type: 'integer' },
        sections: {
          type: 'array',
          items: { $ref: '#/components/schemas/SectionProgress' },
        },
      },
    },

    AddQuestionPayload: {
      type: 'object',
      description: 'Single question or array via `questions` key',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['section_id'],
            properties: {
              section_id:      { type: 'integer', example: 12 },
              source:          { type: 'string', enum: ['manual', 'qb', 'document'], default: 'manual' },
              question_id:     { type: 'integer', description: 'Required for QB source' },
              subject_id:      { type: 'integer' },
              module_id:       { type: 'integer' },
              question_text:   { type: 'string', example: 'What is Newton\'s first law?' },
              question_type:   { type: 'string', enum: ['mcq_single', 'mcq_multi', 'nat', 'match_list'] },
              difficulty:      { type: 'string', enum: ['easy', 'medium', 'hard'], default: 'medium' },
              marks:           { type: 'integer', default: 1 },
              correct_answer:  { type: 'string' },
              marks_correct:   { type: 'number' },
              marks_incorrect: { type: 'number' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    option_text: { type: 'string' },
                    is_correct:  { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },

    AddQuestionResponse: {
      type: 'object',
      properties: {
        inserted:     { type: 'integer', example: 5 },
        skipped:      { type: 'integer', example: 1, description: 'Duplicates silently skipped' },
        question_ids: { type: 'array', items: { type: 'integer' } },
        assignment:   { $ref: '#/components/schemas/AssignmentStatus' },
      },
    },

    TestAttemptStart: {
      type: 'object',
      properties: {
        attempt: {
          type: 'object',
          properties: {
            attempt_id:            { type: 'integer' },
            test_id:               { type: 'integer' },
            status:                { type: 'string' },
            started_at:            { type: 'string', format: 'date-time' },
            scheduled_end:         { type: 'string', format: 'date-time' },
            effective_duration_mins: { type: 'integer' },
          },
        },
        test: { type: 'object', description: 'Full test with questions' },
      },
    },

    SubmitTestBody: {
      type: 'object',
      required: ['answers'],
      properties: {
        answers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question_id:        { type: 'integer' },
              selected_option_id: { type: 'integer', nullable: true },
              numerical_answer:   { type: 'number',  nullable: true },
            },
          },
        },
      },
    },

    TestResultMetrics: {
      type: 'object',
      properties: {
        total_questions: { type: 'integer' },
        attempted:       { type: 'integer' },
        unattempted:     { type: 'integer' },
        correct:         { type: 'integer' },
        incorrect:       { type: 'integer' },
        score:           { type: 'number' },
        total_marks:     { type: 'number' },
        accuracy:        { type: 'number', description: 'Percentage of attempted that are correct' },
      },
    },

    ErrorResponse: {
      type: 'object',
      properties: {
        status:  { type: 'integer', example: 400 },
        error:   { type: 'string',  example: 'Validation failed' },
        details: { type: 'object',  nullable: true },
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // PATHS
  // ──────────────────────────────────────────────────────────────
  paths: {

  // ── ADMIN ─────────────────────────────────────────────────

  '/admin/sme-tests': {
    post: {
      tags: ['Admin — SME Tests'],
      summary: 'Create course-level SME test',
      description: 'Creates a parent test + one child test per course subject. Each child is assigned to the subject\'s teacher.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SmeTestCreate' },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  code: { type: 'integer', example: 201 },
                  message: { type: 'string' },
                  data: { $ref: '#/components/schemas/SmeTestCreateResponse' },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        404: { description: 'Course not found' },
      },
    },

    get: {
      tags: ['Admin — SME Tests'],
      summary: 'List all course-level SME tests',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        200: { description: 'Paginated list of parent SME tests' },
      },
    },
  },

  '/admin/sme-tests/{id}/publish': {
    patch: {
      tags: ['Admin — SME Tests'],
      summary: 'Publish course SME test',
      description: 'Blocked if any assignment is not completed. Publishes parent + all child tests atomically.',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Published successfully' },
        400: {
          description: 'Incomplete assignments — lists pending subjects',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Cannot publish. 2 subject assignment(s) are not yet completed.',
                  },
                  details: {
                    type: 'object',
                    properties: {
                      pending_subjects: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  '/admin/sme-tests/{id}/assignments': {
    get: {
      tags: ['Admin — SME Tests'],
      summary: 'Get assignment progress for a parent test',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Assignment rows',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AssignmentRow' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ── TEACHER ───────────────────────────────────────────────

  '/teacher/sme-tests/assigned': {
    get: {
      tags: ['Teacher — SME Tests'],
      summary: 'Get assigned SME tests with section-level progress',
      description: 'Returns all assignments for the authenticated teacher, each enriched with sections showing required/added/remaining counts.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Assigned tests with section progress',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/AssignmentRow' },
                        {
                          type: 'object',
                          properties: {
                            sections: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/SectionProgress' },
                            },
                            total_required: { type: 'integer' },
                            total_added: { type: 'integer' },
                            remaining: { type: 'integer' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  '/teacher/sme-tests/{id}/questions': {
    post: {
      tags: ['Teacher — SME Tests'],
      summary: 'Add question(s) to assigned SME test',
      description: [
        'Accepts single question or bulk array via `questions` key.',
        'Supports sources: manual, qb, document.',
        'Duplicate prevention: silently skips already-added questions.',
        'Section limit validation runs before any insert.',
        'Blocked if parent test is published.',
        'After insert → auto-updates assignment status (pending → in_progress → completed).',
      ].join('\n'),
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AddQuestionPayload' },
          },
        },
      },
      responses: {
        201: {
          description: 'Questions processed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/AddQuestionResponse' },
                },
              },
            },
          },
        },
        400: { description: 'Section limit exceeded / parent published' },
        403: { description: 'Not assigned to this test' },
      },
    },
  },

  '/teacher/sme-tests/{id}/questions/{qid}': {
    delete: {
      tags: ['Teacher — SME Tests'],
      summary: 'Remove question from SME test',
      description: 'Removes question mapping. Auto-reverts assignment status (e.g., completed → in_progress). Blocked if parent published.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        { in: 'path', name: 'qid', required: true, schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: 'Removed — includes updated assignment status',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  assignment: { $ref: '#/components/schemas/AssignmentStatus' },
                },
              },
            },
          },
        },
        400: { description: 'Parent test published — locked' },
        403: { description: 'Not assigned' },
        404: { description: 'Question not in test' },
      },
    },

    patch: {
      tags: ['Teacher — SME Tests'],
      summary: 'Edit question in SME test',
      description: 'Updates question text, difficulty, options, and marks. Blocked on published tests.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        { in: 'path', name: 'qid', required: true, schema: { type: 'integer' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                question_text: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                correct_answer: { type: 'string' },
                marks_correct: { type: 'number' },
                marks_incorrect: { type: 'number' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      option_text: { type: 'string' },
                      is_correct: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Updated question' },
        400: { description: 'Test published — locked' },
      },
    },
  },

  '/teacher/sme-tests/{id}/completion-status': {
    get: {
      tags: ['Teacher — SME Tests'],
      summary: 'Get section-level completion status for assigned test',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Completion status per section',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/AssignmentStatus' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ── STUDENT ───────────────────────────────────────────────

  '/sme-tests/full': {
    get: {
      tags: ['Student — SME Tests'],
      summary: 'List published SME tests with timing status',
      description: 'Returns all published parent SME tests with `timing_status`: upcoming | active | expired.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of tests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        test_id: { type: 'integer' },
                        title: { type: 'string' },
                        timing_status: {
                          type: 'string',
                          enum: ['upcoming', 'active', 'expired'],
                        },
                        attempt_status: { type: 'string', nullable: true },
                        attempt_id: { type: 'integer', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  '/sme-tests/{id}/pattern': {
    get: {
      tags: ['Student — SME Tests'],
      summary: 'Get test section/marking pattern',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Pattern with sections and marking scheme' },
        404: { description: 'Test not found' },
      },
    },
  },

  '/sme-tests/{id}/questions': {
    get: {
      tags: ['Student — SME Tests'],
      summary: 'Get test questions',
      description: 'For parent tests: aggregates all questions from child tests dynamically. For child/standalone tests: returns directly.',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: { description: 'Test with questions array' },
        403: { description: 'Test not published' },
        404: { description: 'Test not found' },
      },
    },
  },

  '/sme-tests/{id}/start': {
    post: {
      tags: ['Student — SME Tests'],
      summary: 'Start or resume test attempt',
      description: [
        'Validates: test published, within schedule window, no completed attempt.',
        'Returns existing in-progress attempt if resume.',
      ].join(' '),
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Attempt started / resumed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/TestAttemptStart' },
                },
              },
            },
          },
        },
        400: { description: 'Outside schedule window / already attempted' },
        403: { description: 'Test not published' },
      },
    },
  },

  '/sme-tests/{id}/submit': {
    post: {
      tags: ['Student — SME Tests'],
      summary: 'Submit test answers',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SubmitTestBody' },
          },
        },
      },
      responses: {
        200: { description: 'Submitted. Score calculated.' },
        400: { description: 'No active attempt or answers missing' },
      },
    },
  },

  '/sme-tests/{id}/results': {
    get: {
      tags: ['Student — SME Tests'],
      summary: 'Get test results',
      description: 'Available only after test.scheduled_end. Returns score, accuracy, and per-question breakdown.',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        200: {
          description: 'Results with derived metrics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    allOf: [
                      { type: 'object', description: 'Raw attempt result from model' },
                      {
                        type: 'object',
                        properties: {
                          metrics: {
                            $ref: '#/components/schemas/TestResultMetrics',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        400: { description: 'Not submitted or results not yet available' },
        404: { description: 'No attempt found' },
      },
    },
  },
},
};