/**
 * src/config/swagger/modules/doubts.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Doubt Clarification module.
 *
 * Route registration order (doubt.routes.js):
 *   POST   /                   → createDoubt          (multipart, upload.array("files", 5))
 *   GET    /my-doubts          → getMyDoubts
 *   GET    /teacher-doubts     → getTeacherDoubts
 *   POST   /reply              → replyToDoubt         (multipart, upload.array("files", 5))
 *   GET    /enrolled-courses   → getEnrolledCourses
 *   GET    /subjects           → getSubjectsByCourse
 *   GET    /filter             → getDoubtsByFilter
 *   GET    /search             → searchDoubts
 *   PUT    /:doubtId/status    → updateDoubtStatus
 *   GET    /:doubtId           → getDoubtDetail
 *
 * Mounted at: /api/doubts   (app.use('/api/doubts', doubtRoutes))
 * Auth middleware: authenticate (JWT) — req.user.id used on ALL routes
 * All endpoints grouped under a single tag: Doubt Clarification
 *
 * ─── HOW TO WIRE IN YOUR MAIN swagger.config.js ──────────────────────────
 *
 *   import { doubtsSwagger }     from './modules/doubts.swagger.js';
 *   import { liveClassesSwagger } from './modules/live-classes.swagger.js';
 *
 *   export const swaggerDocument = {
 *     openapi: '3.0.0',
 *     info: { ... },
 *
 *     // ✅ NO top-level `security` key here — that would lock ALL modules.
 *     // Routes do NOT carry individual `security` keys — the Authorize button
 *     // is shown purely from securitySchemes defined in components below.
 *
 *     components: {
 *       securitySchemes: {
 *         // ✅ Merge securitySchemes from doubtsSwagger — this renders
 *         //    the "Available authorizations / BearerAuth" button in Swagger UI.
 *         ...doubtsSwagger.securitySchemes,
 *         // Add other module securitySchemes here if needed
 *       },
 *       schemas: {
 *         ...doubtsSwagger.schemas,
 *         ...liveClassesSwagger.schemas,
 *       },
 *     },
 *
 *     paths: {
 *       ...doubtsSwagger.paths,
 *       ...liveClassesSwagger.paths,
 *     },
 *
 *     tags: [
 *       ...doubtsSwagger.tags,
 *       ...liveClassesSwagger.tags,
 *     ],
 *   };
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS — reused across schemas
// ─────────────────────────────────────────────────────────────────────────────
const DOUBT_STATUSES  = ['open', 'resolved'];
const RESPONDER_TYPES = ['teacher', 'student'];

export const doubtsSwagger = {

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    Doubt: {
      type: 'object',
      properties: {
        doubtId:      { type: 'integer',  example: 55 },
        questionText: { type: 'string',   example: "Can you explain Newton's third law with examples?" },
        status:       { type: 'string',   enum: DOUBT_STATUSES, example: 'open' },
        courseId:     { type: 'integer',  example: 3 },
        courseName:   { type: 'string',   example: 'Physics' },
        subjectId:    { type: 'integer',  example: 7 },
        subjectName:  { type: 'string',   example: 'Mechanics' },
        createdAt:    { type: 'string',   format: 'date-time', example: '2025-03-10T09:00:00Z' },
      },
    },

    DoubtAttachment: {
      type: 'object',
      properties: {
        attachmentId: { type: 'integer', example: 1 },
        fileType:     { type: 'string',  example: 'image' },
        fileUrl:      { type: 'string',  example: 'https://storage.example.com/doubt-55-img1.png' },
        fileName:     { type: 'string',  example: 'newton-diagram.png' },
        fileSizeKb:   { type: 'integer', example: 204 },
      },
    },

    DoubtReply: {
      type: 'object',
      properties: {
        replyId:       { type: 'integer', example: 12 },
        doubtId:       { type: 'integer', example: 55 },
        replyText:     { type: 'string',  example: "Newton's third law states that every action has an equal and opposite reaction." },
        responderType: { type: 'string',  enum: RESPONDER_TYPES, example: 'teacher' },
        createdAt:     { type: 'string',  format: 'date-time', example: '2025-03-10T10:30:00Z' },
        responder: {
          type: 'object',
          properties: {
            id:     { type: 'integer', example: 22 },
            name:   { type: 'string',  example: 'Dr. Ramesh Kumar' },
            avatar: { type: 'string',  example: 'https://storage.example.com/avatars/teacher-22.png' },
          },
        },
        attachments: {
          type: 'array',
          items: { $ref: '#/components/schemas/DoubtAttachment' },
        },
      },
    },

    CourseItem: {
      type: 'object',
      properties: {
        courseId:   { type: 'integer', example: 3 },
        courseName: { type: 'string',  example: 'Physics' },
      },
    },

    SubjectItem: {
      type: 'object',
      properties: {
        subjectId:   { type: 'integer', example: 7 },
        subjectName: { type: 'string',  example: 'Mechanics' },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    // ══════════════════════════════════════════════════
    // CREATE DOUBT  —  POST /api/doubts
    // controller: createDoubt
    // Auth: req.user.id → userId (student)
    // ══════════════════════════════════════════════════

    '/doubts': {
      post: {
        tags: ['Doubt Clarification'],
        summary: 'Submit a new doubt',
        description: [
          'Allows an authenticated student to submit a doubt with optional file attachments (up to 5 files).',
          '',
          '**Auth:** Bearer JWT token required. `userId` is derived from `req.user.id` — do NOT pass it in the body.',
          '',
          'Supported file types: images, PDFs, and documents.',
          'The doubt is assigned to the specified teacher and linked to a course and subject.',
          'Student must be enrolled in the course; enrollment is validated server-side.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['courseId', 'subjectId', 'teacherId', 'questionText'],
                properties: {
                  courseId:     { type: 'integer', example: 3,   description: 'ID of the course the doubt is related to' },
                  subjectId:    { type: 'integer', example: 7,   description: 'ID of the subject' },
                  teacherId:    { type: 'integer', example: 22,  description: 'ID of the teacher to assign the doubt to' },
                  questionText: { type: 'string',  example: "Can you explain Newton's third law with examples?" },
                  files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Up to 5 attachment files (images, PDFs, etc.)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Doubt created successfully',
            content: {
              'application/json': {
                // controller: res.status(201).json({ success: true, message: "Doubt created successfully", data: { doubtId, status, createdAt } })
                example: {
                  success: true,
                  message: 'Doubt created successfully',
                  data: {
                    doubtId:   55,
                    status:    'open',
                    createdAt: '2025-03-10T09:00:00Z',
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error — missing required fields or student not enrolled in course',
            content: {
              'application/json': {
                examples: {
                  missingFields: {
                    summary: 'Missing required fields',
                    value: { success: false, message: 'Missing required fields' },
                  },
                  notEnrolled: {
                    summary: 'Not enrolled',
                    value: { success: false, message: 'Access denied: You are not enrolled in this course' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized — missing or invalid JWT token',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // MY DOUBTS  —  GET /api/doubts/my-doubts
    // controller: getMyDoubts
    // Auth: req.user.id → userId (student)
    // ══════════════════════════════════════════════════

    '/doubts/my-doubts': {
     get: {
  tags: ['Doubt Clarification'],
  summary: 'Get all doubts for the logged-in user (student or teacher)',
  description: [
    'Returns a paginated list of doubts for the authenticated user.',
    '',
    '**Auth:** Bearer JWT token required. User role is read from `req.user.role`.',
    '',
    '**Ordering:** Results are sorted by `last_activity_at` DESC —',
    'doubts with the most recent reply appear first.',
    'If a doubt has no replies, its own `created_at` is used as the activity timestamp.',
    '',
    '**Filters (query params):** `subjectId`, `courseId`, and `keyword` are mutually exclusive.',
    'If `keyword` is provided, it takes priority over subject/course filters.',
  ].join('\n'),
  parameters: [
    {
      name: 'keyword',
      in: 'query',
      required: false,
      description: 'Search across question text, course name, and subject name.',
      schema: { type: 'string', example: 'Newton' },
    },
    {
      name: 'subjectId',
      in: 'query',
      required: false,
      description: 'Filter doubts by subject ID. Ignored if keyword is present.',
      schema: { type: 'integer', example: 7 },
    },
    {
      name: 'courseId',
      in: 'query',
      required: false,
      description: 'Filter doubts by course ID. Ignored if keyword or subjectId is present.',
      schema: { type: 'integer', example: 3 },
    },
    {
      name: 'page',
      in: 'query',
      required: false,
      description: 'Page number (default: 1).',
      schema: { type: 'integer', example: 1 },
    },
    {
      name: 'limit',
      in: 'query',
      required: false,
      description: 'Results per page (default: 10, max: 100).',
      schema: { type: 'integer', example: 10 },
    },
  ],
  responses: {
    200: {
      description: 'List of doubts fetched successfully',
      content: {
        'application/json': {
          example: {
            success: true,
            message: 'Doubts fetched successfully',
            data: [
              {
                // ── Student fields ──────────────────────────
                doubt_id:          55,
                question_text:     "Can you explain Newton's third law?",
                course_id:         3,
                course_name:       'Physics',
                subject_id:        7,
                subject_name:      'Mechanics',
                status:            'open',
                created_at:        '2025-03-10T09:00:00Z',
                last_activity_at:  '2025-03-12T14:30:00Z', // latest reply time, or created_at if no replies
              },
              {
                doubt_id:          56,
                question_text:     "What is Ohm's law?",
                course_id:         4,
                course_name:       'Electronics',
                subject_id:        8,
                subject_name:      'Circuits',
                status:            'resolved',
                created_at:        '2025-03-11T10:00:00Z',
                last_activity_at:  '2025-03-11T10:00:00Z', // no replies → falls back to created_at
              },
              {
                // ── Extra field for teacher role ────────────
                doubt_id:          57,
                question_text:     'What is Fleming\'s left hand rule?',
                course_id:         3,
                course_name:       'Physics',
                subject_id:        7,
                subject_name:      'Mechanics',
                status:            'answered',
                created_at:        '2025-03-09T08:00:00Z',
                last_activity_at:  '2025-03-13T11:00:00Z',
                student_name:      'Ravi Kumar',  // only present for teacher role
              },
            ],
            pagination: {
              total:      42,
              page:       1,
              limit:      10,
              totalPages: 5,
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request — userId missing',
      content: {
        'application/json': {
          example: { success: false, message: 'userId is required' },
        },
      },
    },
    401: {
      description: 'Unauthorized — missing or invalid JWT',
      content: {
        'application/json': {
          example: { success: false, message: 'Unauthorized' },
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          example: { success: false, message: 'Error fetching doubts: <db error>' },
        },
      },
    },
  },
},
    },

    // ══════════════════════════════════════════════════
    // TEACHER DOUBTS  —  GET /api/doubts/teacher-doubts
    // controller: getTeacherDoubts
    // Auth: req.user.id → userId (teacher)
    // ══════════════════════════════════════════════════

    // '/doubts/teacher-doubts': {
    //   get: {
    //     tags: ['Doubt Clarification'],
    //     summary: 'Get all doubts assigned to the logged-in teacher',
    //     description: [
    //       'Returns all doubts directed to the authenticated teacher.',
    //       '',
    //       '**Auth:** Bearer JWT token required. Teacher is identified from `req.user.id`.',
    //     ].join('\n'),
    //     parameters: [],
    //     responses: {
    //       200: {
    //         description: 'List of doubts for the teacher',
    //         content: {
    //           'application/json': {
    //             // controller: res.status(200).json({ success: true, message: "Doubts fetched successfully", data: [...] })
    //             example: {
    //               success: true,
    //               message: 'Doubts fetched successfully',
    //               data: [
    //                 {
    //                   doubt_id:     55,
    //                   question_text: "Can you explain Newton's third law?",
    //                   status:       'open',
    //                   created_at:   '2025-03-10T09:00:00Z',
    //                   student_id:   8,
    //                   student_name: 'Arjun',
    //                   course_id:    3,
    //                   course_name:  'Physics',
    //                   subject_id:   7,
    //                   subject_name: 'Mechanics',
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //       },
    //       401: {
    //         description: 'Unauthorized',
    //         content: {
    //           'application/json': {
    //             example: { success: false, message: 'Unauthorized' },
    //           },
    //         },
    //       },
    //       500: {
    //         description: 'Internal server error',
    //         content: {
    //           'application/json': {
    //             example: { success: false, message: 'Error fetching teacher doubts: <db error>' },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },

    // ══════════════════════════════════════════════════
    // REPLY  —  POST /api/doubts/reply
    // controller: replyToDoubt
    // Auth: req.user.id → userId; responderType derived from DB
    // ══════════════════════════════════════════════════

    '/doubts/reply': {
      post: {
        tags: ['Doubt Clarification'],
        summary: 'Reply to a doubt',
        description: [
          'Allows a teacher or student to post a reply to an existing doubt, with optional file attachments (up to 5 files).',
          '',
          '**Auth:** Bearer JWT token required.',
          '',
          '**Note:** `responderType` (`teacher` | `student`) is **automatically derived from the database** using `req.user.id`.',
          'Do NOT pass `responderType` in the request body.',
          '',
          'Validation rules:',
          '- A teacher can only reply to doubts assigned to them.',
          '- A student can only reply to their own doubt.',
          '- Replies are not allowed on doubts with status `resolved`.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['doubtId', 'replyText'],
                properties: {
                  doubtId:   { type: 'integer', example: 55,  description: 'ID of the doubt to reply to' },
                  replyText: { type: 'string',  example: "Newton's third law states that every action has an equal and opposite reaction." },
                  files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Up to 5 attachment files',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Reply posted successfully',
            content: {
              'application/json': {
                // controller: res.status(201).json({ success: true, message: "Reply posted successfully", data: { replyId, doubtId, responderType } })
                example: {
                  success: true,
                  message: 'Reply posted successfully',
                  data: {
                    replyId:       12,
                    doubtId:       55,
                    responderType: 'teacher',
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                examples: {
                  missingFields: {
                    summary: 'Missing required fields',
                    value: { success: false, message: 'Missing required fields' },
                  },
                  alreadyResolved: {
                    summary: 'Doubt already resolved',
                    value: { success: false, message: 'This doubt is already resolved' },
                  },
                  notAssigned: {
                    summary: 'Teacher not assigned to this doubt',
                    value: { success: false, message: 'You are not assigned to this doubt' },
                  },
                  notOwner: {
                    summary: 'Student replying to someone else\'s doubt',
                    value: { success: false, message: 'You can only reply to your own doubt' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // ENROLLED COURSES  —  GET /api/doubts/enrolled-courses
    // controller: getEnrolledCourses
    // Auth: req.user.id → userId
    // Works for both student (enrolled courses) and teacher (assigned courses)
    // ══════════════════════════════════════════════════

    '/doubts/enrolled-courses': {
      get: {
        tags: ['Doubt Clarification'],
        summary: 'Get courses for the logged-in user (for doubt creation dropdown)',
        description: [
          'Returns courses available to the authenticated user.',
          '',
          '**Auth:** Bearer JWT token required.',
          '',
          '- **Student:** Returns courses in which the student is currently enrolled.',
          '- **Teacher:** Returns distinct courses for which the teacher is assigned subjects.',
          '',
          'Primarily used to populate the course dropdown when a student is creating a new doubt.',
        ].join('\n'),
        parameters: [],
        responses: {
          200: {
            description: 'List of courses',
            content: {
              'application/json': {
                // controller: res.status(200).json({ success: true, message: 'Courses fetched successfully', data: [...] })
                example: {
                  success: true,
                  message: 'Courses fetched successfully',
                  data: [
                    { course_id: 3, course_name: 'Physics' },
                    { course_id: 4, course_name: 'Electronics' },
                  ],
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                example: { success: false, message: '<db error>' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // SUBJECTS BY COURSE  —  GET /api/doubts/subjects?courseId=3
    // controller: getSubjectsByCourse
    // Auth: req.user.id → userId
    // Works for both student and teacher
    // ══════════════════════════════════════════════════

    '/doubts/subjects': {
      get: {
        tags: ['Doubt Clarification'],
        summary: 'Get subjects for a course (for doubt creation dropdown)',
        description: [
          'Returns active subjects under a course for the authenticated user.',
          '',
          '**Auth:** Bearer JWT token required.',
          '',
          '- **Student:** Returns all active subjects in the given course.',
          '- **Teacher:** Returns only subjects within the course assigned to them.',
          '',
          'Primarily used to populate the subject dropdown when creating a doubt.',
        ].join('\n'),
        parameters: [
          {
            name: 'courseId', in: 'query', required: true,
            description: 'ID of the course to fetch subjects for',
            schema: { type: 'integer', example: 3 },
          },
        ],
        responses: {
          200: {
            description: 'List of subjects',
            content: {
              'application/json': {
                // controller: res.status(200).json({ success: true, message: 'Subjects fetched successfully', data: [...] })
                example: {
                  success: true,
                  message: 'Subjects fetched successfully',
                  data: [
                    { subject_id: 7, subject_name: 'Mechanics' },
                    { subject_id: 9, subject_name: 'Thermodynamics' },
                  ],
                },
              },
            },
          },
          400: {
            description: 'courseId is required',
            content: {
              'application/json': {
                example: { success: false, message: 'courseId is required' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                example: { success: false, message: '<db error>' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // FILTER  —  GET /api/doubts/filter
    // controller: getDoubtsByFilter
    // Auth: req.user.id → userId (student or teacher)
    // ══════════════════════════════════════════════════

    // '/doubts/filter': {
    //   get: {
    //     tags: ['Doubt Clarification'],
    //     summary: 'Filter doubts by subject or course',
    //     description: [
    //       'Returns doubts filtered by `subjectId` or `courseId` for the authenticated user.',
    //       '',
    //       '**Auth:** Bearer JWT token required. Role (student/teacher) is derived from `req.user.id` automatically.',
    //       '',
    //       '**At least one of `subjectId` or `courseId` is required.**',
    //       '',
    //       '- **Student:** Returns their own doubts matching the filter.',
    //       '- **Teacher:** Returns doubts assigned to them matching the filter.',
    //       '',
    //       'When `subjectId` is provided it takes priority; `courseId` is used as fallback.',
    //     ].join('\n'),
    //     parameters: [
    //       {
    //         name: 'subjectId', in: 'query', required: false,
    //         description: 'Filter by subject ID (takes priority over courseId)',
    //         schema: { type: 'integer', example: 7 },
    //       },
    //       {
    //         name: 'courseId', in: 'query', required: false,
    //         description: 'Filter by course ID',
    //         schema: { type: 'integer', example: 3 },
    //       },
    //     ],
    //     responses: {
    //       200: {
    //         description: 'Filtered list of doubts',
    //         content: {
    //           'application/json': {
    //             // controller: res.status(200).json({ success: true, message: "Doubts fetched successfully", data: [...] })
    //             example: {
    //               success: true,
    //               message: 'Doubts fetched successfully',
    //               data: [
    //                 {
    //                   doubt_id:     55,
    //                   question_text: "Can you explain Newton's third law?",
    //                   status:       'open',
    //                   created_at:   '2025-03-10T09:00:00Z',
    //                   subject_name: 'Mechanics',
    //                   course_id:    3,
    //                   course_name:  'Physics',
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //       },
    //       400: {
    //         description: 'Either subjectId or courseId is required',
    //         content: {
    //           'application/json': {
    //             examples: {
    //               missingParams: {
    //                 summary: 'No filter params provided',
    //                 value: { success: false, message: 'Either subjectId or courseId is required' },
    //               },
    //               notStudentOrTeacher: {
    //                 summary: 'User is neither student nor teacher',
    //                 value: { success: false, message: 'User is neither a student nor a teacher' },
    //               },
    //             },
    //           },
    //         },
    //       },
    //       401: {
    //         description: 'Unauthorized',
    //         content: {
    //           'application/json': {
    //             example: { success: false, message: 'Unauthorized' },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },

    // // ══════════════════════════════════════════════════
    // // SEARCH  —  GET /api/doubts/search?keyword=maths
    // // controller: searchDoubts
    // // Auth: req.user.id → userId (student or teacher)
    // // ══════════════════════════════════════════════════

    // '/doubts/search': {
    //   get: {
    //     tags: ['Doubt Clarification'],
    //     summary: 'Search doubts by keyword',
    //     description: [
    //       'Full-text search across `question_text`, `course_name`, and `subject_name`.',
    //       '',
    //       '**Auth:** Bearer JWT token required. Role (student/teacher) is derived from `req.user.id` automatically.',
    //       '',
    //       '- **Student:** Searches within their own doubts.',
    //       '- **Teacher:** Searches within doubts assigned to them.',
    //     ].join('\n'),
    //     parameters: [
    //       {
    //         name: 'keyword', in: 'query', required: true,
    //         description: 'Search term (matched against question text, course name, and subject name)',
    //         schema: { type: 'string', example: 'newton' },
    //       },
    //     ],
    //     responses: {
    //       200: {
    //         description: 'Search results',
    //         content: {
    //           'application/json': {
    //             // controller: res.status(200).json({ success: true, message: 'Search results fetched successfully', data: [...] })
    //             example: {
    //               success: true,
    //               message: 'Search results fetched successfully',
    //               data: [
    //                 {
    //                   doubt_id:     55,
    //                   question_text: "Can you explain Newton's third law?",
    //                   status:       'open',
    //                   created_at:   '2025-03-10T09:00:00Z',
    //                   course_id:    3,
    //                   course_name:  'Physics',
    //                   subject_id:   7,
    //                   subject_name: 'Mechanics',
    //                 },
    //               ],
    //             },
    //           },
    //         },
    //       },
    //       400: {
    //         description: 'keyword is required',
    //         content: {
    //           'application/json': {
    //             examples: {
    //               missingKeyword: {
    //                 summary: 'Keyword not provided',
    //                 value: { success: false, message: 'keyword is required' },
    //               },
    //               notStudentOrTeacher: {
    //                 summary: 'User is neither student nor teacher',
    //                 value: { success: false, message: 'User is neither a student nor a teacher' },
    //               },
    //             },
    //           },
    //         },
    //       },
    //       401: {
    //         description: 'Unauthorized',
    //         content: {
    //           'application/json': {
    //             example: { success: false, message: 'Unauthorized' },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },

    // ══════════════════════════════════════════════════
    // UPDATE STATUS  —  PUT /api/doubts/:doubtId/status
    // controller: updateDoubtStatus
    // Auth: req.user.id → userId (must be the student who posted the doubt)
    // ══════════════════════════════════════════════════

    '/doubts/{doubtId}/status': {
      put: {
        tags: ['Doubt Clarification'],
        summary: 'Mark a doubt as resolved',
        description: [
          'Allows the student who posted the doubt to mark it as `resolved`.',
          '',
          '**Auth:** Bearer JWT token required. Only the student who created the doubt can resolve it.',
          '',
          '**Note:** No request body is required. `studentId` is derived from `req.user.id`.',
        ].join('\n'),
        parameters: [
          {
            name: 'doubtId', in: 'path', required: true,
            description: 'ID of the doubt to resolve',
            schema: { type: 'integer', example: 55 },
          },
        ],
        // No requestBody — userId is taken from JWT, status is always 'resolved'
        responses: {
          200: {
            description: 'Doubt marked as resolved successfully',
            content: {
              'application/json': {
                // controller: res.status(200).json({ success: true, message: "Marked as resolved successfully", data: { doubtId, status } })
                example: {
                  success: true,
                  message: 'Marked as resolved successfully',
                  data: {
                    doubtId: 55,
                    status:  'resolved',
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                examples: {
                  notFound: {
                    summary: 'Doubt not found',
                    value: { success: false, message: 'Doubt not found' },
                  },
                  notOwner: {
                    summary: 'Not the owner of the doubt',
                    value: { success: false, message: 'You can only resolve your own doubt' },
                  },
                  alreadyResolved: {
                    summary: 'Already resolved',
                    value: { success: false, message: 'Doubt is already resolved' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // DOUBT DETAIL  —  GET /api/doubts/:doubtId
    // controller: getDoubtDetail
    // Auth: req.user.id (token required, no role check in controller)
    // ══════════════════════════════════════════════════

    '/doubts/{doubtId}': {
      get: {
        tags: ['Doubt Clarification'],
        summary: 'Get full details of a doubt',
        description: [
          'Returns the complete doubt record including the student who posted it, all replies, and all attachments.',
          '',
          '**Auth:** Bearer JWT token required.',
        ].join('\n'),
        parameters: [
          {
            name: 'doubtId', in: 'path', required: true,
            description: 'ID of the doubt',
            schema: { type: 'integer', example: 55 },
          },
        ],
        responses: {
          200: {
            description: 'Doubt details with student info, replies, and attachments',
            content: {
              'application/json': {
                // controller: res.status(200).json({ success: true, message: "Doubt details fetched successfully", data: { ... } })
                example: {
                  success: true,
                  message: 'Doubt details fetched successfully',
                  data: {
                    doubtId:      55,
                    questionText: "Can you explain Newton's third law?",
                    status:       'open',
                    createdAt:    '2025-03-10T09:00:00Z',
                    student: {
                      id:     101,
                      name:   'Arjun Sharma',
                      avatar: 'https://storage.example.com/avatars/student-101.png',
                      attachments: [
                        {
                          attachmentId: 1,
                          fileType:     'image',
                          fileUrl:      'https://storage.example.com/doubt-55-img1.png',
                          fileName:     'newton-diagram.png',
                          fileSizeKb:   204,
                        },
                      ],
                    },
                    replies: [
                      {
                        replyId:       12,
                        replyText:     "Newton's third law states every action has an equal and opposite reaction.",
                        responderType: 'teacher',
                        createdAt:     '2025-03-10T10:30:00Z',
                        responder: {
                          id:     22,
                          name:   'Dr. Ramesh Kumar',
                          avatar: 'https://storage.example.com/avatars/teacher-22.png',
                        },
                        attachments: [],
                      },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid doubtId or doubt not found',
            content: {
              'application/json': {
                examples: {
                  notFound: {
                    summary: 'Doubt not found',
                    value: { success: false, message: 'Doubt not found' },
                  },
                  missingId: {
                    summary: 'doubtId is required',
                    value: { success: false, message: 'doubtId is required' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                example: { success: false, message: 'Unauthorized' },
              },
            },
          },
        },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY SCHEMES
  // ─────────────────────────────────────────────────────────────────────────
  // Merge this into components.securitySchemes in your main swagger config.
  // This is what renders the "Available authorizations / BearerAuth" button.
  //
  // ✅ Routes do NOT carry `security: [{ bearerAuth: [] }]` individually —
  //    that would lock them and break the Authorize flow.
  // ✅ No top-level `security` key in swagger.config.js either.
  // The button appears just from securitySchemes being defined here.
  securitySchemes: {
    bearerAuth: {
      type:         'http',
      scheme:       'bearer',
      bearerFormat: 'JWT',
      description:  'Paste your JWT token. Swagger adds the "Bearer " prefix automatically.',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    { name: 'Doubt Clarification', description: 'Submit, view, filter, search, reply to, and resolve doubts' },
  ],
};