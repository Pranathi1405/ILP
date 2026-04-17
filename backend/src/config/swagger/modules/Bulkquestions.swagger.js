/**
 * src/config/swagger/modules/bulkQuestions.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Bulk Questions Upload module.
 *
 * Covers one tag group:
 *   - Bulk Question Upload  (parse-doc, confirm, modules helper)
 *
 * ── Two-phase upload flow ────────────────────────────────────────────────────
 *
 *  Phase 1 — POST /bulk-questions/parse-doc
 *    Teacher uploads a .docx file (multipart/form-data).
 *    Server parses the document, extracts text + embedded images (as base64).
 *    Returns a structured JSON preview — NO DB writes yet.
 *    Teacher sees all questions on the review page.
 *
 *  Review step (frontend)
 *    For each question the teacher selects a module_id from a dropdown.
 *    The dropdown is populated via GET /bulk-questions/modules?subjectId=<id>.
 *
 *  Phase 2 — POST /bulk-questions/confirm
 *    Frontend sends back the full questions array with module_ids filled in.
 *    Server uploads base64 images to GCS → gets public URLs.
 *    Server inserts questions + options + paragraphs to DB in a transaction.
 *    Returns a per-question success/failure summary.
 *    HTTP 201 if all inserted. HTTP 207 Multi-Status if partial failure.
 *
 * ── Document format (.docx) ──────────────────────────────────────────────────
 *  Each question block is separated by:  ---  (three hyphens on its own line)
 *  Fields use  KEY: value  syntax. Images are embedded directly in the Word doc
 *  immediately after their corresponding IMAGE marker line.
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ QUESTION_TYPE: mcq                                      │
 *  │ DIFFICULTY: medium                                      │
 *  │ MARKS: 4                                                │
 *  │ IDEAL_TIME: 2                                           │
 *  │ QUESTION: What is the SI unit of electric current?      │
 *  │ QUESTION_IMAGE:          ← embed image here in Word     │
 *  │ A) Volt                                                 │
 *  │ B) Ampere                                               │
 *  │ OPTION_IMAGE_B:          ← embed option image in Word   │
 *  │ C) Watt                                                 │
 *  │ D) Ohm                                                  │
 *  │ CORRECT: B                                              │
 *  │ EXPLANATION: Current is the flow of charge per second.  │
 *  │ HINTS: Think about electrons flowing in a conductor.    │
 *  │ ---                                                     │
 *  │ QUESTION_TYPE: paragraph                                │
 *  │ DIFFICULTY: hard                                        │
 *  │ MARKS: 4                                                │
 *  │ PARAGRAPH: The Carnot cycle is a theoretical...         │
 *  │ PARAGRAPH_IMAGE:         ← passage image in Word        │
 *  │ QUESTION: What is the efficiency of a Carnot engine ... │
 *  │ A) 1 - T2/T1                                           │
 *  │ B) T1/T2                                                │
 *  │ C) T2/T1                                                │
 *  │ D) 1 - T1/T2                                           │
 *  │ CORRECT: A                                              │
 *  │ QUESTION: The entropy of the universe in Carnot cycle.. │
 *  │ A) Increases                                            │
 *  │ B) Decreases                                            │
 *  │ C) Remains constant                                     │
 *  │ D) Becomes zero                                         │
 *  │ CORRECT: C                                              │
 *  └─────────────────────────────────────────────────────────┘
 *
 * ── Image markers ────────────────────────────────────────────────────────────
 *  QUESTION_IMAGE      → image for the question stem
 *  PARAGRAPH_IMAGE     → image for the paragraph/passage (paragraph type only)
 *  OPTION_IMAGE_A …D   → image for MCQ option A, B, C, or D
 *  Place the marker as a text line in Word, then embed the image AFTER it.
 *
 * ── Changelog ────────────────────────────────────────────────────────────────
 * v1 — initial implementation:
 *   [1]  ParsedQuestion schema          — full question shape returned by parse-doc
 *   [2]  ParsedSubQuestion schema       — sub-question shape for paragraph type
 *   [3]  ParsedOption schema            — option shape (includes option_image_base64)
 *   [4]  ConfirmQuestion schema         — what the frontend sends back (with module_id)
 *   [5]  BulkUploadSummary schema       — response shape after confirm
 *   [6]  ModuleDropdownItem schema      — module id + name for the dropdown
 *   [7]  POST /bulk-questions/parse-doc — multipart docx upload
 *   [8]  POST /bulk-questions/confirm   — confirm with module_ids
 *   [9]  GET  /bulk-questions/modules   — module dropdown helper
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENUMS — single source of truth for this module
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TYPES = ['mcq', 'mcq_multi', 'numerical', 'match_list', 'paragraph'];
const DIFFICULTIES   = ['easy', 'medium', 'hard'];

export const bulkQuestionsSwagger = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    // ─────────────────────────────────────────────────────────────────────
    // ParsedOption
    // FIX [3]: option shape returned from Phase 1 — includes optional base64 image
    // ─────────────────────────────────────────────────────────────────────
    ParsedOption: {
      type: 'object',
      description: 'One MCQ option extracted from the Word document.',
      properties: {
        letter: {
          type: 'string',
          enum: ['A', 'B', 'C', 'D'],
          example: 'B',
          description: 'The option letter identifier.',
        },
        option_text: {
          type: 'string',
          example: 'Ampere',
          description: 'Text content of the option.',
        },
        option_image_base64: {
          type: 'string',
          format: 'byte',
          nullable: true,
          example: null,
          description: [
            'Base64 data-URI of the option image extracted from the Word document.',
            'Format: data:<mime>;base64,<data>',
            'Null if no image was embedded after the OPTION_IMAGE_<letter> marker.',
            'Uploaded to GCS during Phase 2 confirm — replaced with a public URL in DB.',
          ].join(' '),
        },
        is_correct: {
          type: 'boolean',
          example: true,
          description: 'True if this option matches the CORRECT: field in the document.',
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // ParsedSubQuestion
    // FIX [2]: sub-question shape inside a paragraph-type question
    // ─────────────────────────────────────────────────────────────────────
    ParsedSubQuestion: {
      type: 'object',
      description: 'One sub-question under a paragraph/passage block.',
      properties: {
        question_text: { type: 'string', example: 'What is the efficiency of a Carnot engine?' },
        question_image_base64: {
          type: 'string',
          format: 'byte',
          nullable: true,
          example: null,
          description: 'Base64 data-URI of the sub-question image. Null if not present.',
        },
        options: {
          type: 'array',
          items: { $ref: '#/components/schemas/ParsedOption' },
        },
        correct_answer: {
          type: 'string',
          nullable: true,
          example: 'A',
          description:
            'Correct option letter(s). Comma-separated for mcq_multi, e.g. "A,C". Null for numerical.',
        },
        explanation: { type: 'string', nullable: true, example: 'Efficiency = 1 - T2/T1' },
        hints: { type: 'string', nullable: true, example: 'Think about the temperature ratio.' },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // ParsedQuestion
    // FIX [1]: full question shape returned by POST /bulk-questions/parse-doc
    //
    // module_id is NULL at this stage — teacher fills it in on the review page.
    // ─────────────────────────────────────────────────────────────────────
    ParsedQuestion: {
      type: 'object',
      description: [
        'One question extracted from the uploaded Word document.',
        'module_id is always null at this stage.',
        'Teacher must select a module_id for each question before confirming.',
      ].join(' '),
      properties: {
        question_type: {
          type: 'string',
          enum: QUESTION_TYPES,
          example: 'mcq',
          description: 'Type determined by the QUESTION_TYPE: field in the document.',
        },
        difficulty: {
          type: 'string',
          enum: DIFFICULTIES,
          example: 'medium',
          description: 'Defaults to "medium" if not specified in the document.',
        },
        marks: {
          type: 'integer',
          example: 4,
          description: 'Defaults to 4 if not specified.',
        },
        module_id: {
          type: 'integer',
          nullable: true,
          example: null,
          description: 'Always null from the parser. Teacher assigns this on the review page.',
        },
        ideal_time_mins: {
          type: 'integer',
          nullable: true,
          example: 2,
        },
        question_text: {
          type: 'string',
          nullable: true,
          example: 'What is the SI unit of electric current?',
          description: 'Null for paragraph-type (passage has no single question_text).',
        },
        question_image_base64: {
          type: 'string',
          format: 'byte',
          nullable: true,
          example: null,
          description:
            'Base64 data-URI of the question image. Null if no QUESTION_IMAGE marker was found.',
        },
        image_position: {
          type: 'string',
          enum: ['above', 'below'],
          default: 'above',
        },
        correct_answer: {
          type: 'string',
          nullable: true,
          example: 'B',
          description:
            'Correct letter for mcq. Comma-separated for mcq_multi. Numeric string for numerical. Null for match_list/paragraph.',
        },
        explanation: { type: 'string', nullable: true, example: 'Current is measured in Amperes.' },
        hints: { type: 'string', nullable: true, example: 'Think about electrons.' },
        options: {
          type: 'array',
          description: 'Empty array for numerical and match_list types.',
          items: { $ref: '#/components/schemas/ParsedOption' },
        },
        match_pairs: {
          type: 'array',
          description: 'Non-empty only for match_list type.',
          items: {
            type: 'object',
            properties: {
              left: { type: 'string', example: 'Newton' },
              right: { type: 'string', example: 'Force = mass × acceleration' },
            },
          },
        },
        // ── paragraph-specific fields ────────────────────────────────────
        paragraph_text: {
          type: 'string',
          nullable: true,
          example: 'The Carnot cycle is a theoretical thermodynamic cycle…',
          description: 'Non-null only for paragraph question_type.',
        },
        paragraph_image_base64: {
          type: 'string',
          format: 'byte',
          nullable: true,
          example: null,
          description: 'Base64 data-URI of the paragraph/passage image. Null if none embedded.',
        },
        sub_questions: {
          type: 'array',
          description: 'Non-empty only for paragraph question_type. At least 2 required.',
          items: { $ref: '#/components/schemas/ParsedSubQuestion' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // ConfirmQuestion
    // FIX [4]: what the frontend sends to POST /bulk-questions/confirm
    // Identical to ParsedQuestion EXCEPT module_id is now required (non-null).
    // ─────────────────────────────────────────────────────────────────────
    ConfirmQuestion: {
      type: 'object',
      description: [
        'A parsed question with module_id filled in by the teacher.',
        'Send the full ParsedQuestion object back with module_id set.',
        'The server will upload base64 images to GCS before inserting to DB.',
      ].join(' '),
      required: ['question_type', 'module_id'],
      properties: {
        question_type: { type: 'string', enum: QUESTION_TYPES, example: 'mcq' },
        module_id: {
          type: 'integer',
          example: 784,
          description: 'REQUIRED. Selected by teacher on the review page.',
        },
        difficulty: { type: 'string', enum: DIFFICULTIES, example: 'medium' },
        marks: { type: 'integer', example: 4 },
        ideal_time_mins: { type: 'integer', nullable: true, example: 2 },
        question_text: { type: 'string', nullable: true, example: 'What is the SI unit of current?' },
        question_image_base64: { type: 'string', format: 'byte', nullable: true, example: null },
        image_position: { type: 'string', enum: ['above', 'below'], default: 'above' },
        correct_answer: { type: 'string', nullable: true, example: 'B' },
        explanation: { type: 'string', nullable: true },
        hints: { type: 'string', nullable: true },
        options: {
          type: 'array',
          items: { $ref: '#/components/schemas/ParsedOption' },
        },
        match_pairs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              left: { type: 'string' },
              right: { type: 'string' },
            },
          },
        },
        paragraph_text: { type: 'string', nullable: true },
        paragraph_image_base64: { type: 'string', format: 'byte', nullable: true, example: null },
        sub_questions: {
          type: 'array',
          items: { $ref: '#/components/schemas/ParsedSubQuestion' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // BulkUploadSummary
    // FIX [5]: response body from POST /bulk-questions/confirm
    // ─────────────────────────────────────────────────────────────────────
    BulkUploadSummary: {
      type: 'object',
      description: [
        'Summary returned after Phase 2 confirm.',
        'HTTP 201 if all questions inserted.',
        'HTTP 207 Multi-Status if at least one question failed.',
      ].join(' '),
      properties: {
        total: {
          type: 'integer',
          example: 20,
          description: 'Total questions submitted for upload.',
        },
        inserted: {
          type: 'integer',
          example: 19,
          description: 'Questions successfully written to the database.',
        },
        failed: {
          type: 'integer',
          example: 1,
          description: 'Questions that encountered an error and were not saved.',
        },
        success: {
          type: 'array',
          description: 'Details of successfully inserted questions.',
          items: {
            type: 'object',
            properties: {
              index: {
                type: 'integer',
                example: 0,
                description: 'Zero-based index in the submitted questions array.',
              },
              question_id: {
                type: 'integer',
                nullable: true,
                example: 1042,
                description: 'Inserted question_id. Null for paragraph (use paragraph_id).',
              },
              paragraph_id: {
                type: 'integer',
                nullable: true,
                example: null,
                description: 'Inserted paragraph_id. Non-null only for paragraph-type questions.',
              },
            },
          },
        },
        errors: {
          type: 'array',
          description: 'Details of failed questions.',
          items: {
            type: 'object',
            properties: {
              index: { type: 'integer', example: 4 },
              question_text: {
                type: 'string',
                example: 'What is entropy?',
                description: 'First line of the question for human identification.',
              },
              error: { type: 'string', example: 'module_id 999 not found or not published' },
            },
          },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // ModuleDropdownItem
    // FIX [6]: module option used in the review-page dropdown
    // ─────────────────────────────────────────────────────────────────────
    ModuleDropdownItem: {
      type: 'object',
      description: 'One module option for the subject-module dropdown on the review page.',
      properties: {
        module_id: { type: 'integer', example: 784 },
        module_name: { type: 'string', example: 'Chapter 3 — Thermodynamics' },
        module_order: {
          type: 'integer',
          nullable: true,
          example: 3,
          description: 'Display order within the subject.',
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    // ══════════════════════════════════════════════════
    // PHASE 1 — Parse document
    // ══════════════════════════════════════════════════

    '/bulk-questions/parse-doc': {
      post: {
        tags: ['Bulk Question Upload'],
        summary: 'Phase 1 — Upload .docx and get question preview',
        description: [
          'Teacher uploads a `.docx` file containing questions formatted with the',
          'KEY: value syntax (see module description for the full template).',
          '',
          '**What the server does:**',
          '1. Parses text fields (QUESTION_TYPE, DIFFICULTY, MARKS, QUESTION, A)…D), CORRECT, etc.)',
          '2. Extracts embedded Word images → returns them as base64 data-URIs in `question_image_base64`,',
          '   `paragraph_image_base64`, and `options[].option_image_base64`',
          '3. Returns a structured JSON preview — **no DB writes, no GCS uploads**',
          '',
          '**Frontend responsibility after this call:**',
          '- Render all questions on the review page (text + inline image previews)',
          '- Show a module dropdown for each question (GET /bulk-questions/modules?subjectId=…)',
          '- Teacher selects a `module_id` for every question',
          '- Call Phase 2 (POST /bulk-questions/confirm) with the completed payload',
          '',
          '**File constraints:**',
          '- Only `.docx` accepted (not `.doc`)',
          '- Max file size: 20 MB',
          '- Max questions per document: 50',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'The .docx question bank file.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Document parsed successfully — questions ready for review',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 20 },
                            questions: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/ParsedQuestion' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
                // FIX [7]: full response example with image fields shown
                example: {
                  success: true,
                  message: '20 question(s) parsed successfully',
                  data: {
                    total: 20,
                    questions: [
                      {
                        question_type: 'mcq',
                        difficulty: 'medium',
                        marks: 4,
                        module_id: null,
                        ideal_time_mins: 2,
                        question_text: 'What is the SI unit of electric current?',
                        question_image_base64: null,
                        image_position: 'above',
                        correct_answer: 'B',
                        explanation: 'Current is the flow of electric charge per unit time.',
                        hints: 'Think about electrons flowing through a conductor.',
                        options: [
                          { letter: 'A', option_text: 'Volt', option_image_base64: null, is_correct: false },
                          { letter: 'B', option_text: 'Ampere', option_image_base64: null, is_correct: true },
                          { letter: 'C', option_text: 'Watt', option_image_base64: null, is_correct: false },
                          { letter: 'D', option_text: 'Ohm', option_image_base64: null, is_correct: false },
                        ],
                        match_pairs: [],
                        paragraph_text: null,
                        paragraph_image_base64: null,
                        sub_questions: [],
                      },
                      {
                        question_type: 'paragraph',
                        difficulty: 'hard',
                        marks: 4,
                        module_id: null,
                        ideal_time_mins: 8,
                        question_text: null,
                        question_image_base64: null,
                        image_position: 'above',
                        correct_answer: null,
                        explanation: null,
                        hints: null,
                        options: [],
                        match_pairs: [],
                        paragraph_text: 'The Carnot cycle is a theoretical thermodynamic cycle...',
                        paragraph_image_base64: 'data:image/png;base64,iVBORw0KGgo...',
                        sub_questions: [
                          {
                            question_text: 'What is the efficiency of a Carnot engine?',
                            question_image_base64: null,
                            correct_answer: 'A',
                            explanation: 'Efficiency = 1 - T_cold / T_hot',
                            hints: 'Focus on absolute temperatures.',
                            options: [
                              { letter: 'A', option_text: '1 - T2/T1', option_image_base64: null, is_correct: true },
                              { letter: 'B', option_text: 'T1/T2', option_image_base64: null, is_correct: false },
                              { letter: 'C', option_text: 'T2/T1', option_image_base64: null, is_correct: false },
                              { letter: 'D', option_text: '1 - T1/T2', option_image_base64: null, is_correct: false },
                            ],
                          },
                          {
                            question_text: 'The entropy change in a Carnot cycle is:',
                            question_image_base64: null,
                            correct_answer: 'C',
                            explanation: 'Carnot is reversible — net entropy change is zero.',
                            hints: null,
                            options: [
                              { letter: 'A', option_text: 'Increases', option_image_base64: null, is_correct: false },
                              { letter: 'B', option_text: 'Decreases', option_image_base64: null, is_correct: false },
                              { letter: 'C', option_text: 'Remains constant', option_image_base64: null, is_correct: true },
                              { letter: 'D', option_text: 'Becomes zero', option_image_base64: null, is_correct: false },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: '400 — No file, wrong file type, or doc exceeds 20 MB',
            content: {
              'application/json': {
                examples: {
                  no_file: {
                    summary: 'No file attached',
                    value: { success: false, message: 'No file uploaded. Please attach a .docx file.' },
                  },
                  wrong_type: {
                    summary: 'Wrong file type',
                    value: { success: false, message: 'Only .docx files are supported.' },
                  },
                },
              },
            },
          },
          422: {
            description: '422 — Document parsed but contained no valid question blocks',
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'No questions found in the document. Make sure blocks are separated by --- and use the correct KEY: value format.',
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // PHASE 2 — Confirm upload
    // ══════════════════════════════════════════════════

    '/bulk-questions/confirm': {
      post: {
        tags: ['Bulk Question Upload'],
        summary: 'Phase 2 — Confirm reviewed questions and save to database',
        description: [
          'Send the complete questions array from Phase 1 back, with `module_id` filled in',
          'for each question. The server then:',
          '',
          '1. Validates all `module_id` values are present',
          '2. Uploads any `*_base64` images to GCS → replaces them with public HTTPS URLs',
          '3. Inserts questions + options + paragraphs to the DB (per-question transaction)',
          '4. Returns a full summary: total, inserted, failed, per-item results',
          '',
          '**Response codes:**',
          '- `201` — all questions inserted successfully',
          '- `207 Multi-Status` — partial success (some questions failed, some inserted)',
          '- `400` — all questions failed validation before any DB writes',
          '',
          '**Partial failure behaviour:**',
          'Each question is attempted independently. A failure on question #5 does NOT',
          'roll back questions #1–4. The `errors` array identifies which questions failed',
          'and why so the teacher can fix and re-submit just those questions.',
          '',
          '**Image uploads:**',
          'Base64 images are uploaded to GCS as:',
          '`questions/<teacherUserId>/<uuid>.<ext>`',
          'The base64 fields in your payload are consumed server-side and not stored in DB.',
          'Only the resulting GCS public URLs are stored.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['questions'],
                properties: {
                  questions: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 50,
                    description: 'The reviewed questions array from Phase 1, with module_id filled in for each.',
                    items: { $ref: '#/components/schemas/ConfirmQuestion' },
                  },
                },
              },
              example: {
                questions: [
                  {
                    question_type: 'mcq',
                    difficulty: 'medium',
                    marks: 4,
                    module_id: 784, // ← teacher selected this
                    ideal_time_mins: 2,
                    question_text: 'What is the SI unit of electric current?',
                    question_image_base64: null,
                    image_position: 'above',
                    correct_answer: 'B',
                    explanation: 'Current is the flow of electric charge per unit time.',
                    hints: 'Think about electrons flowing through a conductor.',
                    options: [
                      { letter: 'A', option_text: 'Volt', option_image_base64: null, is_correct: false },
                      { letter: 'B', option_text: 'Ampere', option_image_base64: null, is_correct: true },
                      { letter: 'C', option_text: 'Watt', option_image_base64: null, is_correct: false },
                      { letter: 'D', option_text: 'Ohm', option_image_base64: null, is_correct: false },
                    ],
                    match_pairs: [],
                    paragraph_text: null,
                    paragraph_image_base64: null,
                    sub_questions: [],
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: '201 — All questions inserted successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'All 20 question(s) uploaded successfully',
                  data: {
                    total: 20,
                    inserted: 20,
                    failed: 0,
                    success: [
                      { index: 0, question_id: 1042, paragraph_id: null },
                      { index: 1, question_id: null, paragraph_id: 31 },
                    ],
                    errors: [],
                  },
                },
              },
            },
          },
          207: {
            description: '207 Multi-Status — partial success, check errors array',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: '19 question(s) uploaded, 1 failed',
                  data: {
                    total: 20,
                    inserted: 19,
                    failed: 1,
                    success: [
                      { index: 0, question_id: 1042, paragraph_id: null },
                    ],
                    errors: [
                      {
                        index: 4,
                        question_text: 'What is entropy?',
                        error: 'module_id 999 not found or not published',
                      },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: '400 — Missing module_ids or empty questions array',
            content: {
              'application/json': {
                examples: {
                  missing_module_ids: {
                    summary: 'Some questions have no module_id',
                    value: {
                      success: false,
                      message: 'Questions at positions 3, 7, 12 are missing module_id',
                    },
                  },
                  empty_array: {
                    summary: 'Empty questions array',
                    value: {
                      success: false,
                      message: 'questions array is required',
                    },
                  },
                  too_many: {
                    summary: 'Exceeds 50 question limit',
                    value: {
                      success: false,
                      message: 'Maximum 50 questions per bulk upload',
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // HELPER — Module dropdown
    // ══════════════════════════════════════════════════

    '/bulk-questions/modules': {
      get: {
        tags: ['Bulk Question Upload'],
        summary: 'Get modules for the module_id dropdown',
        description: [
          'Returns all published modules for a given subject.',
          'Teacher must be assigned to the subject (same check as the question bank).',
          '',
          'Call this once per subject when loading the review page.',
          'Renders as a dropdown next to each question for the teacher to select',
          'which module the question belongs to before confirming the upload.',
        ].join('\n'),
        parameters: [
          {
            name: 'subjectId',
            in: 'query',
            required: true,
            description: 'Subject ID whose modules to fetch.',
            schema: { type: 'integer', example: 259 },
          },
        ],
        responses: {
          200: {
            description: 'Modules fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            modules: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/ModuleDropdownItem' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Modules fetched successfully',
                  data: {
                    modules: [
                      { module_id: 780, module_name: 'Chapter 1 — Units & Dimensions', module_order: 1 },
                      { module_id: 781, module_name: 'Chapter 2 — Kinematics', module_order: 2 },
                      { module_id: 784, module_name: 'Chapter 3 — Laws of Motion', module_order: 3 },
                      { module_id: 790, module_name: 'Chapter 4 — Work, Power & Energy', module_order: 4 },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: '400 — Missing or invalid subjectId',
            content: {
              'application/json': {
                example: { success: false, message: 'subjectId query param is required' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: '403 — Teacher not assigned to this subject',
            content: {
              'application/json': {
                example: { success: false, message: 'You are not assigned to this subject' },
              },
            },
          },
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS — controls sidebar grouping and order in Swagger UI
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    {
      name: 'Bulk Question Upload',
      description: [
        '📄 Two-phase bulk question upload from a .docx file.',
        'Phase 1 (parse-doc): Upload document → get question preview with base64 images.',
        'Phase 2 (confirm): Send back the reviewed questions with module_ids → save to DB.',
      ].join(' '),
    },
  ],
};