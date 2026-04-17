/**
 * src/config/swagger/modules/custom-ug-tests.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Custom UG Exam Tests module.
 */

export const customUgTestsSwagger = {

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    GenerateTest: {
      type: 'object',
      required: ['subject_id', 'number_of_questions', 'duration'],
      properties: {
        subject_id:          { type: 'integer', example: 4 },
        module_id:          { type: 'integer', example: 12, nullable: true },
        difficulty:          { type: 'string',  enum: ['easy', 'medium', 'hard'], example: 'easy' },
        question_types:      { type: 'array',   items: { type: 'string' }, example: ['mcq'] },
        number_of_questions: { type: 'integer', example: 5 },
        duration:            { type: 'integer', example: 30 },
      },
    },

    SubmitAnswers: {
      type: 'object',
      required: ['answers'],
      properties: {
        answers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question_id:        { type: 'integer', example: 5 },
              selected_option_id: { type: 'integer', example: 17, nullable: true }
            },
          },
        },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    '/custom-ug-tests/generate': {
      post: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Generate a custom UG exam test',
        description: [
          'Generate a custom test by choosing subjects, difficulty, question type, and count.',
          '',
          '**Requires:** Active subscription with custom UG test access.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject_ids', 'number_of_questions'],
                properties: {
                  subject_ids:         { type: 'array', items: { type: 'integer' } },
                  difficulty:          { type: 'string', enum: ['easy', 'medium', 'hard'] },
                  question_type:       { type: 'string', enum: ['mcq', 'mcq_multi', 'numerical', 'match_list'], default: 'mcq' },
                  number_of_questions: { type: 'integer', minimum: 1, maximum: 100, example: 25 },
                  duration:            { type: 'integer', example: 60 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Custom UG test generated successfully',
            content: {
              'application/json': {
                example: { success: true, message: 'Custom test generated successfully', data: { test_id: 16, total_questions: 25, total_marks: 100, duration_mins: 30 } },
              },
            },
          },
          400: { description: 'Not enough questions available for selected filters' },
          403: { description: 'No active subscription or custom test limit reached' },
        },
      },
    },

    '/custom-ug-tests': {
      get: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Get all my custom UG exam tests',
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Custom tests fetched successfully' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/custom-ug-tests/attempts/{attemptId}/results': {
      get: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Get detailed results for a custom UG exam attempt',
        parameters: [
          { name: 'attemptId', in: 'path', required: true, schema: { type: 'integer' }, example: 5 },
        ],
        responses: {
          200: { description: 'Results fetched successfully' },
          400: { description: 'Test not yet submitted' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/custom-ug-tests/{testId}': {
      get: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Get custom UG exam test by ID with all questions',
        parameters: [
          { name: 'testId', in: 'path', required: true, schema: { type: 'integer' }, example: 16 },
        ],
        responses: {
          200: { description: 'Test fetched successfully' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/custom-ug-tests/{testId}/start': {
      post: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Start a custom UG exam attempt',
        parameters: [
          { name: 'testId', in: 'path', required: true, schema: { type: 'integer' }, example: 16 },
        ],
        responses: {
          200: { description: 'Attempt started successfully' },
          400: { description: 'Already submitted or attempt already active' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/custom-ug-tests/{testId}/submit': {
      post: {
        tags: ['Custom UG Exam Tests'],
        summary: 'Submit answers for a custom UG exam test',
        parameters: [
          { name: 'testId', in: 'path', required: true, schema: { type: 'integer' }, example: 16 },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['answers'],
                properties: {
                  answers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_id:         { type: 'integer' },
                        selected_option_id:  { type: 'integer' },
                        selected_option_ids: { type: 'array', items: { type: 'integer' } },
                        numerical_answer:    { type: 'number' },
                      },
                    },
                  },
                },
              },
              example: {
                answers: [
                  { question_id: 108, selected_option_id: 430 },
                  { question_id: 109, selected_option_ids: [434, 435] },
                  { question_id: 158, numerical_answer: 18 },
                ],
              },
            },
          },
        },
        responses: {
          200: { description: 'Test submitted and scored successfully' },
          400: { description: 'No active attempt or already submitted' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    { name: 'Custom UG Exam Tests', description: 'Generate custom tests by subject, difficulty and question type' },
  ],
};