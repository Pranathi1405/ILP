/**
 * Authors: Harshitha Ravuri,
 * src/config/swagger/modules/parent-analytics.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Parent Analytics module.
 *
 * Covers one tag group:
 *   - Parent Analytics  (list linked students, view per-student dashboard
 *                        with test analytics, score trend, and topic mastery)
 */

export const parentAnalyticsSwagger = {

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    /**
     * LinkedStudent
     * One entry in GET /analytics/parent/students.
     */
    LinkedStudent: {
      type: 'object',
      properties: {
        student_id: {
          type: 'integer',
          example: 101,
          description: 'Pass this as ?studentId= in the dashboard endpoint',
        },
        first_name:           { type: 'string',  example: 'Arjun' },
        last_name:            { type: 'string',  example: 'Mehta' },
        profile_picture_url:  { type: 'string',  nullable: true, example: 'https://cdn.ilp.com/avatars/101.jpg' },
        email:                { type: 'string',  example: 'arjun@ilp.com' },
        relationship_type: {
          type: 'string',
          enum: ['father', 'mother', 'guardian', 'other'],
          example: 'father',
        },
        is_primary: {
          type: 'boolean',
          example: true,
          description: 'If true, this child is auto-selected when ?studentId is omitted',
        },
        // Quick-summary fields from student_dashboard_analytics
        enrolled_courses:     { type: 'integer', nullable: true, example: 3 },
        average_test_score:   { type: 'number',  nullable: true, example: 72.5 },
        current_rank:         { type: 'integer', nullable: true, example: 42 },
        last_activity_date:   { type: 'string',  format: 'date-time', nullable: true, example: '2026-03-15T18:30:00Z' },
        watch_time_formatted: { type: 'string',  nullable: true, example: '3h 20m' },
      },
    },

    /**
     * ParentDashboardAnalytics
     * Pre-computed metrics block from parent_dashboard_analytics.
     */
    ParentDashboardAnalytics: {
      type: 'object',
      properties: {
        total_courses_enrolled: {
          type: 'integer',
          example: 3,
        },
        courses_in_progress:  { type: 'integer', example: 2 },
        courses_completed:    { type: 'integer', example: 1 },
        average_course_progress: {
          type: 'number',
          example: 65.5,
          description: 'Average % progress across all enrolled courses',
        },
        total_tests_attempted:    { type: 'integer', example: 12 },
        average_test_score: {
          type: 'number',
          example: 72.5,
          description: 'Average score across all attempted tests (0–100), rounded to 1 decimal',
        },
        total_study_time_minutes: { type: 'integer', example: 320 },
        study_time_formatted: {
          type: 'string',
          example: '5h 20m',
          description: 'Human-readable watch time — derived by the service layer',
        },
        attendance_rate: {
          type: 'number',
          example: 87.5,
          description: 'Live class attendance % = (attended / total scheduled) × 100',
        },
        current_rank: {
          type: 'integer',
          nullable: true,
          example: 42,
          description: 'All-time leaderboard rank. null if not yet ranked.',
        },
        last_active_date:  { type: 'string', format: 'date-time', nullable: true, example: '2026-03-15T18:30:00Z' },
        performance_trend: {
          type: 'string',
          enum: ['improving', 'stable', 'declining'],
          example: 'improving',
        },
        updated_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2026-03-16T02:00:00Z',
          description: 'Timestamp of last upsert by worker / cron',
        },
        _is_default: {
          type: 'boolean',
          example: false,
          description: 'true = no analytics row exists yet. All values are 0/null. Recheck after 2 AM cron.',
        },
      },
    },

    /**
     * ParentTestAnalytics
     * Aggregated test summary derived from test_performance_analytics.
     */
    ParentTestAnalytics: {
      type: 'object',
      description: 'Full test analytics for the student, derived at request time from test_performance_analytics.',
      properties: {
        total_tests:   { type: 'integer', example: 12 },
        avg_score:     { type: 'number',  example: 72.5 },
        highest_score: { type: 'number',  example: 95.0 },
        weakest_subject: {
          type: 'object',
          nullable: true,
          description: 'The subject with the lowest average test score.',
          properties: {
            subject_id:    { type: 'integer', example: 7 },
            subject_title: { type: 'string',  example: 'Electrochemistry' },
            avg_score:     { type: 'string',  example: '38.5' },
          },
        },
      },
    },

    /**
     * ParentScoreTrend
     * Wrapper for the score trend series shown in the parent dashboard.
     */
    ParentScoreTrend: {
      type: 'object',
      properties: {
        total_attempts: { type: 'integer', example: 8 },
        attempts: {
          type: 'array',
          description: 'Test attempts in chronological order.',
          items: {
            type: 'object',
            properties: {
              attempt_id:      { type: 'integer', example: 88 },
              test_name:       { type: 'string',  example: 'JEE Chemistry Mock – 3' },
              score:           { type: 'number',  example: 76 },
              max_score:       { type: 'integer', example: 100 },
              score_percent:   { type: 'number',  example: 76.0 },
              attempted_at:    { type: 'string',  format: 'date-time', example: '2026-03-10T14:00:00Z' },
              score_diff: {
                type: 'number',
                nullable: true,
                example: 8,
                description: 'Score change vs the immediately previous attempt. null for the first attempt.',
              },
              trend_direction: {
                type: 'string',
                enum: ['increase', 'decrease', 'stable'],
                example: 'increase',
              },
            },
          },
        },
      },
    },

    /**
     * ParentTopicMastery
     * Topic mastery with resolved names, grouped and listed.
     */
    ParentTopicMastery: {
      type: 'object',
      properties: {
        total_topics: { type: 'integer', example: 30 },
        grouped: {
          type: 'object',
          properties: {
            STRONG:  { type: 'array', items: { $ref: '#/components/schemas/TopicMasteryItem' } },
            AVERAGE: { type: 'array', items: { $ref: '#/components/schemas/TopicMasteryItem' } },
            WEAK:    { type: 'array', items: { $ref: '#/components/schemas/TopicMasteryItem' } },
          },
        },
        all_topics: {
          type: 'array',
          items: { $ref: '#/components/schemas/TopicMasteryItem' },
        },
      },
    },

    /**
     * TopicMasteryItem
     * A single topic mastery row with resolved name.
     */
    TopicMasteryItem: {
      type: 'object',
      properties: {
        module_id:    { type: 'integer', example: 12 },
        topic_name: {
          type: 'string',
          example: 'Alkenes & Alkynes',
          description: 'Resolved from subject_modules.module_name',
        },
        subject_id:    { type: 'integer', example: 3 },
        subject_title: { type: 'string',  example: 'Organic Chemistry' },
        course_id:     { type: 'integer', example: 5 },
        tests_attempted: { type: 'integer', example: 4 },
        correct_answers: { type: 'integer', example: 14 },
        wrong_answers:   { type: 'integer', example: 6 },
        avg_score: {
          type: 'string',
          example: '88.00',
          description: 'Rounded to 2 decimals by the service layer',
        },
        mastery_level: {
          type: 'string',
          enum: ['STRONG', 'AVERAGE', 'WEAK'],
          example: 'STRONG',
          description: 'Normalised from DB enum (high/medium/low) by service layer',
        },
        last_attempted_at: { type: 'string', format: 'date-time', nullable: true },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    '/analytics/parent/students': {
      get: {
        tags: ['Parent Analytics'],
        summary: 'Get all students linked to the parent',
        description: [
          'Returns all students mapped to the authenticated parent.',
          '',
          '**Data sources:** `parent_student_relationship` + `student_dashboard_analytics`',
          '',
          'Each entry includes a quick-summary card (rank, avg score, last active,',
          'watch time) so the parent can identify which child to view in detail.',
          '',
          'Sorted by: primary child first, then alphabetically by first name.',
          '',
          'Use the returned `student_id` as `?studentId=` in',
          '`GET /analytics/parent/dashboard`.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Linked students fetched successfully',
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
                            students: { type: 'array', items: { $ref: '#/components/schemas/LinkedStudent' } },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Linked students fetched successfully',
                  data: {
                    students: [
                      {
                        student_id: 101, first_name: 'Arjun', last_name: 'Mehta',
                        profile_picture_url: null, email: 'arjun@ilp.com',
                        relationship_type: 'father', is_primary: true,
                        enrolled_courses: 3, average_test_score: 72.5,
                        current_rank: 42, last_activity_date: '2026-03-15T18:30:00Z',
                        watch_time_formatted: '3h 20m',
                      },
                      {
                        student_id: 102, first_name: 'Priya', last_name: 'Mehta',
                        profile_picture_url: null, email: 'priya@ilp.com',
                        relationship_type: 'father', is_primary: false,
                        enrolled_courses: 2, average_test_score: 85.0,
                        current_rank: 18, last_activity_date: '2026-03-16T09:00:00Z',
                        watch_time_formatted: '5h 10m',
                      },
                    ],
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

    '/analytics/parent/dashboard': {
      get: {
        tags: ['Parent Analytics'],
        summary: 'Get analytics dashboard for a linked student',
        description: [
          'Returns pre-computed core analytics **plus** live-derived deep analytics',
          'for one student linked to the parent.',
          '',
          '### Response sections',
          '| Field | Source | Notes |',
          '|---|---|---|',
          '| `analytics` | `parent_dashboard_analytics` | Pre-computed by worker/cron |',
          '| `test_analytics` | `test_performance_analytics` | Aggregated at request time |',
          '| `score_trend` | `test_attempts` | Per-attempt series, chronological |',
          '| `topic_mastery` | `topic_mastery_analytics` JOIN `subject_modules` | With topic names |',
          '',
          '### `studentId` resolution order',
          '| Scenario | Behaviour |',
          '|---|---|',
          '| `?studentId=N` provided | Use it — 403 if not linked to this parent |',
          '| Parent has exactly 1 child | Auto-select that child |',
          '| `is_primary = 1` is set | Auto-select primary child |',
          '| Multiple children, no primary | **400** — studentId required |',
          '| No linked children at all | **404** |',
          '',
          '### Eventual consistency',
          '`analytics._is_default: true` means the analytics row does not exist yet.',
          'All metrics will be 0 / null until the nightly cron runs (2 AM) or',
          'an activity event triggers the queue worker.',
        ].join('\n'),
        parameters: [
          {
            name: 'studentId',
            in: 'query',
            required: false,
            schema: { type: 'integer', example: 101 },
            description: 'student_id of the child to view. Required when the parent has multiple children.',
          },
        ],
        responses: {
          200: {
            description: 'Parent dashboard fetched successfully',
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
                            student_id:     { type: 'integer', example: 101 },
                            analytics:      { $ref: '#/components/schemas/ParentDashboardAnalytics' },
                            test_analytics: { $ref: '#/components/schemas/ParentTestAnalytics' },
                            score_trend:    { $ref: '#/components/schemas/ParentScoreTrend' },
                            topic_mastery:  { $ref: '#/components/schemas/ParentTopicMastery' },
                          },
                        },
                      },
                    },
                  ],
                },
                examples: {
                  with_data: {
                    summary: 'Full analytics available',
                    value: {
                      success: true,
                      message: 'Parent dashboard fetched successfully',
                      data: {
                        student_id: 101,
                        analytics: {
                          total_courses_enrolled:   3,
                          courses_in_progress:      2,
                          courses_completed:        1,
                          average_course_progress:  65.5,
                          total_tests_attempted:    12,
                          average_test_score:       72.5,
                          total_study_time_minutes: 320,
                          study_time_formatted:     '5h 20m',
                          attendance_rate:          87.5,
                          current_rank:             42,
                          last_active_date:         '2026-03-15T18:30:00Z',
                          performance_trend:        'improving',
                          updated_at:               '2026-03-16T02:00:00Z',
                          _is_default:              false,
                        },
                        test_analytics: {
                          total_tests:     12,
                          avg_score:       72.5,
                          highest_score:   95.0,
                          weakest_subject: { subject_id: 7, subject_title: 'Electrochemistry', avg_score: '38.5' },
                        },
                        score_trend: {
                          total_attempts: 3,
                          attempts: [
                            { attempt_id: 81, test_name: 'Chemistry Mock – 1', score: 60, max_score: 100, score_percent: 60.0, attempted_at: '2026-03-01T10:00:00Z', score_diff: null, trend_direction: 'stable' },
                            { attempt_id: 85, test_name: 'Chemistry Mock – 2', score: 68, max_score: 100, score_percent: 68.0, attempted_at: '2026-03-05T11:00:00Z', score_diff: 8,    trend_direction: 'increase' },
                            { attempt_id: 88, test_name: 'Chemistry Mock – 3', score: 76, max_score: 100, score_percent: 76.0, attempted_at: '2026-03-10T14:00:00Z', score_diff: 8,    trend_direction: 'increase' },
                          ],
                        },
                        topic_mastery: {
                          total_topics: 30,
                          grouped: {
                            STRONG:  [{ module_id: 12, topic_name: 'Alkenes & Alkynes', avg_score: '88.00', mastery_level: 'STRONG' }],
                            AVERAGE: [{ module_id: 7,  topic_name: 'Thermodynamics',    avg_score: '60.00', mastery_level: 'AVERAGE' }],
                            WEAK:    [{ module_id: 3,  topic_name: 'Electrochemistry',  avg_score: '28.00', mastery_level: 'WEAK' }],
                          },
                          all_topics: [
                            { module_id: 12, topic_name: 'Alkenes & Alkynes', subject_title: 'Organic Chemistry', avg_score: '88.00', mastery_level: 'STRONG' },
                          ],
                        },
                      },
                    },
                  },
                  no_data_yet: {
                    summary: 'Not yet computed (_is_default: true)',
                    value: {
                      success: true,
                      message: 'Parent dashboard fetched successfully',
                      data: {
                        student_id: 101,
                        analytics: {
                          total_courses_enrolled:   0,
                          courses_in_progress:      0,
                          courses_completed:        0,
                          average_course_progress:  0,
                          total_tests_attempted:    0,
                          average_test_score:       0,
                          total_study_time_minutes: 0,
                          study_time_formatted:     '0m',
                          attendance_rate:          0,
                          current_rank:             null,
                          last_active_date:         null,
                          performance_trend:        'stable',
                          updated_at:               null,
                          _is_default:              true,
                        },
                        test_analytics: { total_tests: 0, avg_score: 0, highest_score: 0, weakest_subject: null },
                        score_trend:    { total_attempts: 0, attempts: [] },
                        topic_mastery:  { total_topics: 0, grouped: { STRONG: [], AVERAGE: [], WEAK: [] }, all_topics: [] },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: '400 — studentId required (multiple children, none is primary)',
            content: {
              'application/json': {
                example: { success: false, message: 'This account has multiple students. Please provide studentId as a query parameter.' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: '403 — Student is not linked to this parent',
            content: {
              'application/json': {
                example: { success: false, message: "You are not authorized to view this student's analytics" },
              },
            },
          },
          404: {
            description: '404 — No students linked to this parent account',
            content: {
              'application/json': {
                example: { success: false, message: 'No students linked to this parent account' },
              },
            },
          },
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
      name: 'Parent Analytics',
      description: 'Read-only analytics dashboard for parents — view linked students and their full performance including test analytics, score trend, and topic mastery.',
    },
  ],

};