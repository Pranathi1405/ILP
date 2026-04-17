/**
 * src/config/swagger/modules/admin-analytics.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Admin Analytics module.
 *
 * Endpoints: platform dashboard, user growth, active users, top courses,
 *            completion stats, dropout rates, revenue trend, revenue by course,
 *            pending doubts, inactive instructors.
 */

export const adminAnalyticsSwagger = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {
    PlatformDashboard: {
      type: 'object',
      properties: {
        total_users: { type: 'integer', example: 5000 },
        active_users: { type: 'integer', example: 1200 },
        new_users_today: { type: 'integer', example: 35 },
        total_students: { type: 'integer', example: 4200 },
        total_teachers: { type: 'integer', example: 120 },
        total_courses: { type: 'integer', example: 45 },
        published_courses: { type: 'integer', example: 38 },
        total_enrollments: { type: 'integer', example: 8500 },
        new_enrollments_today: { type: 'integer', example: 22 },
        total_revenue_formatted: { type: 'string', example: '₹15,00,000.00' },
        revenue_today_formatted: { type: 'string', example: '₹8,500.00' },
        total_tests_taken: { type: 'integer', example: 22000 },
        total_live_classes: { type: 'integer', example: 650 },
        total_doubts: { type: 'integer', example: 3200 },
        resolved_doubts: { type: 'integer', example: 2800 },
        doubt_resolution_rate: { type: 'string', example: '87.5' },
        stat_date: { type: 'string', format: 'date', example: '2026-03-13' },
      },
    },

    RevenueTrend: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['30d', '12m', '3y', 'max'],
          example: '30d',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          example: ['2026-03-01', '2026-03-02'],
        },
        data: {
          type: 'array',
          items: { type: 'number' },
          example: [1200.5, 980.75],
        },
        total: {
          type: 'number',
          example: 2181.25,
        },
      },
    },
    PaymentMethodBreakdown: {
      type: 'object',
      properties: {
        labels: {
          type: 'array',
          items: { type: 'string' },
          example: ['card', 'upi', 'netbanking'],
        },
        data: {
          type: 'array',
          items: { type: 'number' },
          example: [15000, 22000, 8000],
        },
      },
    },

    PaymentStatusDistribution: {
      type: 'object',
      properties: {
        labels: {
          type: 'array',
          items: { type: 'string' },
          example: ['completed', 'pending', 'failed'],
        },
        data: {
          type: 'array',
          items: { type: 'integer' },
          example: [120, 15, 5],
        },
      },
    },

    RecentTransaction: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time', example: '2026-04-08T10:00:00Z' },
        studentName: { type: 'string', example: 'Arjun Reddy' },
        courseName: { type: 'string', example: 'JEE Mathematics' },
        amount: { type: 'number', example: 999 },
        paymentMethod: { type: 'string', example: 'upi' },
        status: { type: 'string', example: 'completed' },
      },
    },

    RevenueDashboard: {
      type: 'object',
      properties: {
        revenueTrend: { $ref: '#/components/schemas/RevenueTrend' },
        paymentMethodBreakdown: { $ref: '#/components/schemas/PaymentMethodBreakdown' },
        paymentStatusDistribution: { $ref: '#/components/schemas/PaymentStatusDistribution' },
        recentTransactions: {
          type: 'array',
          items: { $ref: '#/components/schemas/RecentTransaction' },
        },
      },
    },

    PendingDoubt: {
      type: 'object',
      properties: {
        doubt_id: { type: 'integer', example: 201 },
        title: { type: 'string', example: 'Confused about equilibrium constant' },
        status: { type: 'string', example: 'open' },
        course_title: { type: 'string', example: 'JEE Advanced Chemistry' },
        first_name: { type: 'string', example: 'Arjun' },
        last_name: { type: 'string', example: 'Mehta' },
        hours_pending: { type: 'integer', example: 30 },
        is_overdue: { type: 'boolean', example: true },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },

    InactiveInstructor: {
      type: 'object',
      properties: {
        teacher_id: { type: 'integer', example: 14 },
        first_name: { type: 'string', example: 'Vikram' },
        last_name: { type: 'string', example: 'Nair' },
        email: { type: 'string', example: 'vikram@ilp.com' },
        total_courses_created: { type: 'integer', example: 3 },
        total_students: { type: 'integer', example: 85 },
        last_class_date: { type: 'string', example: '2026-02-01 10:00:00' },
        days_since_last_class: { type: 'integer', example: 40 },
        risk_level: { type: 'string', enum: ['medium', 'high'], example: 'medium' },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {
    '/analytics/admin/dashboard': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get platform dashboard',
        description: [
          "Returns today's platform-wide snapshot.",
          '',
          '**Data source:** `platform_statistics` — most recent row.',
          '',
          'Includes total/active users, enrollments, revenue, tests taken, and doubt resolution rate.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Platform dashboard fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/PlatformDashboard' } },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Platform dashboard fetched successfully',
                  data: {
                    total_users: 5000,
                    active_users: 1200,
                    total_enrollments: 8500,
                    total_revenue_formatted: '₹15,00,000.00',
                    doubt_resolution_rate: '87.5',
                    stat_date: '2026-03-13',
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

    '/analytics/admin/user-growth': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get user growth trend',
        description: [
          'Returns new user registration trend data grouped by period.',
          '',
          '**Data source:** `platform_statistics`',
          '',
          '| range | Grouping | Days covered |',
          '|-------|----------|--------------|',
          '| `7d`  | by day   | last 7 days  |',
          '| `30d` | by day   | last 30 days |',
          '| `12m` | by month | last 365 days|',
        ].join('\n'),
        parameters: [
          {
            name: 'range',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['7d', '30d', '12m'], default: '7d' },
            example: '30d',
          },
        ],
        responses: {
          200: {
            description: 'User growth data fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'User growth data fetched successfully',
                  data: {
                    range: '30d',
                    total_new_users: 450,
                    data_points: [{ period: '2026-02-12', new_users: 12, total_users: 4600 }],
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

    '/analytics/admin/active-users': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get active user counts',
        description:
          'Returns daily active user counts for the last 7 days.\n\n**Data source:** `platform_statistics`',
        responses: {
          200: {
            description: 'Active users data fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Active users data fetched successfully',
                  data: {
                    latest_active_users: 1200,
                    data_points: [
                      { stat_date: '2026-03-13', active_users: 1200, total_users: 5000 },
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

    '/analytics/admin/top-courses': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get top 10 courses by enrollment',
        description:
          'Returns the 10 most enrolled courses with completion rate, rating, and revenue.\n\n**Data source:** `course_analytics`',
        responses: {
          200: {
            description: 'Top courses fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Top courses fetched successfully',
                  data: [
                    {
                      course_id: 5,
                      title: 'JEE Advanced Chemistry',
                      total_enrollments: 520,
                      average_completion_rate: '68.50',
                      average_rating: '4.2',
                      total_revenue_formatted: '₹1,56,000.00',
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

    '/analytics/admin/course-completion': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get course completion statistics',
        description:
          'Returns completion and dropout rates for every published course, sorted by completion rate descending.\n\n**Data source:** `course_analytics`',
        responses: {
          200: {
            description: 'Course completion stats fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Course completion stats fetched successfully',
                  data: [
                    {
                      course_id: 5,
                      title: 'JEE Advanced Chemistry',
                      total_enrollments: 520,
                      completed_students: 350,
                      completion_rate: '67.31',
                      dropout_rate: '8.08',
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

    '/analytics/admin/dropout-rate': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get dropout rate analysis',
        description:
          'Returns platform-average dropout rate and the top 10 high-dropout courses.\n\n**Data source:** `course_analytics`',
        responses: {
          200: {
            description: 'Dropout rate data fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Dropout rate data fetched successfully',
                  data: {
                    platform_average: {
                      average_dropout_rate: '9.50',
                      highest_dropout_rate: '22.00',
                      lowest_dropout_rate: '2.50',
                    },
                    top_dropout_courses: [
                      {
                        course_id: 8,
                        title: 'Advanced Calculus',
                        dropout_rate: '22.00',
                        total_enrollments: 200,
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

    '/analytics/admin/revenue-trend': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get revenue trend',
        description: [
          'Returns revenue trend data grouped by selected period.',
          '',
          '**Data source:** `payments` (real-time aggregation)',
          '',
          '**Query Params:**',
          '- `period`: `30d` | `12m` | `3y` | `max` (default: `30d`)',
        ].join('\n'),

        parameters: [
          {
            name: 'period',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['30d', '12m', '3y', 'max'],
              default: '30d',
            },
            example: '30d',
          },
        ],

        responses: {
          200: {
            description: 'Revenue trend fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/RevenueTrend' },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Revenue trend fetched successfully',
                  data: {
                    period: '30d',
                    labels: ['2026-03-01', '2026-03-02'],
                    data: [1200, 900],
                    total: 2100,
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
    '/analytics/admin/revenue-dashboard': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get revenue dashboard (aggregated)',
        description: [
          'Returns complete revenue dashboard data in a single API call.',
          '',
          '**Includes:**',
          '- Revenue trend',
          '- Payment method breakdown',
          '- Payment status distribution',
          '- Recent transactions',
          '',
          '**Data source:** `payments` (real-time aggregation)',
          '',
          '**Query Params:**',
          '- `period`: `30d` | `12m` | `3y` | `max` (default: `30d`)',
        ].join('\n'),

        parameters: [
          {
            name: 'period',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['30d', '12m', '3y', 'max'],
              default: '30d',
            },
            example: '12m',
          },
        ],

        responses: {
          200: {
            description: 'Revenue dashboard fetched successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/RevenueDashboard' },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Revenue dashboard fetched successfully',
                  data: {
                    revenueTrend: {
                      period: '30d',
                      labels: ['2026-03-01'],
                      data: [1200],
                      total: 1200,
                    },
                    paymentMethodBreakdown: {
                      labels: ['upi', 'card'],
                      data: [20000, 15000],
                    },
                    paymentStatusDistribution: {
                      labels: ['completed', 'pending'],
                      data: [120, 10],
                    },
                    recentTransactions: [
                      {
                        date: '2026-04-08T10:00:00Z',
                        studentName: 'Arjun Reddy',
                        courseName: 'JEE Maths',
                        amount: 999,
                        paymentMethod: 'upi',
                        status: 'completed',
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
    '/analytics/admin/revenue-by-course': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get revenue broken down by course',
        description:
          'Returns total revenue and revenue-per-student per course, sorted by revenue descending.\n\n**Data sources:** `revenue_analytics` + `course_analytics`',
        responses: {
          200: {
            description: 'Revenue by course fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Revenue by course fetched successfully',
                  data: [
                    {
                      course_id: 5,
                      title: 'JEE Advanced Chemistry',
                      total_enrollments: 520,
                      total_revenue_formatted: '₹1,56,000.00',
                      revenue_per_student_formatted: '₹300.00',
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

    '/analytics/admin/pending-doubts': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get pending (unresolved) doubts',
        description: [
          'Returns all open doubts with urgency classification.',
          '',
          "**Data source:** `doubt_posts` where status = 'open'",
          '',
          '**Urgency Logic:**',
          '- `high` → overdue OR deadline ≤ 6h',
          '- `medium` → deadline ≤ 24h',
          '- `low` → deadline > 24h',
          '- fallback (no deadline): based on hours_pending',
        ].join('\n'),

        responses: {
          200: {
            description: 'Pending doubts fetched successfully',
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
                            summary: {
                              type: 'object',
                              properties: {
                                total_pending: { type: 'integer', example: 12 },
                                overdue_count: { type: 'integer', example: 5 },
                                due_soon_24h: { type: 'integer', example: 3 },
                              },
                            },
                            doubts: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/PendingDoubt' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },

                example: {
                  success: true,
                  message: 'Pending doubts fetched successfully',
                  data: {
                    summary: {
                      total_pending: 12,
                      overdue_count: 5,
                      due_soon_24h: 3,
                    },
                    doubts: [
                      {
                        doubt_id: 201,
                        question_text: 'What is the value of x^2?',
                        course_title: 'JEE Mathematics',
                        first_name: 'Arjun',
                        last_name: 'Reddy',
                        subject_id: 261,
                        assigned_teacher_id: 3,
                        created_at: '2026-04-02T04:06:15Z',
                        deadline_at: '2026-04-03T04:06:16Z',
                        hours_pending: 30,
                        hours_to_deadline: -2,
                        is_overdue: true,
                        urgency: 'high',
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
    '/analytics/admin/inactive-instructors': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get inactive instructors',
        description: [
          'Returns teachers who have not conducted any live class in the last 30 days.',
          '',
          '**Derived from:** `live_classes` + `teacher_analytics`',
          '',
          '**Risk levels:** `high` = never conducted OR > 60 days | `medium` = 30–60 days',
          '',
          '`last_class_date = "Never"` means the teacher has never conducted a class.',
        ].join('\n'),
        responses: {
          200: {
            description: 'Inactive instructors fetched successfully',
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
                          items: { $ref: '#/components/schemas/InactiveInstructor' },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: 'Inactive instructors fetched successfully',
                  data: [
                    {
                      teacher_id: 14,
                      first_name: 'Vikram',
                      last_name: 'Nair',
                      email: 'vikram@ilp.com',
                      last_class_date: '2026-02-01 10:00:00',
                      days_since_last_class: 40,
                      risk_level: 'medium',
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
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    {
      name: 'Admin Analytics',
      description:
        'Platform-wide stats, revenue, dropout analysis, and inactive instructor detection',
    },
  ],
};
