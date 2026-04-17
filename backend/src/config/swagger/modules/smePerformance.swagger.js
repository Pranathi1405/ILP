/**
 * src/config/swagger/modules/smePerformance.swagger.js
 * Swagger docs for SME performance dashboards exposed at /api/v1/*
 */

const SUBJECTS = ['all', 'physics', 'chemistry', 'mathematics'];

const COURSES = [
  'aeee',
  'bitsat',
  'cgpet',
  'comedk',
  'jee_advanced',
  'jee_mains',
  'kcet',
  'manipal_met',
  'mhtcet',
  'neet',
  'srmjee',
  'ts_ap_eapcet',
  'viteee',
  'wbjee',
];

const authResponses = {
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  500: { $ref: '#/components/responses/ServerError' },
};

export const smePerformanceSwagger = {
  tags: [
    {
      name: 'SME Performance Filters',
      description: 'Shared subject and course filters used by SME performance pages',
    },
    {
      name: 'SME Performance Student',
      description: 'Student-only performance, test list, and test detail APIs',
    },
    {
      name: 'SME Performance Teacher',
      description: 'Teacher-only classroom leaderboard and student overview APIs',
    },
    {
      name: 'SME Performance Parent',
      description: 'Parent-only child performance and test history APIs',
    },
  ],

  schemas: {
    SmePerformanceFilterOption: {
      type: 'object',
      properties: {
        value: { type: 'string', example: 'physics' },
        label: { type: 'string', example: 'Physics' },
      },
    },

    SmePerformanceStudentStats: {
      type: 'object',
      properties: {
        totalTestsAttempted: { type: 'integer', example: 24 },
        accuracy: { type: 'number', format: 'float', example: 72.5 },
      },
    },

    SmePerformanceBarPoint: {
      type: 'object',
      properties: {
        subject: { type: 'string', example: 'Physics' },
        avgScore: { type: 'number', format: 'float', example: 78.5 },
      },
    },

    SmePerformanceLinePoint: {
      type: 'object',
      properties: {
        testName: { type: 'string', example: 'Kinematics Weekly Test' },
        score: { type: 'number', format: 'float', example: 56 },
        date: { type: 'string', format: 'date', example: '2026-04-12' },
      },
    },

    SmePerformanceStudentTestRow: {
      type: 'object',
      properties: {
        sNo: { type: 'integer', example: 1 },
        testId: { type: 'integer', example: 101 },
        testName: { type: 'string', example: 'Physics Mock 1' },
        status: { type: 'string', example: 'attempted' },
        subject: { type: 'string', example: 'Physics' },
        score: { type: 'number', format: 'float', example: 42 },
        totalMarks: { type: 'number', format: 'float', example: 60 },
        date: { type: 'string', format: 'date', example: '2026-04-10' },
      },
    },

    SmePerformancePaginatedTests: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 12 },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        tests: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmePerformanceStudentTestRow' },
        },
      },
    },

    SmePerformanceQuestionBreakdown: {
      type: 'object',
      properties: {
        sNo: { type: 'integer', example: 1 },
        questionId: { type: 'integer', example: 501 },
        questionText: { type: 'string', example: 'What is the SI unit of force?' },
        topic: { type: 'string', example: 'Laws of Motion' },
        markedAnswer: { type: 'string', nullable: true, example: 'Newton' },
        correctAnswer: { type: 'string', nullable: true, example: 'Newton' },
        status: { type: 'string', enum: ['correct', 'wrong', 'not_attempted'], example: 'correct' },
        marksAwarded: { type: 'number', format: 'float', example: 4 },
        marksDeducted: { type: 'number', format: 'float', example: 0 },
        timeTaken: { type: 'integer', example: 0 },
      },
    },

    SmePerformancePieChart: {
      type: 'object',
      properties: {
        correct: { type: 'integer', example: 12 },
        wrong: { type: 'integer', example: 4 },
        notAttempted: { type: 'integer', example: 4 },
      },
    },

    SmePerformanceTestDetail: {
      type: 'object',
      properties: {
        testId: { type: 'integer', example: 101 },
        testName: { type: 'string', example: 'Physics Mock 1' },
        subject: { type: 'string', example: 'Physics' },
        totalQuestions: { type: 'integer', example: 20 },
        attemptedQuestions: { type: 'integer', example: 16 },
        score: { type: 'number', format: 'float', example: 48 },
        totalMarks: { type: 'number', format: 'float', example: 60 },
        timeAllotted: { type: 'integer', example: 3600 },
        timeSpent: { type: 'integer', example: 3025 },
        pieChart: { $ref: '#/components/schemas/SmePerformancePieChart' },
        questions: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmePerformanceQuestionBreakdown' },
        },
      },
    },

    SmePerformanceLeaderboardRow: {
      type: 'object',
      properties: {
        rank: { type: 'integer', example: 1 },
        studentId: { type: 'integer', example: 11 },
        studentName: { type: 'string', example: 'Aarav Sharma' },
        avgScore: { type: 'number', format: 'float', example: 82.3 },
      },
    },

    SmePerformanceTeacherStudentsRow: {
      type: 'object',
      properties: {
        sNo: { type: 'integer', example: 1 },
        studentId: { type: 'integer', example: 11 },
        studentName: { type: 'string', example: 'Aarav Sharma' },
        course: { type: 'string', example: 'JEE Advanced' },
        avgScore: { type: 'number', format: 'float', example: 82.3 },
      },
    },

    SmePerformanceOverviewCards: {
      type: 'object',
      properties: {
        testsAttempted: { type: 'integer', example: 12 },
        avgScore: { type: 'number', format: 'float', example: 67.5 },
        accuracy: { type: 'number', format: 'float', example: 72.1 },
        weakTopics: {
          type: 'array',
          items: { type: 'string' },
          example: ['Thermodynamics', 'Electrostatics'],
        },
      },
    },

    SmePerformanceHistoryRow: {
      type: 'object',
      properties: {
        sNo: { type: 'integer', example: 1 },
        testName: { type: 'string', example: 'Physics Mock 1' },
        date: { type: 'string', format: 'date', example: '2026-04-10' },
        score: { type: 'number', format: 'float', example: 42 },
        totalMarks: { type: 'number', format: 'float', example: 60 },
        accuracy: { type: 'number', format: 'float', example: 70 },
      },
    },

    SmePerformanceScoreGraph: {
      type: 'object',
      properties: {
        last7Tests: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmePerformanceLinePoint' },
        },
      },
    },

    SmePerformanceTeacherStudentDetail: {
      type: 'object',
      properties: {
        studentId: { type: 'integer', example: 11 },
        studentName: { type: 'string', example: 'Aarav Sharma' },
        cards: { $ref: '#/components/schemas/SmePerformanceOverviewCards' },
        testHistory: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmePerformanceHistoryRow' },
        },
        scoreGraph: { $ref: '#/components/schemas/SmePerformanceScoreGraph' },
      },
    },

    SmePerformanceParentStats: {
      type: 'object',
      properties: {
        studentName: { type: 'string', example: 'Aarav Sharma' },
        totalTestsAttempted: { type: 'integer', example: 12 },
        accuracy: { type: 'number', format: 'float', example: 66.5 },
      },
    },

    SmePerformanceParentChildOverview: {
      type: 'object',
      properties: {
        studentId: { type: 'integer', example: 11 },
        studentName: { type: 'string', example: 'Aarav Sharma' },
        cards: { $ref: '#/components/schemas/SmePerformanceOverviewCards' },
        testHistory: {
          type: 'array',
          items: { $ref: '#/components/schemas/SmePerformanceHistoryRow' },
        },
        scoreGraph: { $ref: '#/components/schemas/SmePerformanceScoreGraph' },
      },
    },
  },

  paths: {
    '/v1/filters/subjects': {
      get: {
        tags: ['SME Performance Filters'],
        summary: 'Get subject filters for SME performance pages',
        responses: {
          200: {
            description: 'Subject filters fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    subjects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SmePerformanceFilterOption' },
                    },
                  },
                },
                example: {
                  subjects: [
                    { value: 'all', label: 'All' },
                    { value: 'physics', label: 'Physics' },
                    { value: 'chemistry', label: 'Chemistry' },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/v1/filters/courses': {
      get: {
        tags: ['SME Performance Filters'],
        summary: 'Get course filters for teacher leaderboards and student lists',
        responses: {
          200: {
            description: 'Course filters fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    courses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SmePerformanceFilterOption' },
                    },
                  },
                },
                example: {
                  courses: [{ value: 'jee_advanced', label: 'JEE Advanced' }],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/v1/student/{studentId}/stats': {
      get: {
        tags: ['SME Performance Student'],
        summary: 'Get summary stats for the authenticated student',
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 11 },
          },
        ],
        responses: {
          200: {
            description: 'Student stats fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceStudentStats' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/student/{studentId}/performance-graph': {
      get: {
        tags: ['SME Performance Student'],
        summary: 'Get subject averages or subject trend for the authenticated student',
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 11 },
          },
          {
            name: 'subject',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: SUBJECTS, default: 'all' },
            description: '`all` returns a bar graph. Any specific subject returns a line trend graph.',
          },
        ],
        responses: {
          200: {
            description: 'Performance graph fetched successfully',
            content: {
              'application/json': {
                examples: {
                  all_subjects: {
                    summary: 'Bar graph for all subjects',
                    value: {
                      graphType: 'bar',
                      data: [
                        { subject: 'Physics', avgScore: 74.5 },
                        { subject: 'Chemistry', avgScore: 68.2 },
                      ],
                    },
                  },
                  single_subject: {
                    summary: 'Line graph for one subject',
                    value: {
                      graphType: 'line',
                      subject: 'Physics',
                      data: [
                        { testName: 'Mechanics Test 1', score: 45, date: '2026-04-01' },
                        { testName: 'Mechanics Test 2', score: 52, date: '2026-04-08' },
                      ],
                    },
                  },
                },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/student/{studentId}/tests': {
      get: {
        tags: ['SME Performance Student'],
        summary: 'Get paginated SME tests attempted by the authenticated student',
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 11 },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, minimum: 1 },
          },
          {
            name: 'subject',
            in: 'query',
            schema: { type: 'string', enum: SUBJECTS },
          },
          {
            name: 'month',
            in: 'query',
            schema: { type: 'string', example: '2026-04' },
            description: 'Format: YYYY-MM',
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date', example: '2026-04-01' },
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date', example: '2026-04-30' },
          },
        ],
        responses: {
          200: {
            description: 'Student tests fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformancePaginatedTests' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/student/{studentId}/tests/{testId}': {
      get: {
        tags: ['SME Performance Student'],
        summary: 'Get latest submitted SME attempt detail for a student test',
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 11 },
          },
          {
            name: 'testId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 101 },
          },
        ],
        responses: {
          200: {
            description: 'Student test detail fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceTestDetail' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/teacher/{teacherId}/stats': {
      get: {
        tags: ['SME Performance Teacher'],
        summary: 'Get assigned student count for the authenticated teacher',
        parameters: [
          {
            name: 'teacherId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 },
          },
        ],
        responses: {
          200: {
            description: 'Teacher stats fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalAssignedStudents: { type: 'integer', example: 42 },
                  },
                },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/teacher/{teacherId}/leaderboard': {
      get: {
        tags: ['SME Performance Teacher'],
        summary: 'Get top-performing students for the authenticated teacher',
        parameters: [
          {
            name: 'teacherId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 5, minimum: 1 },
          },
          {
            name: 'course',
            in: 'query',
            schema: { type: 'string', enum: COURSES, example: 'jee_advanced' },
          },
        ],
        responses: {
          200: {
            description: 'Teacher leaderboard fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    leaderboard: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SmePerformanceLeaderboardRow' },
                    },
                  },
                },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/teacher/{teacherId}/students': {
      get: {
        tags: ['SME Performance Teacher'],
        summary: 'Get paginated student list for the authenticated teacher',
        parameters: [
          {
            name: 'teacherId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, minimum: 1 },
          },
          {
            name: 'course',
            in: 'query',
            schema: { type: 'string', enum: COURSES, example: 'jee_advanced' },
          },
        ],
        responses: {
          200: {
            description: 'Teacher students fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 24 },
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    students: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SmePerformanceTeacherStudentsRow' },
                    },
                  },
                },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/teacher/{teacherId}/students/{studentId}': {
      get: {
        tags: ['SME Performance Teacher'],
        summary: 'Get a mapped student overview for the authenticated teacher',
        parameters: [
          {
            name: 'teacherId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 7 },
          },
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 11 },
          },
        ],
        responses: {
          200: {
            description: 'Teacher student detail fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceTeacherStudentDetail' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/parent/{parentId}/stats': {
      get: {
        tags: ['SME Performance Parent'],
        summary: 'Get summary stats for the authenticated parent’s linked child',
        parameters: [
          {
            name: 'parentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 9 },
          },
        ],
        responses: {
          200: {
            description: 'Parent stats fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceParentStats' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/parent/{parentId}/performance-graph': {
      get: {
        tags: ['SME Performance Parent'],
        summary: 'Get subject averages or subject trend for a linked child',
        parameters: [
          {
            name: 'parentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'subject',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: SUBJECTS, default: 'all' },
          },
        ],
        responses: {
          200: {
            description: 'Parent performance graph fetched successfully',
            content: {
              'application/json': {
                examples: {
                  all_subjects: {
                    value: {
                      graphType: 'bar',
                      data: [
                        { subject: 'Physics', avgScore: 74.5 },
                        { subject: 'Chemistry', avgScore: 68.2 },
                      ],
                    },
                  },
                  single_subject: {
                    value: {
                      graphType: 'line',
                      subject: 'Physics',
                      data: [
                        { testName: 'Mechanics Test 1', score: 45, date: '2026-04-01' },
                        { testName: 'Mechanics Test 2', score: 52, date: '2026-04-08' },
                      ],
                    },
                  },
                },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/parent/{parentId}/tests': {
      get: {
        tags: ['SME Performance Parent'],
        summary: 'Get paginated SME tests for a linked child',
        parameters: [
          {
            name: 'parentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, minimum: 1 },
          },
          {
            name: 'subject',
            in: 'query',
            schema: { type: 'string', enum: SUBJECTS },
          },
          {
            name: 'month',
            in: 'query',
            schema: { type: 'string', example: '2026-04' },
            description: 'Format: YYYY-MM',
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date', example: '2026-04-01' },
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date', example: '2026-04-30' },
          },
        ],
        responses: {
          200: {
            description: 'Parent tests fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformancePaginatedTests' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/parent/{parentId}/tests/{testId}': {
      get: {
        tags: ['SME Performance Parent'],
        summary: 'Get latest submitted SME attempt detail for a linked child',
        parameters: [
          {
            name: 'parentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'testId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 101 },
          },
        ],
        responses: {
          200: {
            description: 'Parent test detail fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceTestDetail' },
              },
            },
          },
          ...authResponses,
        },
      },
    },

    '/v1/parent/{parentId}/child-overview': {
      get: {
        tags: ['SME Performance Parent'],
        summary: 'Get overview cards, history, and score graph for a linked child',
        parameters: [
          {
            name: 'parentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 9 },
          },
          {
            name: 'studentId',
            in: 'query',
            required: false,
            schema: { type: 'integer', example: 11 },
            description: 'Optional. Use only when the parent is linked to multiple children.',
          },
        ],
        responses: {
          200: {
            description: 'Parent child overview fetched successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SmePerformanceParentChildOverview' },
              },
            },
          },
          ...authResponses,
        },
      },
    },
  },
};
