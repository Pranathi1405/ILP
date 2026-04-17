/**
 * src/config/swagger/modules/teacher-analytics.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Teacher Analytics module.
 *
 * Endpoints: dashboard, course analytics, test analytics,
 *            student performance (with topic names), live class analytics,
 *            course student progress, course leaderboard preview.
 */

export const teacherAnalyticsSwagger = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {
    TeacherDashboard: {
      type: 'object',
      properties: {
        total_courses_created: { type: 'integer', example: 5 },
        published_courses: { type: 'integer', example: 4 },
        total_students: { type: 'integer', example: 230 },
        active_students: { type: 'integer', example: 180 },
        total_enrollments: { type: 'integer', example: 320 },
        average_course_rating: { type: 'string', example: '4.3' },
        total_reviews: { type: 'integer', example: 95 },
        total_revenue: { type: 'number', example: 45000.0 },
        total_revenue_formatted: { type: 'string', example: '₹45000.00' },
        average_student_progress: { type: 'number', example: 62.5 },
        total_live_classes: { type: 'integer', example: 40 },
        total_doubts_answered: { type: 'integer', example: 120 },
        average_response_time_hours: { type: 'integer', example: 4 },
      },
    },

    CourseAnalytics: {
      type: 'object',
      properties: {
        course_id: { type: 'integer', example: 5 },
        course_title: { type: 'string', example: 'JEE Advanced Chemistry' },
        thumbnail_url: { type: 'string', nullable: true },
        total_enrollments: { type: 'integer', example: 120 },
        active_students: { type: 'integer', example: 95 },
        completed_students: { type: 'integer', example: 25 },
        dropout_rate: { type: 'string', example: '8.33' },
        average_completion_rate: { type: 'string', example: '68.50' },
        average_test_score: { type: 'number', example: 71.0 },
        average_rating: { type: 'string', example: '4.2' },
        total_reviews: { type: 'integer', example: 45 },
        total_revenue_formatted: { type: 'string', example: '₹18000.00' },
        popular_modules: {
          type: 'array',
          items: { type: 'integer' },
          example: [3, 7],
          description: 'Module IDs with highest engagement (parsed from JSON)',
        },
        challenging_topics: {
          type: 'array',
          items: { type: 'integer' },
          example: [12],
          description: 'Topic IDs with lowest test scores (parsed from JSON)',
        },
      },
    },

    LiveClassAnalytics: {
      type: 'object',
      properties: {
        class_id: { type: 'integer', example: 18 },
        class_title: { type: 'string', example: 'Organic Chemistry — Mechanisms' },
        scheduled_start_time: { type: 'string', format: 'date-time' },
        duration_minutes: { type: 'integer', example: 60 },
        total_participants: { type: 'integer', example: 42 },
        average_duration_minutes: {
          type: 'string',
          example: '48',
          description: 'Avg minutes a participant stayed in the class',
        },
        attendance_rate: {
          type: 'string',
          example: '87.5',
          description: '(participants ÷ active enrolled students) × 100',
        },
      },
    },

    // ── NEW: one student row in course progress list ─────────
    CourseStudentProgressResponse: {
      type: 'object',
      properties: {
        course_id: { type: 'integer', example: 5 },
        course_name: { type: 'string', example: 'JEE Advanced Chemistry' },
        total_students: { type: 'integer', example: 120 },
        students: {
          type: 'array',
          items: { $ref: '#/components/schemas/CourseStudentProgress' },
        },
      },
    },

    // ── NEW: one row in course leaderboard preview ───────────
    CourseLeaderboardEntry: {
      type: 'object',
      description: 'Top-N leaderboard entry for a specific course.',
      properties: {
        rank: { type: 'integer', example: 1 },
        student_id: { type: 'integer', example: 201 },
        name: { type: 'string', example: 'Riya Sharma' },
        profile_picture_url: { type: 'string', nullable: true },
        total_score: { type: 'string', example: '97.50' },
        completion_percent: { type: 'string', example: '100.0' },
        average_test_score: { type: 'string', example: '97.5' },
        tests_completed: { type: 'integer', example: 6 },
      },
    },
    TeacherTestAnalytics: {
      type: 'object',
      properties: {
        subject_id: { type: 'integer' },
        subject_title: { type: 'string' },
        course_title: { type: 'string' },
        test_type: { type: 'string' },

        total_students: { type: 'integer' },
        total_attempts: { type: 'integer' },

        average_score: { type: 'string', example: '68.45' },

        // 🔥 NEW
        avg_accuracy: { type: 'string', example: '72.10' },
        avg_time_per_question: { type: 'string', example: '1.40' },
        avg_score_variance: { type: 'string', example: '35.20' },

        total_questions: { type: 'integer' },
        total_correct_answers: { type: 'integer' },
        total_unanswered: { type: 'integer' },

        students_passed: { type: 'integer' },

        pass_rate: { type: 'string', example: '65.0' },

        // 🔥 Derived
        overall_accuracy: { type: 'number', example: 70.25 },
        consistency_level: {
          type: 'string',
          enum: ['consistent', 'moderate', 'inconsistent'],
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {
    '/analytics/teacher/dashboard': {
      get: {
        tags: ['Teacher Analytics'],
        summary: 'Get teacher dashboard',
        description: [
          'Returns aggregate metrics for the logged-in teacher.',
          '',
          '**Data source:** `teacher_analytics`',
          '',
          'Includes: course counts, student counts, revenue (₹ formatted),',
          'average rating, live class count, and doubt response time.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Teacher dashboard fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/TeacherDashboard' } },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Teacher dashboard fetched successfully',
                  data: {
                    total_courses_created: 5,
                    published_courses: 4,
                    total_students: 230,
                    active_students: 180,
                    average_course_rating: '4.3',
                    total_revenue_formatted: '₹45000.00',
                    total_live_classes: 40,
                    total_doubts_answered: 120,
                    average_response_time_hours: 4,
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/teacher/courses': {
      get: {
        tags: ['Teacher Analytics'],
        summary: 'Get course analytics for teacher',
        description: [
          'Returns enrollment, completion rate, dropout rate, revenue, and ratings per course.',
          '',
          '**Data source:** `course_analytics`',
          '',
          'Sorted by total enrollments descending.',
          '`popular_modules` and `challenging_topics` are JSON arrays parsed by the service.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Course analytics fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CourseAnalytics' },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Course analytics fetched successfully',
                  data: [
                    {
                      course_id: 5,
                      course_title: 'JEE Advanced Chemistry',
                      total_enrollments: 120,
                      average_completion_rate: '68.50',
                      dropout_rate: '8.33',
                      average_rating: '4.2',
                      total_revenue_formatted: '₹18000.00',
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/teacher/tests': {
      get: {
        tags: ['Teacher Analytics'],
        summary: "Get test analytics across teacher's courses",
        description: [
          'Returns aggregated test performance per subject across all students.',
          '',
          "**Data source:** `test_performance_analytics` filtered by teacher's courses.",
          '',
          'Includes score, accuracy, time efficiency, and consistency metrics.',
          '',
          '`pass_rate` = % of students with average_score ≥ 40.',
          '`overall_accuracy` = total_correct_answers / total_questions * 100.',
          '',
          'Sorted by average score ascending (weakest subjects first).',
        ].join('\n'),
        responses: {
          200: {
            description: 'Test analytics fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Test analytics fetched successfully' },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/TeacherTestAnalytics',
                      },
                    },
                  },
                },
                example: {
                  success: true,
                  message: 'Test analytics fetched successfully',
                  data: [
                    {
                      subject_id: 12,
                      subject_title: 'Organic Chemistry',
                      course_title: 'JEE Advanced Chemistry',
                      test_type: 'custom',

                      total_students: 40,
                      total_attempts: 120,

                      average_score: '66.80',
                      avg_accuracy: '71.25',
                      avg_time_per_question: '1.35',
                      avg_score_variance: '42.10',

                      total_questions: 4800,
                      total_correct_answers: 3200,
                      total_unanswered: 600,

                      students_passed: 29,
                      pass_rate: '72.5',

                      overall_accuracy: 66.67,
                      consistency_level: 'moderate',
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/teacher/live-classes': {
      get: {
        tags: ['Teacher Analytics'],
        summary: 'Get live class analytics for teacher',
        description: [
          'Returns attendance rate, average duration, and participant count for the last 20 classes.',
          '',
          '**Data sources:** `live_classes` + `live_class_attendance`',
          '',
          '`attendance_rate` = (participants ÷ active enrolled students) × 100.',
          '`average_duration_minutes` = avg time a participant stayed in the session.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Live class analytics fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/LiveClassAnalytics' },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Live class analytics fetched successfully',
                  data: [
                    {
                      class_id: 18,
                      class_title: 'Organic Chemistry — Mechanisms',
                      total_participants: 42,
                      average_duration_minutes: '48',
                      attendance_rate: '87.5',
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── NEW ────────────────────────────────────────────────────
    '/analytics/teacher/courses/{courseId}/students': {
      get: {
        tags: ['Teacher Analytics'],
        summary: 'Get student progress for a specific course',
        description: [
          'Returns all active students enrolled in a course with their progress %,',
          'average test score, last activity timestamp, course rank, and status label.',
          '',
          '**Data sources:** `course_enrollments` + `course_progress_analytics` + `course_leaderboard`',
          '',
          'Sorted by course rank ascending (best-ranked students first).',
          'Students not yet in the leaderboard have `course_rank: null`.',
          '',
          '⚠️ The teacher must own the course (validated via `courses.created_by`).',
        ].join('\n'),
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 5 },
            description: 'ID of the course',
          },
        ],
        responses: {
          200: {
            description: 'Course student progress fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          $ref: '#/components/schemas/CourseStudentProgressResponse',
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Course student progress fetched successfully',
                  data: {
                    course_id: 5,
                    course_name: 'JEE Advanced Chemistry',
                    total_students: 3,
                    students: [
                      {
                        student_id: 201,
                        name: 'Riya Sharma',
                        progress_percentage: '100.0',
                        average_test_score: '97.5',
                        last_activity: '2026-03-16T09:00:00Z',
                        course_rank: 1,
                        status: 'Completed',
                      },
                      {
                        student_id: 101,
                        name: 'Arjun Mehta',
                        progress_percentage: '65.5',
                        average_test_score: '74.0',
                        last_activity: '2026-03-15T18:30:00Z',
                        course_rank: 5,
                        status: 'In Progress',
                      },
                      {
                        student_id: 305,
                        name: 'Kavya Reddy',
                        progress_percentage: '0.0',
                        average_test_score: '0.0',
                        last_activity: null,
                        course_rank: null,
                        status: 'Not Started',
                      },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: '400 — courseId is missing or not a valid integer',
            content: {
              'application/json': {
                example: { success: false, message: 'Valid courseId is required' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── NEW ────────────────────────────────────────────────────
    '/analytics/teacher/courses/{courseId}/leaderboard': {
      get: {
        tags: ['Teacher Analytics'],
        summary: 'Get leaderboard preview for a course',
        description: [
          'Returns the top N students in a course leaderboard, sorted by rank.',
          '',
          '**Data source:** `course_leaderboard`',
          '',
          'Intended as a quick preview on the teacher course detail page.',
          'Use `limit` to control how many rows are returned (default 10, max uncapped).',
        ].join('\n'),
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 5 },
            description: 'ID of the course',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, example: 5 },
            description: 'Number of top students to return (default: 10)',
          },
        ],
        responses: {
          200: {
            description: 'Course leaderboard fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CourseLeaderboardEntry' },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Course leaderboard fetched successfully',
                  data: [
                    {
                      rank: 1,
                      student_id: 201,
                      name: 'Riya Sharma',
                      total_score: '97.50',
                      completion_percent: '100.0',
                      average_test_score: '97.5',
                      tests_completed: 6,
                    },
                    {
                      rank: 2,
                      student_id: 88,
                      name: 'Dev Patel',
                      total_score: '91.00',
                      completion_percent: '95.0',
                      average_test_score: '89.0',
                      tests_completed: 6,
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: '400 — courseId is missing or not a valid integer',
            content: {
              'application/json': {
                example: { success: false, message: 'Valid courseId is required' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/teacher/student/{studentId}': {
      get: {
        tags: ['Teacher Analytics'],
        summary: "Get a specific student's performance (teacher view)",
        description: [
          'Returns overview metrics, course progress, and topic mastery for a student.',
          '',
          '**Data sources:** `student_dashboard_analytics` + `topic_mastery_analytics`',
          '  JOIN `subject_modules` (topic names) + `course_progress_analytics`',
          '',
          '`topic_mastery` entries include `topic_name` (resolved from `subject_modules`)',
          'and a normalised `mastery_level` (STRONG / AVERAGE / WEAK).',
        ].join('\n'),
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 101 },
            description: "The student's student_id",
          },
        ],
        responses: {
          200: {
            description: 'Student performance fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Student performance fetched successfully',
                  data: {
                    overview: {
                      tests_attempted: 10,
                      average_test_score: 72.5,
                      current_rank: 42,
                      current_streak_days: 5,
                    },
                    topic_mastery: [
                      {
                        module_id: 12,
                        topic_name: 'Alkenes & Alkynes',
                        subject_title: 'Organic Chemistry',
                        avg_score: '88.00',
                        mastery_level: 'STRONG',
                      },
                      {
                        module_id: 3,
                        topic_name: 'Electrochemistry',
                        subject_title: 'Physical Chemistry',
                        avg_score: '28.00',
                        mastery_level: 'WEAK',
                      },
                    ],
                    course_progress: [
                      {
                        course_id: 5,
                        course_title: 'JEE Advanced Chemistry',
                        progress_percentage: 65.5,
                      },
                    ],
                  },
                },
              },
            },
          },
          400: {
            description: '400 — studentId is missing or not a valid integer',
            content: {
              'application/json': {
                example: { success: false, message: 'Valid studentId is required' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    {
      name: 'Teacher Analytics',
      description:
        'Course performance, student results, test metrics, live class data, and course leaderboards for teachers',
    },
  ],
};
