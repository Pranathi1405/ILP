/**
 * src/config/swagger/modules/student-analytics.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Student Analytics module.
 *
 * Endpoints: overview, course progress, subject analytics,
 *            test performance, leaderboard, topic mastery,
 *            score trend, course rank comparison.
 */

export const studentAnalyticsSwagger = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    StudentOverview: {
      type: 'object',
      properties: {
        enrolled_courses:         { type: 'integer', example: 3 },
        completed_courses:        { type: 'integer', example: 1 },
        in_progress_courses:      { type: 'integer', example: 2 },
        total_watch_time_minutes: { type: 'integer', example: 200 },
        tests_attempted:          { type: 'integer', example: 10 },
        tests_passed:             { type: 'integer', example: 8 },
        average_test_score:       { type: 'number',  example: 72.5 },
        current_streak_days:      { type: 'integer', example: 5 },
        longest_streak_days:      { type: 'integer', example: 12 },
        total_points:             { type: 'integer', example: 340 },
        current_rank:             { type: 'integer', nullable: true, example: 42 },
        last_activity_date:       { type: 'string',  format: 'date-time', nullable: true },
        // ── Derived fields ──────────────────────────────────
        watch_time_formatted: { type: 'string', example: '3h 20m' },
        pass_rate:            { type: 'string', example: '80.0' },
        // ── Score improvement (pre-computed by worker) ───────
        scoreImprovement: { $ref: '#/components/schemas/ScoreImprovement' },
      },
    },

    ScoreImprovement: {
      type: 'object',
      description: 'Pre-computed score improvement metrics based on last 6 tests. All values are null when the student has fewer than 3 submitted tests.',
      properties: {
        last3Avg: {
          type: 'number',
          nullable: true,
          example: 78.33,
          description: 'Average score across the 3 most recent tests',
        },
        previous3Avg: {
          type: 'number',
          nullable: true,
          example: 65.0,
          description: 'Average score across tests 4–6 (the batch before)',
        },
        changePercentage: {
          type: 'number',
          nullable: true,
          example: 20.51,
          description: '((last3Avg - previous3Avg) / previous3Avg) × 100',
        },
        trend: {
          type: 'string',
          nullable: true,
          enum: ['improving', 'declining', 'stable', null],
          example: 'improving',
        },
      },
    },

    // ── NEW: per-attempt trend entry ────────────────────────
    ScoreTrendAttempt: {
      type: 'object',
      description: 'One test attempt in the score trend series.',
      properties: {
        attempt_id:      { type: 'integer', example: 88 },
        test_name:       { type: 'string',  example: 'JEE Chemistry Mock – 3' },
        score:           { type: 'number',  example: 76 },
        max_score:       { type: 'integer', example: 100 },
        score_percent:   {
          type: 'number',
          example: 76.0,
          description: '(score / max_score) × 100, rounded to 1 decimal',
        },
        attempted_at:    { type: 'string',  format: 'date-time', example: '2026-03-10T14:00:00Z' },
        score_diff: {
          type: 'number',
          nullable: true,
          example: 8,
          description: 'Score change vs the immediately previous attempt. null for the very first attempt.',
        },
        trend_direction: {
          type: 'string',
          enum: ['increase', 'decrease', 'stable'],
          example: 'increase',
        },
      },
    },

    // ── NEW: course rank ────────────────────────────────────
    CourseRankInfo: {
      type: 'object',
      description: "Student's rank data within a specific course.",
      properties: {
        rank_in_course:          { type: 'integer', example: 5 },
        total_score:             { type: 'number',  example: 88.5 },
        completion_percentage:   { type: 'number',  example: 72.0 },
        average_test_score:      { type: 'number',  example: 74.0 },
        total_students:          { type: 'integer', example: 120 },
        percentile: {
          type: 'number',
          example: 96.7,
          description: 'Percentile rank (higher = better). (1 − (rank−1) / (total−1)) × 100',
        },
      },
    },

    // ── NEW: rank comparison ────────────────────────────────
    CourseRankComparison: {
      type: 'object',
      description: "Student's rank compared to class average and top performer.",
      properties: {
        my_rank:           { type: 'integer', example: 5 },
        my_avg_score:      { type: 'number',  example: 74.0 },
        my_completion:     { type: 'number',  example: 72.0 },
        avg_rank:          { type: 'number',  example: 60.5 },
        avg_score_class:   { type: 'number',  example: 58.2 },
        avg_completion_class: { type: 'number', example: 55.8 },
        total_students:    { type: 'integer', example: 120 },
        top_rank:          { type: 'integer', example: 1 },
        top_avg_score:     { type: 'number',  example: 97.5 },
        top_completion:    { type: 'number',  example: 100.0 },
        top_first_name:    { type: 'string',  example: 'Riya' },
        top_last_name:     { type: 'string',  example: 'Sharma' },
      },
    },

    CourseProgress: {
      type: 'object',
      properties: {
        course_id:                 { type: 'integer', example: 5 },
        course_title:              { type: 'string',  example: 'JEE Advanced Chemistry' },
        thumbnail_url:             { type: 'string',  nullable: true },
        total_modules:             { type: 'integer', example: 12 },
        completed_modules:         { type: 'integer', example: 7 },
        total_videos:              { type: 'integer', example: 48 },
        completed_videos:          { type: 'integer', example: 30 },
        total_tests:               { type: 'integer', example: 6 },
        completed_tests:           { type: 'integer', example: 4 },
        progress_percentage:       { type: 'number',  example: 65.5 },
        average_test_score:        { type: 'number',  example: 68.0 },
        total_watch_time_minutes:  { type: 'integer', example: 150 },
        estimated_completion_date: { type: 'string',  format: 'date', nullable: true },
        last_accessed_at:          { type: 'string',  format: 'date-time', nullable: true },
        status: {
          type: 'string',
          enum: ['Not Started', 'In Progress', 'Completed'],
          example: 'In Progress',
        },
      },
    },

    SubjectAnalytics: {
      type: 'object',
      properties: {
        subject_id:    { type: 'integer', example: 3 },
        subject_title: { type: 'string',  example: 'Organic Chemistry' },
        total_topics:  { type: 'integer', example: 20 },
        avg_score:     { type: 'string',  example: '68.50' },
        tests_attempted: { type: 'integer', example: 15 },
        correct_answers: { type: 'integer', example: 90 },
        wrong_answers:   { type: 'integer', example: 30 },
        mastery_summary: {
          type: 'object',
          properties: {
            strong_count:  { type: 'integer', example: 8 },
            average_count: { type: 'integer', example: 9 },
            weak_count:    { type: 'integer', example: 3 },
            total_topics:  { type: 'integer', example: 20 },
            strong_percent: { type: 'string', example: '40.0' },
          },
        },
      },
    },

   StudentTestPerformance: {
  type: 'object',
  properties: {
    test_analytics_id: { type: 'integer' },
    subject_id: { type: 'integer' },
    subject_title: { type: 'string' },
    test_type: { type: 'string', enum: ['custom', 'sme'] },

    total_tests: { type: 'integer' },
    completed_tests: { type: 'integer' },

    average_score: { type: 'string', example: '75.50' },
    highest_score: { type: 'string', example: '95.00' },
    lowest_score: { type: 'string', example: '40.00' },

    total_marks_available: { type: 'integer' },
    total_time_taken_minutes: { type: 'integer' },

    // 🔥 NEW
    total_questions: { type: 'integer' },
    attempted_questions: { type: 'integer' },
    correct_answers: { type: 'integer' },
    accuracy_percentage: { type: 'string', example: '82.35' },

    partial_answers: { type: 'integer' },
    unanswered_questions: { type: 'integer' },

    avg_time_per_question: { type: 'string', example: '1.25' },

    improvement_trend: { type: 'number', example: 5.2 },
    trend_label: { type: 'string', enum: ['improving', 'declining', 'stable'] },

    strong_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'integer' },
          accuracy: { type: 'number' }
        }
      }
    },

    weak_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicId: { type: 'integer' },
          accuracy: { type: 'number' }
        }
      }
    },

    score_variance: { type: 'string', example: '25.30' },

    last_test_score: { type: 'number', nullable: true },
    last_test_accuracy: { type: 'number', nullable: true },
    last_attempted_at: { type: 'string', format: 'date-time', nullable: true },

    // 🔥 Derived fields
    completion_rate: { type: 'number', example: 85.5 },
    engagement_level: { type: 'string', enum: ['full', 'partial', 'low'] },

    updated_at: { type: 'string', format: 'date-time' }
  }
},
    TopicMastery: {
      type: 'object',
      properties: {
        module_id:    { type: 'integer', example: 12 },
        topic_name: {
          type: 'string',
          example: 'Alkenes & Alkynes',
          description: 'Resolved from subject_modules.module_name via JOIN',
        },
        subject_id:    { type: 'integer', example: 3 },
        subject_title: { type: 'string',  example: 'Organic Chemistry' },
        course_id:     { type: 'integer', example: 5 },
        tests_attempted: { type: 'integer', example: 4 },
        correct_answers: { type: 'integer', example: 14 },
        wrong_answers:   { type: 'integer', example: 6 },
        avg_score:       { type: 'number',  example: 70.0 },
        mastery_level: {
          type: 'string',
          enum: ['WEAK', 'AVERAGE', 'STRONG'],
          example: 'AVERAGE',
          description: 'Normalised from DB enum (low/medium/high) by the service layer',
        },
        last_attempted_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },

    LeaderboardEntry: {
      type: 'object',
      properties: {
        rank_position:       { type: 'integer', example: 1 },
        first_name:          { type: 'string',  example: 'Riya' },
        last_name:           { type: 'string',  example: 'Sharma' },
        profile_picture_url: { type: 'string',  nullable: true },
        points_earned:       { type: 'integer', example: 1500 },
        courses_completed:   { type: 'integer', example: 3 },
        tests_completed:     { type: 'integer', example: 20 },
        average_score:       { type: 'number',  example: 88.5 },
        is_current_student:  { type: 'boolean', example: false },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    '/analytics/student/overview': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student overview dashboard',
        description: [
          'Returns aggregated metrics for the logged-in student.',
          '',
          '**Data source:** `student_dashboard_analytics`',
          '',
          'Includes: enrolled/completed courses, test scores, streak days, rank,',
          'formatted watch time, and pre-computed score improvement metrics.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Student overview fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/StudentOverview' } } },
                  ],
                },
                example: {
                  success: true,
                  message: 'Student overview fetched successfully',
                  data: {
                    enrolled_courses:    3,
                    completed_courses:   1,
                    in_progress_courses: 2,
                    tests_attempted:     10,
                    tests_passed:        8,
                    average_test_score:  72.5,
                    current_streak_days: 5,
                    total_points:        340,
                    current_rank:        42,
                    watch_time_formatted:'3h 20m',
                    pass_rate:           '80.0',
                    scoreImprovement: {
                      last3Avg:         78.33,
                      previous3Avg:     65.0,
                      changePercentage: 20.51,
                      trend:            'improving',
                    },
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

    '/analytics/student/courses': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student course progress',
        description: [
          'Returns progress data for all enrolled courses.',
          '',
          '**Data source:** `course_progress_analytics`',
          '',
          'Each entry includes module/video/test counts and an auto-derived status label.',
          'Sorted by last accessed date descending.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Course progress fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/CourseProgress' } } } },
                  ],
                },
                example: {
                  success: true,
                  message: 'Course progress fetched successfully',
                  data: [
                    { course_id: 5, course_title: 'JEE Advanced Chemistry', total_modules: 12, completed_modules: 7, progress_percentage: 65.5, status: 'In Progress' },
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

    '/analytics/student/subjects': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student subject analytics for a course',
        description: [
          'Returns subject-level performance aggregated from topic mastery data.',
          '',
          '**Data source:** `topic_mastery_analytics` grouped by subject.',
          '',
          '⚠️ `courseId` query parameter is **required**.',
        ].join('\n'),
        parameters: [
          {
            name: 'courseId',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 5 },
            description: 'ID of the course to fetch subject analytics for',
          },
        ],
        responses: {
          200: {
            description: 'Subject analytics fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/SubjectAnalytics' } } } },
                  ],
                },
                example: {
                  success: true,
                  message: 'Subject analytics fetched successfully',
                  data: [
                    { subject_id: 3, subject_title: 'Organic Chemistry', total_topics: 20, avg_score: '68.50', mastery_summary: { strong_count: 8, average_count: 9, weak_count: 3, strong_percent: '40.0' } },
                  ],
                },
              },
            },
          },
          400: {
            description: '400 — courseId query param is missing',
            content: { 'application/json': { example: { success: false, message: 'courseId query parameter is required' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/student/tests': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student test performance',
        description: [
          'Returns test scores, highest/lowest scores, strong/weak topic IDs, and trend direction per subject.',
          '',
          '**Data source:** `test_performance_analytics`',
          '',
          '`trend_label` values: `improving` (improvement_trend > 0) | `declining` (< 0) | `stable` (= 0).',
        ].join('\n'),
        responses: {
          200: {
            description: 'Test performance fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/TestPerformance' } } } },
                  ],
                },
                example: {
                  success: true,
                  message: 'Test performance fetched successfully',
                  data: [
                    { subject_title: 'Physics', test_type: 'custom', average_score: '74.20', highest_score: 92.0, lowest_score: 55.0, strong_topics: [12, 15], weak_topics: [7], trend_label: 'improving' },
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

    '/analytics/student/leaderboard': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get global leaderboard',
        description: [
          "Returns the top 50 students by points and the logged-in student's own rank entry.",
          '',
          '**Data source:** `leaderboard` (all_time period)',
          '',
          "The student's own entry is flagged with `is_current_student: true`.",
          'If the student is outside the top 50, their entry is returned separately in `student_rank`.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Leaderboard fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Leaderboard fetched successfully',
                  data: {
                    student_rank: { rank_position: 42, points_earned: 340, average_score: 72.5 },
                    leaderboard_list: [
                      { rank_position: 1,  first_name: 'Riya',  last_name: 'Sharma', points_earned: 1500, is_current_student: false },
                      { rank_position: 42, first_name: 'Arjun', last_name: 'Mehta',  points_earned: 340,  is_current_student: true  },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    '/analytics/student/topic-mastery': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student topic mastery breakdown',
        description: [
          'Returns all topics grouped by mastery level with resolved topic names.',
          '',
          '**Data sources:** `topic_mastery_analytics` JOIN `subject_modules` (for topic names)',
          '',
          '**Mastery thresholds (DB → display label):**',
          '| DB value | Display | Score range |',
          '|---|---|---|',
          '| `high`   | STRONG  | ≥ 75        |',
          '| `medium` | AVERAGE | 40 – 74     |',
          '| `low`    | WEAK    | < 40        |',
        ].join('\n'),
        responses: {
          200: {
            description: 'Topic mastery fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Topic mastery fetched successfully',
                  data: {
                    total_topics: 30,
                    grouped: {
                      STRONG:  [{ module_id: 12, topic_name: 'Alkenes & Alkynes', avg_score: 88, mastery_level: 'STRONG' }],
                      AVERAGE: [{ module_id: 7,  topic_name: 'Thermodynamics',    avg_score: 60, mastery_level: 'AVERAGE' }],
                      WEAK:    [{ module_id: 3,  topic_name: 'Electrochemistry',  avg_score: 28, mastery_level: 'WEAK' }],
                    },
                    all_topics: [
                      { module_id: 12, topic_name: 'Alkenes & Alkynes', subject_title: 'Organic Chemistry', avg_score: 88, mastery_level: 'STRONG' },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── NEW ────────────────────────────────────────────────────
    '/analytics/student/score-trend': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get score improvement trend',
        description: [
          'Returns recent test attempts in **chronological order** with per-attempt',
          'score difference and trend direction — suitable for rendering a line/bar chart.',
          '',
          '**Data sources:** `test_attempts` JOIN `tests`',
          '',
          '`score_diff` is `null` for the very first attempt (no previous value).',
          '`trend_direction` is computed with a SQL window function (`LAG`).',
          '',
          'Only `submitted` attempts are included.',
        ].join('\n'),
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, example: 10 },
            description: 'Number of most-recent attempts to return (default: 10)',
          },
        ],
        responses: {
          200: {
            description: 'Score trend fetched successfully',
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
                            attempts: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/ScoreTrendAttempt' },
                            },
                            total_attempts: { type: 'integer', example: 8 },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Score trend fetched successfully',
                  data: {
                    total_attempts: 3,
                    attempts: [
                      { attempt_id: 81, test_name: 'JEE Chemistry Mock – 1', score: 60, max_score: 100, score_percent: 60.0, attempted_at: '2026-03-01T10:00:00Z', score_diff: null,  trend_direction: 'stable' },
                      { attempt_id: 85, test_name: 'JEE Chemistry Mock – 2', score: 68, max_score: 100, score_percent: 68.0, attempted_at: '2026-03-05T11:00:00Z', score_diff: 8,     trend_direction: 'increase' },
                      { attempt_id: 88, test_name: 'JEE Chemistry Mock – 3', score: 76, max_score: 100, score_percent: 76.0, attempted_at: '2026-03-10T14:00:00Z', score_diff: 8,     trend_direction: 'increase' },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },

    // ── NEW ────────────────────────────────────────────────────
    '/analytics/student/course-rank': {
      get: {
        tags: ['Student Analytics'],
        summary: 'Get student rank within a course',
        description: [
          "Returns the student's rank inside a specific course leaderboard,",
          'plus a comparison against the class average and the top performer.',
          '',
          '**Data source:** `course_leaderboard`',
          '',
          '`percentile` = (1 − (rank − 1) / (total_students − 1)) × 100.',
          'A student ranked 1st has percentile 100.',
          '',
          '⚠️ `courseId` query parameter is **required**.',
        ].join('\n'),
        parameters: [
          {
            name: 'courseId',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 5 },
            description: 'ID of the course to fetch rank data for',
          },
        ],
        responses: {
          200: {
            description: 'Course rank fetched successfully',
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
                            my_rank:    { $ref: '#/components/schemas/CourseRankInfo' },
                            comparison: { $ref: '#/components/schemas/CourseRankComparison' },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Course rank fetched successfully',
                  data: {
                    my_rank: {
                      rank_in_course:        5,
                      total_score:           88.5,
                      completion_percentage: 72.0,
                      average_test_score:    74.0,
                      total_students:        120,
                      percentile:            96.7,
                    },
                    comparison: {
                      my_rank:              5,
                      my_avg_score:         74.0,
                      my_completion:        72.0,
                      avg_rank:             60.5,
                      avg_score_class:      58.2,
                      avg_completion_class: 55.8,
                      total_students:       120,
                      top_rank:             1,
                      top_avg_score:        97.5,
                      top_completion:       100.0,
                      top_first_name:       'Riya',
                      top_last_name:        'Sharma',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: '400 — courseId is missing or not a valid integer',
            content: { 'application/json': { example: { success: false, message: 'courseId query parameter is required and must be a valid integer' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
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
      name: 'Student Analytics',
      description: 'Dashboard, course progress, test scores, leaderboard, topic mastery, score trend, and course rank comparison for students',
    },
  ],
};