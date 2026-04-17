/**
 * src/config/swagger/modules/notifications.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Notifications module.
 *
 * Covers four tag groups:
 *   - User Notifications       (fetch, read, delete own notifications)
 *   - Notification Preferences (per-type channel toggles)
 *   - Teacher Notifications    (send/schedule to course students)
 *   - Admin Announcements      (create, broadcast, schedule platform-wide)
 *
 * ── Changelog ────────────────────────────────────────────────────────────────
 * v3 fixes applied to this file:
 *
 *  [1] Notification.notification_type   → EXTENDED_NOTIFICATION_TYPES (13 types)
 *  [2] Notification schema              → added 'status' field (pending|sent|failed)
 *  [3] Notification schema              → added 'scheduled_at' field
 *  [4] NotificationPreference           → EXTENDED_NOTIFICATION_TYPES (13 types)
 *  [5] Announcement.target_audience     → corrected enum to v2 values
 *                                         (all_users|all_students|course_students|teachers|parents)
 *  [6] Announcement schema              → added 'status' field
 *                                         (draft|scheduled|broadcasted|edited|deactivated)
 *  [7] DeliveryStats schema             → v3 async shape { queued, total, job_id }
 *                                         (was { total, in_app_sent, push_sent, push_skipped })
 *  [8] TeacherSentNotificationBatch     → new schema added for GET /notifications/sent
 *  [9] /notifications/course  example   → updated to v3 delivery shape
 * [10] /notifications/student example   → updated to v3 delivery shape
 * [11] /announcements/broadcast example → updated to v3 delivery shape + description updated
 * [12] GET /notifications/sent          → path was already present; verified complete
 *
 * Teacher notification fixes:
 * [13] TeacherSentNotificationBatch     → 'course_id' renamed to 'related_id'
 *                                         Model returns n.related_id directly. When
 *                                         related_type='student', this is a student user_id.
 * [14] TeacherSentNotificationBatch     → added 'scheduled_count' field
 *                                         (status=pending AND scheduled_at IS NOT NULL)
 * [15] TeacherSentNotificationBatch     → 'pending_count' description corrected
 *                                         (status=pending AND scheduled_at IS NULL = BullMQ queued)
 * [16] /notifications/sent status param → enum: ['sent','scheduled','failed']
 * [17] /notifications/sent description  → explains all/scheduled distinction and default
 * [18] /notifications/sent examples     → 'typical'→'all_batches' with real data shape;
 *                                         'filtered_pending'→'filtered_scheduled' (corrected);
 *                                         new 'filtered_failed' example added;
 *                                         scheduled_count added to all batch objects
 * [19] /notifications/sent 400 response → error message lists all 5 valid status values
 */

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TYPE ENUMS — single source of truth
// Update here and every schema that references these arrays reflects the change.
// ─────────────────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES = [
  'course', 'quiz', 'test', 'assignment', 'chat',
  'system', 'achievement', 'payment', 'live_class', 'doubt',
];

// All 13 types — used in ALL schemas and query param enums
const EXTENDED_NOTIFICATION_TYPES = [
  ...NOTIFICATION_TYPES,
  'teacher_notification', // Teacher manually sent this
  'announcement',         // Broadcast from an admin announcement
  'enrollment',           // Student enrolled in a course
];

export const notificationsSwagger = {
  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {
    // ─────────────────────────────────────────────────────────────────────
    // Notification
    // FIX [1]: notification_type now uses EXTENDED_NOTIFICATION_TYPES (13)
    // FIX [2]: added 'status' field
    // FIX [3]: added 'scheduled_at' field
    // ─────────────────────────────────────────────────────────────────────
    Notification: {
      type: 'object',
      description: 'A single notification record stored for a user.',
      properties: {
        notification_id: { type: 'integer', example: 1 },
        title: { type: 'string', example: 'Payment Successful!' },
        message: { type: 'string', example: 'Your payment of ₹999 was successful.' },

        // FIX [1]: was NOTIFICATION_TYPES (10), now EXTENDED (13)
        notification_type: {
          type: 'string',
          enum: EXTENDED_NOTIFICATION_TYPES,
          example: 'payment',
        },

        related_id: { type: 'integer', nullable: true, example: 42 },
        related_type: { type: 'string', nullable: true, example: 'payment' },
        is_read: { type: 'boolean', example: false },
        read_at: { type: 'string', format: 'date-time', nullable: true },

        delivery_method: {
          type: 'string',
          enum: ['in_app', 'push', 'email', 'sms'],
          example: 'in_app',
        },

        // FIX [2]: new field — tracks per-row delivery lifecycle
        status: {
          type: 'string',
          enum: ['pending', 'sent', 'failed'],
          example: 'sent',
          description: 'pending = scheduled for later | sent = delivered | failed = errored',
        },

        // FIX [3]: new field — non-null only for teacher-scheduled notifications
        scheduled_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
          description:
            'Non-null only for teacher-scheduled notifications. Background job fires at this time.',
        },

        created_at: { type: 'string', format: 'date-time', example: '2026-02-27T10:00:00Z' },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // NotificationPreference
    // FIX [4]: notification_type now uses EXTENDED_NOTIFICATION_TYPES (13)
    // ─────────────────────────────────────────────────────────────────────
    NotificationPreference: {
      type: 'object',
      description: "A user's delivery preference for one notification type.",
      properties: {
        // FIX [4]: was NOTIFICATION_TYPES (10), now EXTENDED (13)
        notification_type: {
          type: 'string',
          enum: EXTENDED_NOTIFICATION_TYPES,
          example: 'payment',
        },

        in_app_enabled: { type: 'boolean', example: true },
        push_enabled: { type: 'boolean', example: true },
        email_enabled: { type: 'boolean', example: false },
        sms_enabled: { type: 'boolean', example: false },
        updated_at: { type: 'string', format: 'date-time', nullable: true },

        is_default: {
          type: 'boolean',
          example: true,
          description: 'true = no DB row exists yet, these are default values (not saved)',
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Announcement
    // FIX [5]: target_audience enum corrected from old v1 values to v2 values
    // FIX [6]: added 'status' field
    // ─────────────────────────────────────────────────────────────────────
    Announcement: {
      type: 'object',
      description:
        'An admin-created announcement. Notifications are only created when broadcast runs.',
      properties: {
        announcement_id: { type: 'integer', example: 1 },
        title: { type: 'string', example: 'Platform Maintenance' },
        content: { type: 'string', example: 'Platform will be down Sunday at 2 AM IST.' },

        // FIX [5]: OLD was ['all','students','teachers','parents','specific_course']
        target_audience: {
          type: 'string',
          enum: [
            'all_users', // Every active user (all roles)
            'all_students', // All active students only
            'course_students', // Students enrolled in one specific course (requires course_id)
            'teachers', // All active teachers
            'parents', // All active parents
          ],
          example: 'all_users',
        },

        course_id: {
          type: 'integer',
          nullable: true,
          example: null,
          description: 'Required only when target_audience = course_students',
        },

        priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },

        // FIX [6]: new field — lifecycle tracking
        status: {
          type: 'string',
          enum: ['draft', 'scheduled', 'broadcasted', 'edited', 'deactivated'],
          example: 'broadcasted',
          description: [
            'draft       = created but not sent to anyone',
            'scheduled   = background job will broadcast at start_date',
            'broadcasted = notifications sent to all target users',
            'edited      = content changed after being broadcasted',
            'deactivated = disabled manually or expired by end_date',
          ].join(' | '),
        },

        is_active: { type: 'boolean', example: true },
        start_date: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2026-03-10T10:00:00Z',
        },
        end_date: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2026-03-15T23:59:59Z',
        },
        created_by_name: { type: 'string', example: 'Super Admin' },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-05T09:00:00Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-05T09:00:00Z' },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // DeliveryStats
    // FIX [7]: v3 delivery is now async/queued via BullMQ
    //   OLD shape: { total, in_app_sent, push_sent, push_skipped }
    //   NEW shape: { queued, total, job_id }
    //   Actual delivery counts are logged by the worker, not returned by API.
    // ─────────────────────────────────────────────────────────────────────
    DeliveryStats: {
      type: 'object',
      description: [
        'Returned after any send/broadcast operation.',
        'v3: Delivery is now non-blocking (queued via BullMQ).',
        'The API responds immediately. A background worker handles',
        'DB insert → WebSocket emit → push. Use job_id to trace in server logs.',
      ].join(' '),
      properties: {
        queued: {
          type: 'boolean',
          example: true,
          description: 'Always true when at least one user was found to notify',
        },
        total: {
          type: 'integer',
          example: 250,
          description: 'Total unique users the background worker will notify',
        },
        job_id: {
          type: 'string',
          example: '1709631245823-0',
          description: 'BullMQ job ID — use this to trace the job in server logs',
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // TeacherSentNotificationBatch
    // FIX [8]: entirely new schema for GET /notifications/sent
    //
    // When a teacher sends to 200 students, 200 DB rows are inserted.
    // The /sent endpoint groups them into ONE batch row with aggregate counts.
    // ─────────────────────────────────────────────────────────────────────
    // FIX [13]: 'course_id' renamed to 'related_id'
    //   The model returns n.related_id directly — never aliased as course_id.
    //   When related_type = 'student', related_id is a student user_id, NOT a course_id.
    // FIX [14]: added 'scheduled_count' field (status=pending AND scheduled_at IS NOT NULL)
    // FIX [15]: corrected 'pending_count' description (status=pending AND scheduled_at IS NULL)
    TeacherSentNotificationBatch: {
      type: 'object',
      description: [
        'One "batch" = one send action by the teacher, regardless of recipient count.',
        'Rows are grouped by title + message + notification_type + related_id + related_type',
        '+ scheduled_at, inserted within the same 60-second time window.',
        'Sending to 45 students appears as one row with recipient_count: 45.',
      ].join(' '),
      properties: {
        title: { type: 'string', example: 'Assignment Due Tomorrow!' },
        message: { type: 'string', example: 'Please submit your Module 2 assignment before 6 PM.' },
        notification_type: { type: 'string', example: 'assignment' },

        // FIX [13]: was 'course_id' — model returns n.related_id, never aliased
        related_id: {
          type: 'integer',
          example: 11,
          description: [
            'The target entity ID.',
            'Is a course_id when related_type = "course".',
            'Is a student user_id when related_type = "student" (individual student send).',
          ].join(' '),
        },

        related_type: {
          type: 'string',
          enum: ['course', 'student'],
          example: 'course',
          description:
            '"course" = sent to all students in a course | "student" = sent to one specific student',
        },

        scheduled_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
          description:
            'Non-null for scheduled batches — the future datetime the teacher set for delivery.',
        },

        sent_at: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T04:51:28Z',
          description: 'Earliest created_at in the batch = when the teacher triggered the send.',
        },

        recipient_count: {
          type: 'integer',
          example: 11,
          description: 'Total students this batch was addressed to.',
        },
        delivered_count: {
          type: 'integer',
          example: 11,
          description: 'Rows with status = "sent" (successfully delivered).',
        },

        // All status='pending' rows — covers future-scheduled sends (scheduled_at IS NOT NULL)
        // and BullMQ-queued sends (scheduled_at IS NULL). One column for both.
        scheduled_count: {
          type: 'integer',
          example: 0,
          description: [
            'All rows with status = "pending".',
            'Covers both future-scheduled sends (scheduled_at IS NOT NULL)',
            'and sends currently queued in BullMQ (scheduled_at IS NULL).',
          ].join(' '),
        },

        failed_count: {
          type: 'integer',
          example: 0,
          description: 'Rows with status = "failed".',
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {
    // ══════════════════════════════════════════════════
    // USER NOTIFICATIONS
    // ══════════════════════════════════════════════════

    '/notifications': {
      get: {
        tags: ['User Notifications'],
        summary: 'Get paginated notifications',
        description:
          "Fetch the logged-in user's notifications (status = 'sent' only). Filter by type or unread status.",
        parameters: [
          {
            name: 'type',
            in: 'query',
            required: false,
            description: 'Filter by notification type',
            schema: { type: 'string', enum: EXTENDED_NOTIFICATION_TYPES },
          },
          {
            name: 'unread_only',
            in: 'query',
            required: false,
            description: 'Return only unread notifications',
            schema: { type: 'boolean' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'Notifications fetched successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Notifications fetched successfully',
                  data: {
                    notifications: [
                      {
                        notification_id: 123,
                        title: 'Payment Successful! 🎉',
                        message: 'Your payment of ₹4999 for "CS101" was successful.',
                        notification_type: 'payment',
                        related_id: 567,
                        related_type: 'payment',
                        is_read: false,
                        read_at: null,
                        delivery_method: 'in_app',
                        status: 'sent', // FIX [2]
                        scheduled_at: null, // FIX [3]
                        created_at: '2026-03-05T10:00:00Z',
                      },
                    ],
                    pagination: { page: 1, limit: 20, total: 25, total_pages: 2, has_next: true },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/notifications/unread-count': {
      get: {
        tags: ['User Notifications'],
        summary: 'Get unread notification count',
        description:
          "Returns count of unread (status = 'sent') notifications. Used for the bell icon badge.",
        responses: {
          200: {
            description: 'Unread count returned',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Unread count fetched',
                  data: { unread_count: 5 },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/notifications/read-all': {
      patch: {
        tags: ['User Notifications'],
        summary: 'Mark all notifications as read',
        description:
          'Marks every unread notification as read for the logged-in user in one operation.',
        responses: {
          200: {
            description: 'All marked as read',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: '15 notifications marked as read',
                  data: { updated_count: 15 },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/notifications/{id}/read': {
      patch: {
        tags: ['User Notifications'],
        summary: 'Mark a single notification as read',
        description:
          'Only the notification owner can mark it as read. Returns 200 even if already read.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 123 },
            description: 'Notification ID',
          },
        ],
        responses: {
          200: {
            description: 'Notification marked as read (or was already read)',
            content: {
              'application/json': {
                example: { success: true, message: 'Notification marked as read' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/notifications/{id}': {
      delete: {
        tags: ['User Notifications'],
        summary: 'Permanently delete a notification',
        description: 'Hard delete — not recoverable. Only the notification owner can delete.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 123 },
            description: 'Notification ID',
          },
        ],
        responses: {
          200: {
            description: 'Notification deleted',
            content: {
              'application/json': {
                example: { success: true, message: 'Notification deleted successfully' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // NOTIFICATION PREFERENCES
    // ══════════════════════════════════════════════════

    '/notifications/preferences': {
      get: {
        tags: ['Notification Preferences'],
        summary: 'Get user notification preferences',
        description:
          'Returns all 13 notification types. Types with no saved row return defaults (all enabled).',
        responses: {
          200: {
            description: 'Preferences fetched',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Preferences fetched successfully',
                  data: {
                    preferences: [
                      {
                        notification_type: 'payment',
                        in_app_enabled: true,
                        push_enabled: true,
                        email_enabled: false,
                        sms_enabled: false,
                        updated_at: '2026-03-01T09:00:00Z',
                        is_default: false,
                      },
                      {
                        notification_type: 'announcement',
                        in_app_enabled: true,
                        push_enabled: true,
                        email_enabled: false,
                        sms_enabled: false,
                        updated_at: null,
                        is_default: true,
                      },
                      {
                        notification_type: 'teacher_notification',
                        in_app_enabled: true,
                        push_enabled: false,
                        email_enabled: false,
                        sms_enabled: false,
                        updated_at: '2026-03-02T08:00:00Z',
                        is_default: false,
                      },
                    ],
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },

      put: {
        tags: ['Notification Preferences'],
        summary: 'Update notification preferences',
        description:
          'Uses upsert — safe to call multiple times. Send only the types you want to change.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['preferences'],
                properties: {
                  preferences: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['notification_type'],
                      properties: {
                        // FIX [4]: uses EXTENDED (13)
                        notification_type: { type: 'string', enum: EXTENDED_NOTIFICATION_TYPES },
                        in_app_enabled: { type: 'boolean' },
                        push_enabled: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
              example: {
                preferences: [
                  { notification_type: 'payment', in_app_enabled: true, push_enabled: true },
                  { notification_type: 'quiz', in_app_enabled: true, push_enabled: false },
                  { notification_type: 'announcement', in_app_enabled: true, push_enabled: false },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Preferences updated',
            content: {
              'application/json': {
                example: { success: true, message: 'Preferences updated successfully' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/notifications/preferences/disable-all': {
      patch: {
        tags: ['Notification Preferences'],
        summary: 'Disable all notifications',
        description:
          'Sets in_app_enabled = false and push_enabled = false for ALL 13 notification types.',
        responses: {
          200: {
            description: 'All notifications disabled',
            content: {
              'application/json': {
                example: { success: true, message: 'All notifications have been disabled' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // TEACHER NOTIFICATIONS
    // ══════════════════════════════════════════════════

    '/notifications/course': {
      post: {
        tags: ['Teacher Notifications'],
        summary: 'Send notification to all students in a course',
        description: [
          'Teacher sends a notification to all enrolled students of a course they own.',
          '',
          '**v2 Change**: `course_id` is now in the **request body** (not the URL).',
          '',
          '**v3 Delivery**: Non-blocking — queued via BullMQ. The API responds immediately.',
          'A background worker handles DB insert → WebSocket emit → push notification.',
          'Optionally also notifies parents of the enrolled students.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['course_id', 'title', 'message'],
                properties: {
                  course_id: {
                    type: 'integer',
                    example: 11,
                    description: 'ID of the course whose students will be notified',
                  },
                  title: { type: 'string', maxLength: 255, example: 'New Lecture Uploaded' },
                  message: { type: 'string', example: 'Check the latest video in Module 3.' },
                  notification_type: {
                    type: 'string',
                    enum: EXTENDED_NOTIFICATION_TYPES,
                    default: 'teacher_notification',
                    description: 'Defaults to teacher_notification if not provided',
                  },
                  include_parents: {
                    type: 'boolean',
                    default: false,
                    description: 'If true, also notify parents of enrolled students',
                  },
                },
              },
              example: {
                course_id: 11,
                title: 'Assignment Due Tomorrow!',
                message:
                  'Please submit your Module 2 assignment before 6 PM. Late submissions will not be accepted.',
                notification_type: 'assignment',
                include_parents: true,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Notification queued for delivery to course students',
            content: {
              'application/json': {
                // FIX [9]: v3 delivery shape — was { total, in_app_sent, push_sent, push_skipped }
                example: {
                  success: true,
                  message: 'Notification sent to course students',
                  data: {
                    delivery_stats: {
                      queued: true,
                      total: 48,
                      job_id: '1709631245823-0',
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: '403 — Teacher does not own this course',
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'You are not authorized to send notifications for this course',
                },
              },
            },
          },
        },
      },
    },

    '/notifications/student': {
      post: {
        tags: ['Teacher Notifications'],
        summary: 'Send notification to a specific student',
        description: [
          'Teacher sends a notification to one student enrolled in one of their courses.',
          '',
          '**v2 Change**: `student_id` is now in the **request body** (not the URL).',
          '',
          "**v3 Delivery**: Non-blocking — queued via BullMQ. Optionally also notifies the student's parents.",
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['student_id', 'title', 'message'],
                properties: {
                  student_id: {
                    type: 'integer',
                    example: 45,
                    description: "Student's user_id (NOT the student profile ID)",
                  },
                  title: { type: 'string', maxLength: 255, example: 'Great work on your test! 🌟' },
                  message: { type: 'string', example: 'You scored 96% on the Module 3 quiz!' },
                  notification_type: {
                    type: 'string',
                    enum: EXTENDED_NOTIFICATION_TYPES,
                    default: 'teacher_notification',
                  },
                  include_parents: {
                    type: 'boolean',
                    default: false,
                    description: "If true, also notify this student's parents",
                  },
                },
              },
              example: {
                student_id: 45,
                title: 'Assignment Reminder',
                message: 'Submit your Module 2 assignment by tonight or it will be marked late.',
                notification_type: 'assignment',
                include_parents: false,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Notification queued for delivery to student',
            content: {
              'application/json': {
                // FIX [10]: v3 delivery shape
                example: {
                  success: true,
                  message: 'Notification sent to student',
                  data: {
                    delivery_stats: {
                      queued: true,
                      total: 1,
                      job_id: '1709631245824-0',
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: "403 — Student is not in any of the teacher's courses",
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'This student is not enrolled in any of your courses',
                },
              },
            },
          },
          404: {
            description: '404 — Student not found or inactive',
            content: {
              'application/json': {
                example: { success: false, message: 'Student not found or inactive' },
              },
            },
          },
        },
      },
    },

    '/notifications/schedule': {
      post: {
        tags: ['Teacher Notifications'],
        summary: 'Schedule a notification for a future time',
        description: [
          'Teacher schedules a notification to be sent to all course students at a specific future time.',
          '',
          'Stored in DB with `status = "pending"` and `scheduled_at` set.',
          'The recurring BullMQ job (runs every 60 seconds) picks it up when `scheduled_at` arrives',
          'and queues delivery via the notification worker.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['course_id', 'title', 'message', 'scheduled_at'],
                properties: {
                  course_id: {
                    type: 'integer',
                    example: 11,
                    description: 'Course whose students will be notified',
                  },
                  title: { type: 'string', maxLength: 255, example: 'Live Class Reminder 🎥' },
                  message: {
                    type: 'string',
                    example: 'Your live class starts in 1 hour. Join now!',
                  },
                  scheduled_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-03-05T18:00:00Z',
                    description: 'Must be a future datetime. Background job fires at this time.',
                  },
                },
              },
              example: {
                course_id: 11,
                title: 'Live Class Reminder 🎥',
                message:
                  'Your live class starts in 1 hour. Make sure you have a stable connection.',
                scheduled_at: '2026-03-05T18:00:00Z',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Notification scheduled successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Notification scheduled successfully',
                  data: { scheduled_count: 48, scheduled_at: '2026-03-05T18:00:00Z' },
                },
              },
            },
          },
          400: {
            description: '400 — Validation error or scheduled_at is in the past',
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'Validation failed',
                  errors: [
                    {
                      field: 'scheduled_at',
                      message: 'scheduled_at must be a future date and time',
                    },
                  ],
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
    // TEACHER DASHBOARD — SENT NOTIFICATIONS HISTORY
    // ══════════════════════════════════════════════════

    '/notifications/sent': {
      get: {
        tags: ['Teacher Notifications'],
        summary: 'Get all sent notifications (teacher dashboard)',
        description: [
          'Returns a paginated list of **all** notifications this teacher has sent, grouped by **batch**.',
          '',
          '**What is a batch?**',
          'One send action = one batch row. Sending to 45 students creates 45 DB rows but shows',
          'as ONE row here with `recipient_count: 45` plus a delivery breakdown.',
          '',
          '**Default (no status filter):** returns every batch — sent, scheduled, and failed.',
          '',
          '**`scheduled_count`** = all `status = "pending"` rows, whether the teacher set',
          'a future `scheduled_at` time or the rows are currently queued in BullMQ.',
          '',
          '**How grouping works:**',
          'Rows with the same title + message + notification_type + related_id + related_type',
          '+ scheduled_at, inserted within the same 60-second window, form one batch.',
        ].join('\n'),
        parameters: [
          {
            name: 'course_id',
            in: 'query',
            required: false,
            description: 'Filter to a specific course. Only show batches sent for this course.',
            schema: { type: 'integer', example: 5 },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: [
              'Filter batches by delivery status. Omit to return everything (including scheduled).',
              '- `sent`      — at least one student was successfully delivered',
              '- `scheduled` — at least one student is still pending (covers future-scheduled sends AND BullMQ-queued sends)',
              '- `failed`    — at least one student had a delivery failure',
            ].join('\n'),
            schema: { type: 'string', enum: ['sent', 'scheduled', 'failed'] },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'Sent notifications history fetched successfully',
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
                            notifications: {
                              type: 'array',
                              // FIX [8]: references the new schema
                              items: { $ref: '#/components/schemas/TeacherSentNotificationBatch' },
                            },
                            pagination: { $ref: '#/components/schemas/Pagination' },
                          },
                        },
                      },
                    },
                  ],
                },
                // FIX [18]: examples updated — real data shape, scheduled_count added,
                //   'typical' → 'all_batches', 'filtered_pending' → 'filtered_scheduled' + new 'filtered_failed'
                examples: {
                  all_batches: {
                    summary: 'No filter — all batch types (real data shape)',
                    value: {
                      success: true,
                      message: 'Sent notifications fetched successfully',
                      data: {
                        notifications: [
                          {
                            // Course send: related_type='course', related_id=course_id
                            title: 'Assignment Due Tomorrow!',
                            message:
                              'Please submit your Module 2 assignment before 6 PM. Late submissions will not be accepted.',
                            notification_type: 'assignment',
                            related_id: 11,
                            related_type: 'course',
                            scheduled_at: null,
                            sent_at: '2026-03-23T04:51:28Z',
                            recipient_count: 11,
                            delivered_count: 11,
                            scheduled_count: 0,
                            failed_count: 0,
                          },
                          {
                            // Scheduled send: scheduled_at was set, now delivered
                            title: 'Live Class Reminder 🎥',
                            message:
                              'Your live class starts in 1 hour. Make sure you have a stable connection.',
                            notification_type: 'teacher_notification',
                            related_id: 3,
                            related_type: 'course',
                            scheduled_at: '2026-03-23T04:56:00Z',
                            sent_at: '2026-03-23T04:54:21Z',
                            recipient_count: 9,
                            delivered_count: 9,
                            scheduled_count: 0,
                            failed_count: 0,
                          },
                          {
                            // Individual student send: related_type='student', related_id=student user_id
                            title: 'Assignment Reminder',
                            message:
                              'Submit your Module 2 assignment by tonight or it will be marked late.',
                            notification_type: 'assignment',
                            related_id: 8, // student user_id — NOT a course_id
                            related_type: 'student',
                            scheduled_at: null,
                            sent_at: '2026-03-23T04:52:57Z',
                            recipient_count: 1,
                            delivered_count: 1,
                            scheduled_count: 0,
                            failed_count: 0,
                          },
                        ],
                        pagination: {
                          page: 1,
                          limit: 20,
                          total: 3,
                          total_pages: 1,
                          has_next: false,
                        },
                      },
                    },
                  },
                  filtered_scheduled: {
                    // FIX [18]: was 'filtered_pending' — scheduled = status=pending AND scheduled_at IS NOT NULL
                    summary: 'status=scheduled — waiting for a future delivery time',
                    value: {
                      success: true,
                      message: 'Sent notifications fetched successfully',
                      data: {
                        notifications: [
                          {
                            title: 'Quiz Tomorrow at 10 AM',
                            message: "Don't forget — your quiz starts at 10 AM tomorrow.",
                            notification_type: 'teacher_notification',
                            related_id: 5,
                            related_type: 'course',
                            scheduled_at: '2026-03-15T04:30:00Z', // future time teacher set
                            sent_at: '2026-03-14T14:00:00Z',
                            recipient_count: 45,
                            delivered_count: 0,
                            scheduled_count: 45, // all 45 are still waiting for scheduled_at
                            failed_count: 0,
                          },
                        ],
                        pagination: {
                          page: 1,
                          limit: 20,
                          total: 1,
                          total_pages: 1,
                          has_next: false,
                        },
                      },
                    },
                  },
                  filtered_failed: {
                    summary: 'status=failed — batches with at least one delivery failure',
                    value: {
                      success: true,
                      message: 'Sent notifications fetched successfully',
                      data: {
                        notifications: [
                          {
                            title: 'Test Results Published',
                            message: 'Your Module 2 test results are now available.',
                            notification_type: 'test',
                            related_id: 7,
                            related_type: 'course',
                            scheduled_at: null,
                            sent_at: '2026-03-20T08:00:00Z',
                            recipient_count: 38,
                            delivered_count: 35,
                            scheduled_count: 0,
                            failed_count: 3,
                          },
                        ],
                        pagination: {
                          page: 1,
                          limit: 20,
                          total: 1,
                          total_pages: 1,
                          has_next: false,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          // FIX [19]: error message updated to list all 5 valid status values
          400: {
            description: '400 — Invalid filter value',
            content: {
              'application/json': {
                example: {
                  success: false,
                  message: 'status must be one of: sent, scheduled, failed',
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
    // ADMIN ANNOUNCEMENTS
    // ══════════════════════════════════════════════════

    '/announcements': {
      post: {
        tags: ['Admin Announcements'],
        summary: 'Create a draft announcement',
        description: [
          'Saves the announcement with `status = "draft"`. No notifications created yet.',
          '',
          'After creating, call one of:',
          '- `POST /announcements/broadcast/:id` to send immediately',
          '- `POST /announcements/schedule` to send at a future time',
          '- `PUT /announcements/:id` to edit before publishing',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content', 'target_audience'],
                properties: {
                  title: { type: 'string', maxLength: 255, example: 'Platform Maintenance Notice' },
                  content: {
                    type: 'string',
                    example: 'The platform will be under maintenance on Sunday at 2 AM IST.',
                  },
                  // FIX [5]: corrected enum values
                  target_audience: {
                    type: 'string',
                    enum: ['all_users', 'all_students', 'course_students', 'teachers', 'parents'],
                    example: 'all_users',
                  },
                  course_id: {
                    type: 'integer',
                    nullable: true,
                    example: null,
                    description: 'Required when target_audience = course_students',
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    default: 'medium',
                    example: 'high',
                  },
                  end_date: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-03-10T23:59:59Z',
                  },
                },
              },
              examples: {
                platform_wide: {
                  summary: 'Platform-wide (all users)',
                  value: {
                    title: 'Platform Maintenance Notice',
                    content: 'Platform will be under maintenance on Sunday at 2 AM IST.',
                    target_audience: 'all_users',
                    priority: 'high',
                    end_date: '2026-03-10T23:59:59Z',
                  },
                },
                course_specific: {
                  summary: 'Course-specific (requires course_id)',
                  value: {
                    title: 'CS101 Exam Schedule Released',
                    content: 'The final exam for CS101 is on June 15 at 10 AM.',
                    target_audience: 'course_students',
                    course_id: 11,
                    priority: 'high',
                  },
                },
                teachers_only: {
                  summary: 'Teachers only',
                  value: {
                    title: 'Monthly Teacher Sync',
                    content: 'Please join the monthly sync call on March 15 at 5 PM.',
                    target_audience: 'teachers',
                    priority: 'medium',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Announcement created as draft',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Announcement created as draft',
                  data: { announcement_id: 42 },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },

      get: {
        tags: ['Admin Announcements'],
        summary: 'Get all announcements (admin view)',
        description:
          'Returns every announcement regardless of status — drafts, scheduled, deactivated. Admin only.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'All announcements fetched',
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
                            announcements: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Announcement' },
                            },
                            pagination: { $ref: '#/components/schemas/Pagination' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/announcements/active': {
      get: {
        tags: ['Admin Announcements'],
        summary: 'Get active announcements (user view)',
        description: [
          'Returns only announcements that are:',
          '- `is_active = true`',
          '- `status` is `broadcasted` or `edited`',
          '- Within their active date window',
          '',
          'Available to all authenticated users (students, teachers, parents, admins).',
        ].join('\n'),
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Active announcements fetched',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Active announcements fetched',
                  data: {
                    announcements: [
                      {
                        announcement_id: 42,
                        title: 'Platform Maintenance Notice',
                        content: 'Platform will be down Sunday at 2 AM IST.',
                        target_audience: 'all_users',
                        priority: 'high',
                        status: 'broadcasted',
                        is_active: true,
                        start_date: '2026-03-05T00:00:00Z',
                        end_date: '2026-03-10T23:59:59Z',
                        created_at: '2026-03-04T09:00:00Z',
                      },
                    ],
                    pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_next: false },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/announcements/schedule': {
      post: {
        tags: ['Admin Announcements'],
        summary: 'Create a scheduled announcement',
        description: [
          'Creates an announcement with `status = "scheduled"` and a future `start_date`.',
          'The recurring BullMQ job (runs every 60 seconds) auto-broadcasts it when `start_date` arrives.',
          '',
          'Difference from `POST /announcements` (draft):',
          '- Draft: no start_date, requires a manual broadcast call',
          '- Scheduled: has start_date, broadcasts automatically',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content', 'target_audience', 'start_date'],
                properties: {
                  title: { type: 'string', maxLength: 255, example: 'Holiday Notice' },
                  content: {
                    type: 'string',
                    example: 'Classes are cancelled tomorrow due to a public holiday.',
                  },
                  target_audience: {
                    type: 'string',
                    enum: ['all_users', 'all_students', 'course_students', 'teachers', 'parents'],
                    example: 'all_students',
                  },
                  course_id: {
                    type: 'integer',
                    nullable: true,
                    description: 'Required when target_audience = course_students',
                  },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  start_date: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-03-10T10:00:00Z',
                    description: 'Must be in the future. BullMQ job broadcasts at this time.',
                  },
                  end_date: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                    example: '2026-03-15T23:59:59Z',
                  },
                },
              },
              example: {
                title: 'Holiday Notice',
                content: 'Classes cancelled tomorrow due to a public holiday. Enjoy your day!',
                target_audience: 'all_students',
                priority: 'medium',
                start_date: '2026-03-10T10:00:00Z',
                end_date: '2026-03-15T23:59:59Z',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Announcement scheduled',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Announcement scheduled successfully',
                  data: { announcement_id: 43, scheduled_at: '2026-03-10T10:00:00Z' },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/announcements/broadcast/{announcementId}': {
      post: {
        tags: ['Admin Announcements'],
        summary: 'Instantly broadcast an announcement',
        // FIX [11]: updated description — mentions Redis/BullMQ queue
        description: [
          'Immediately fans out the announcement to all target users.',
          '',
          '**What happens** (v3 — non-blocking, queued via BullMQ):',
          '1. Resolves all user_ids based on `target_audience`',
          '2. Adds a SEND_BATCH job to the Redis queue — API returns immediately',
          '3. Background worker processes: DB insert → WebSocket emit → push send',
          '4. Sets announcement `status = "broadcasted"` synchronously',
          '',
          'Announcement must be `is_active = true` and not already `deactivated`.',
        ].join('\n'),
        parameters: [
          {
            name: 'announcementId',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 42 },
          },
        ],
        responses: {
          200: {
            description: 'Announcement queued for broadcast successfully',
            content: {
              'application/json': {
                // FIX [11]: v3 delivery shape
                example: {
                  success: true,
                  message: 'Announcement broadcasted successfully',
                  data: {
                    delivery_stats: {
                      queued: true,
                      total: 4200,
                      job_id: '1709631245825-0',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request — validation or business rule failure',
            content: {
              'application/json': {
                examples: {
                  missing_title: {
                    summary: 'Missing title',
                    value: {
                      success: false,
                      message: 'Announcement title is required for broadcasting',
                    },
                  },
                  missing_content: {
                    summary: 'Missing content',
                    value: {
                      success: false,
                      message: 'Announcement content is required for broadcasting',
                    },
                  },
                  invalid_audience: {
                    summary: 'Missing target audience',
                    value: {
                      success: false,
                      message: 'Target audience is required for broadcasting',
                    },
                  },
                  missing_course_id: {
                    summary: 'Missing course_id for course_students',
                    value: {
                      success: false,
                      message: 'course_id is required when target_audience is course_students',
                    },
                  },
                  inactive: {
                    summary: 'Announcement is inactive',
                    value: { success: false, message: 'Cannot broadcast an inactive announcement' },
                  },
                  deactivated: {
                    summary: 'Announcement is deactivated',
                    value: {
                      success: false,
                      message: 'Cannot broadcast a deactivated announcement',
                    },
                  },
                  no_users: {
                    summary: 'No target users found',
                    value: {
                      success: false,
                      message: 'No target users found for this announcement',
                    },
                  },
                  already_broadcasted: {
                    summary: 'Announcement already broadcasted',
                    value: {
                      success: false,
                      message: 'Announcement has already been broadcasted',
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/announcements/{id}': {
      put: {
        tags: ['Admin Announcements'],
        summary: 'Edit an announcement',
        description: [
          'Updates fields of an existing announcement.',
          '',
          '**Status logic**:',
          '- If current status is `broadcasted` → becomes `edited` (signals content changed after broadcast)',
          '- If current status is `draft` or `scheduled` → status stays unchanged',
          '',
          'All fields are optional — only send what you want to change.',
        ].join('\n'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 42 },
            description: 'Announcement ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'All fields optional. Only send what you want to change.',
                properties: {
                  title: { type: 'string', maxLength: 255 },
                  content: { type: 'string' },
                  target_audience: {
                    type: 'string',
                    enum: ['all_users', 'all_students', 'course_students', 'teachers', 'parents'],
                  },
                  course_id: { type: 'integer', nullable: true },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  end_date: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              example: {
                title: 'UPDATED: Maintenance Rescheduled',
                content: 'Maintenance moved to Monday 2 AM–4 AM. Apologies for the inconvenience.',
                priority: 'high',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Announcement updated',
            content: {
              'application/json': {
                example: { success: true, message: 'Announcement updated successfully' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/announcements/{id}/deactivate': {
      patch: {
        tags: ['Admin Announcements'],
        summary: 'Deactivate an announcement',
        description: [
          'Soft-disables an announcement. Sets:',
          '- `is_active = false`',
          '- `status = "deactivated"`',
          '',
          'Deactivated announcements no longer appear in `/announcements/active`.',
          'This action cannot be reversed via API.',
        ].join('\n'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', example: 42 },
            description: 'Announcement ID',
          },
        ],
        responses: {
          200: {
            description: 'Announcement deactivated',
            content: {
              'application/json': {
                example: { success: true, message: 'Announcement deactivated successfully' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS — controls sidebar grouping and order in Swagger UI
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    {
      name: 'User Notifications',
      description: '🔔 Fetch, read, and delete your own notifications',
    },
    {
      name: 'Notification Preferences',
      description: '⚙️ Control which notification types and channels you receive',
    },
    {
      name: 'Teacher Notifications',
      description: '👨‍🏫 Teachers sending notifications to course students, viewing send history',
    },
    {
      name: 'Admin Announcements',
      description: '📢 Admins creating, scheduling, and broadcasting platform-wide announcements',
    },
  ],
};