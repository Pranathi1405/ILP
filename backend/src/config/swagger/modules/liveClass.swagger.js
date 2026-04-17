/**
 * src/config/swagger/modules/live-classes.swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Swagger docs for the Live Classes module.
 *
 * Route registration order (liveClass.routes.js):
 *   GET    /dashboard   → dashboardStats
 *   GET    /            → classes  (upcoming | past)
 *   POST   /            → scheduleLiveClass
 *   GET    /search      → searchClasses
 *   GET    /:id         → getLiveClassDetails
 *   PUT    /:id         → editLiveClass
 *   DELETE /:id         → removeLiveClass
 *
 * Mounted at: /api/live-classes
 * All endpoints grouped under a single tag: Live Classes
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS — reused across schemas
// ─────────────────────────────────────────────────────────────────────────────
const LIVE_CLASS_STATUSES = ['scheduled', 'live', 'completed', 'cancelled'];

export const liveClassesSwagger = {

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────
  schemas: {

    LiveClass: {
      type: 'object',
      properties: {
        class_id:             { type: 'integer', example: 10 },
        course_id:            { type: 'integer', example: 5 },
        teacher_id:           { type: 'integer', example: 22 },
        title:                { type: 'string',  example: 'Physics - Laws of Motion' },
        status:               { type: 'string',  enum: LIVE_CLASS_STATUSES, example: 'scheduled' },
        room_id:              { type: 'string',  example: 'room_abc123' },
        scheduled_start_time: { type: 'string',  format: 'date-time', example: '2025-03-15T10:00:00Z' },
        scheduled_end_time:   { type: 'string',  format: 'date-time', example: '2025-03-15T11:00:00Z' },
        duration_minutes:     { type: 'integer', example: 60 },
        subject_name:         { type: 'string',  example: 'Physics' },
        course_name:          { type: 'string',  example: '11th Grade Science' },
        created_at:           { type: 'string',  format: 'date-time', example: '2025-03-10T08:00:00Z' },
      },
    },

    LiveClassDashboard: {
      type: 'object',
      description: 'Teacher-specific live class statistics',
      properties: {
        scheduled_today:  { type: 'integer', example: 2,    description: 'Classes scheduled for today' },
        total_broadcasts: { type: 'integer', example: 45,   description: 'Total classes ever conducted' },
        avg_engagement:   { type: 'number',  example: 88.5, description: 'Average engagement percentage across all classes' },
      },
    },

  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATHS
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    // ══════════════════════════════════════════════════
    // DASHBOARD  —  GET /api/live-classes/dashboard
    // ══════════════════════════════════════════════════

    '/live-classes/dashboard': {
      get: {
        tags: ['Live Classes'],
        summary: 'Get live class dashboard statistics',
        description: 'Returns teacher-specific stats: classes scheduled today, total broadcasts, and average engagement.',
        parameters: [
        ],
        responses: {
          200: {
            description: 'Dashboard stats fetched successfully',
            content: {
              'application/json': {
                // controller: res.json({ success: true, data })
                example: {
                  success: true,
                  data: {
                    scheduled_today:  2,
                    total_broadcasts: 45,
                    avg_engagement:   88.5,
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing user_id',
            content: {
              'application/json': {
                example: { success: false, message: 'user_id is required' },
              },
            },
          },
          500: {
            description: 'Failed to fetch dashboard stats',
            content: {
              'application/json': {
                example: { success: false, message: 'Failed to fetch dashboard stats' },
              },
            },
          },
        },
      },
    },

    // ══════════════════════════════════════════════════
    // LIST & CREATE  —  GET|POST /api/live-classes
    // ══════════════════════════════════════════════════

    '/live-classes': {
     get: {
  tags: ['Live Classes'],
  summary: 'Get upcoming or past live classes',
  description: "Returns live classes for the logged-in teacher filtered by `upcoming` or `past`.",
  parameters: [
    {
      name: 'type',
      in: 'query',
      required: true,
      description: "Must be 'upcoming' or 'past'",
      schema: {
        type: 'string',
        enum: ['upcoming', 'past'],
        example: 'upcoming'
      },
    },
  ],

  responses: {
    200: {
      description: 'Classes fetched successfully',
      content: {
        'application/json': {
          examples: {
            upcoming: {
              summary: 'Upcoming classes',
              value: {
                success: true,
                type: 'upcoming',
                data: [
                  {
                    class_id: 10,
                    title: 'Physics - Rotational Motion',
                    status: 'live',
                    room_id: 'room_abc123',
                    scheduled_start_time: '2025-03-15T10:00:00Z',
                    scheduled_end_time: '2025-03-15T11:00:00Z',
                    duration_minutes: 60,
                    subject_name: 'Physics',
                    course_name: '11th Grade Science',
                  }
                ],
              },
            },
            past: {
              summary: 'Past classes',
              value: {
                success: true,
                type: 'past',
                data: [
                  {
                    class_id: 7,
                    title: 'Chemistry - Organic Basics',
                    status: 'completed',
                    room_id: 'room_ghi789',
                    scheduled_start_time: '2025-03-10T10:00:00Z',
                    scheduled_end_time: '2025-03-10T11:00:00Z',
                    duration_minutes: 60,
                    subject_name: 'Chemistry',
                    course_name: '11th Grade Science',
                  }
                ],
              },
            },
          },
        },
      },
    },

    //  UPDATED 400 (removed user_id error)
    400: {
      description: 'Invalid query parameters',
      content: {
        'application/json': {
          examples: {
            invalidType: {
              summary: 'Invalid type param',
              value: {
                success: false,
                message: "Query param 'type' must be 'upcoming' or 'past'"
              },
            },
          },
        },
      },
    },

    //  ADD THIS (important for JWT APIs)
    401: {
      description: 'Unauthorized (Missing or invalid token)',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Unauthorized'
          },
        },
      },
    },

    500: {
      description: 'Failed to fetch classes',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Failed to fetch classes'
          },
        },
      },
    },
  },
},

      post: {
  tags: ['Live Classes'],
  summary: 'Schedule a new live class',
  description: 'Creates a new live class. Teacher is resolved from JWT token (req.user.id). End time is optional and auto-calculated using duration.',

  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['course_id', 'subject_id', 'title', 'scheduled_start_time', 'duration_minutes'],
          properties: {
            course_id: {
              type: 'integer',
              example: 5
            },
            subject_id: {
              type: 'integer',
              example: 2
            },
            module_id: {
              type: 'integer',
              nullable: true,
              example: 10
            },
            title: {
              type: 'string',
              maxLength: 255,
              example: 'Physics - Laws of Motion'
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Introduction to Newton laws'
            },
            scheduled_start_time: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-25T18:30:00Z'
            },
            scheduled_end_time: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2026-03-25T19:30:00Z'
            },
            duration_minutes: {
              type: 'integer',
              description: 'Used to auto-calculate end time if not provided',
              example: 60
            }
          }
        },

        example: {
          course_id: 5,
          subject_id: 2,
          module_id: 10,
          title: 'Physics - Laws of Motion',
          description: 'Introduction to Newton laws',
          scheduled_start_time: '2026-03-25T18:30:00Z',
          duration_minutes: 60
        }
      }
    }
  },

  responses: {
    201: {
      description: 'Live class scheduled successfully',
      content: {
        'application/json': {
          example: {
            success: true,
            message: 'Live class scheduled successfully',
            data: {
              class_id: 12,
              room_id: 'live_1711360000000'
            }
          }
        }
      }
    },

    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Missing required fields'
          }
        }
      }
    },

    403: {
      description: 'User is not a teacher',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'User is not a teacher'
          }
        }
      }
    },

    404: {
      description: 'Teacher not found',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'No teacher found for the given user'
          }
        }
      }
    },

    500: {
      description: 'Failed to schedule live class',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Failed to schedule live class'
          }
        }
      }
    }
  }
},
    },

    // ══════════════════════════════════════════════════
    // SEARCH  —  GET /api/live-classes/search
    // (registered before /:id to avoid route shadowing)
    // ══════════════════════════════════════════════════

    '/live-classes/search': {
     get: {
  tags: ['Live Classes'],
  summary: 'Search live classes by title or subject',
  description: 'Returns matching live classes for the logged-in teacher filtered by title or subject name. Use `type=upcoming` for scheduled classes and `type=past` for completed classes.',
  parameters: [
    {
      name: 'q',
      in: 'query',
      required: true,
      description: 'Search keyword — matches against title or subject name',
      schema: {
        type: 'string',
        example: 'Maths'
      },
    },
    {
      name: 'type',
      in: 'query',
      required: true,
      description: 'Filter by session type — `upcoming` returns scheduled classes, `past` returns completed classes',
      schema: {
        type: 'string',
        enum: ['upcoming', 'past'],
        example: 'upcoming'
      },
    },
  ],

  responses: {
    200: {
      description: 'Search results fetched successfully',
      content: {
        'application/json': {
          example: {
            success: true,
            query: 'Maths',
            count: 2,
            data: [
              {
                class_id: 34,
                title: 'Maths fast-track',
                status: 'scheduled',
                room_id: 'live_1774504461146',
                scheduled_start_time: '2026-03-26T13:00:00.000Z',
                scheduled_end_time: '2026-03-26T14:00:00.000Z',
                duration_minutes: 60,
                subject_name: 'Mathematics',
                course_name: 'Maths Crash course grade 10',
              },
              {
                class_id: 35,
                title: 'Linear Equations',
                status: 'scheduled',
                room_id: 'live_1774508265165',
                scheduled_start_time: '2026-03-27T07:00:00.000Z',
                scheduled_end_time: '2026-03-27T07:30:00.000Z',
                duration_minutes: 30,
                subject_name: 'Mathematics',
                course_name: 'Maths Crash course grade 10',
              },
            ],
          },
        },
      },
    },

    400: {
      description: 'Missing or invalid parameters',
      content: {
        'application/json': {
          examples: {
            missingQuery: {
              summary: 'Missing search query',
              value: {
                success: false,
                message: "Search query 'q' is required"
              },
            },
            missingType: {
              summary: 'Missing type param',
              value: {
                success: false,
                message: "Query param 'type' must be 'upcoming' or 'past'"
              },
            },
            invalidType: {
              summary: 'Invalid type value',
              value: {
                success: false,
                message: "Query param 'type' must be 'upcoming' or 'past'"
              },
            },
          },
        },
      },
    },

    401: {
      description: 'Unauthorized — missing or invalid token',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Unauthorized'
          },
        },
      },
    },

    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Failed to search classes'
          },
        },
      },
    },
  },
},
    },

    // ══════════════════════════════════════════════════
    // SINGLE CLASS  —  GET|PUT|DELETE /api/live-classes/:id
    // ══════════════════════════════════════════════════

    '/live-classes/{id}': {
      get: {
  tags: ['Live Classes'],
  summary: 'Get details of a specific live class',
  description: 'Returns full details of a live class for the logged-in teacher.',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer', example: 10 },
      description: 'Live class ID'
    }
  ],

  responses: {
    200: {
      description: 'Live class details fetched successfully',
      content: {
        'application/json': {
          example: {
            success: true,
            message: "Live Class Details fetched Successfully",
            data: {
              class_id: 10,
              title: 'Physics - Laws of Motion',
              status: 'scheduled',
              room_id: 'room_abc123',
              scheduled_start_time: '2025-03-15T10:00:00Z',
              scheduled_end_time: '2025-03-15T11:00:00Z',
              duration_minutes: 60,
              subject_name: 'Physics',
              course_name: '11th Grade Science'
            }
          }
        }
      }
    },

    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          example: { success: false, message: 'class id is required' }
        }
      }
    },

    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          example: { success: false, message: 'Unauthorized' }
        }
      }
    },

    404: {
      description: 'Not found or access denied',
      content: {
        'application/json': {
          example: { success: false, message: 'Live class not found or access denied' }
        }
      }
    },

    500: {
      description: 'Failed to fetch class details',
      content: {
        'application/json': {
          example: { success: false, message: 'Failed to fetch class details' }
        }
      }
    }
  }
},

     put: {
  tags: ['Live Classes'],
  summary: 'Update a live class',
  description: 'Updates an existing live class for the logged-in teacher. All fields are optional.',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer', example: 10 },
      description: 'Live class ID'
    }
  ],

  requestBody: {
    required: true,
    content: {
      'application/json': {
        example: {
          title: 'Physics - Updated Title',
          scheduled_start_time: '2025-03-20T10:00:00Z',
          scheduled_end_time: '2025-03-20T11:30:00Z',
          duration_minutes: 90
        }
      }
    }
  },

  responses: {
    200: {
      description: 'Live class updated successfully',
      content: {
        'application/json': {
          example: { success: true, message: 'Live class updated successfully' }
        }
      }
    },

    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          examples: {
            missingId: {
              value: { success: false, message: 'class id is required' }
            },
            invalidTime: {
              value: { success: false, message: 'End time must be after start time' }
            }
          }
        }
      }
    },

    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          example: { success: false, message: 'Unauthorized' }
        }
      }
    },

    404: {
      description: 'Not found or access denied',
      content: {
        'application/json': {
          example: { success: false, message: 'Live class not found or access denied' }
        }
      }
    },

    500: {
      description: 'Failed to update live class',
      content: {
        'application/json': {
          example: { success: false, message: 'Failed to update live class' }
        }
      }
    }
  }
},

     delete: {
  tags: ['Live Classes'],
  summary: 'Delete a live class',
  description: 'Soft deletes a live class for the logged-in teacher.',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer', example: 10 },
      description: 'Live class ID'
    }
  ],

  responses: {
    200: {
      description: 'Live class deleted successfully',
      content: {
        'application/json': {
          example: { success: true, message: 'Live class deleted successfully' }
        }
      }
    },

    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          example: { success: false, message: 'class id is required' }
        }
      }
    },

    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          example: { success: false, message: 'Unauthorized' }
        }
      }
    },

    404: {
      description: 'Not found / already deleted / access denied',
      content: {
        'application/json': {
          example: {
            success: false,
            message: 'Live class not found, already deleted, or access denied'
          }
        }
      }
    },

    500: {
      description: 'Failed to delete live class',
      content: {
        'application/json': {
          example: { success: false, message: 'Failed to delete live class' }
        }
      }
    }
  }
},
    },

    "/live-classes/courses": {
  get: {
    tags: ["Live Classes"],
    summary: "Get teacher courses",
    description: "Fetch all courses assigned to the logged-in teacher using JWT token.",
    responses: {
      200: {
        description: "Courses fetched successfully",
        content: {
          "application/json": {
            example: {
              success: true,
              message: "Courses fetched Successfully",
              data: [
                {
                  course_id: 5,
                  course_name: "Class 10 Science"
                },
                {
                  course_id: 6,
                  course_name: "Class 9 Maths"
                }
              ]
            }
          }
        }
      },

      403: {
        description: "User is not a teacher",
        content: {
          "application/json": {
            example: {
              success: false,
              message: "User is not a teacher"
            }
          }
        }
      },

      500: {
        description: "Failed to fetch courses",
        content: {
          "application/json": {
            example: {
              success: false,
              message: "Failed to fetch courses"
            }
          }
        }
      }
    }
  }
},
"/live-classes/courses/{course_id}/subjects": {
 get: {
  tags: ["Live Classes"],
  summary: "Get subjects by course",
  description: "Fetch subjects for a selected course for the logged-in teacher. Used for subject dropdown.",
  parameters: [
    {
      name: "course_id",
      in: "path",
      required: true,
      description: "ID of the course",
      schema: {
        type: "integer",
        example: 5
      }
    }
  ],

  responses: {
    200: {
      description: "Subjects fetched successfully",
      content: {
        "application/json": {
          examples: {
            success: {
              summary: "Subjects found",
              value: {
                success: true,
                data: [
                  {
                    subject_id: 2,
                    subject_name: "Physics"
                  },
                  {
                    subject_id: 3,
                    subject_name: "Chemistry"
                  }
                ]
              }
            },
            empty: {
              summary: "No subjects found",
              value: {
                success: true,
                data: [],
                message: "No subjects found"
              }
            }
          }
        }
      }
    },

    400: {
      description: "Invalid request parameters",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "course_id is required"
          }
        }
      }
    },

   
    401: {
      description: "Unauthorized (Missing or invalid token)",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "Unauthorized"
          }
        }
      }
    },

    500: {
      description: "Failed to fetch subjects",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "Failed to fetch subjects"
          }
        }
      }
    }
  }
},
},

"/live-classes/subjects/{subject_id}/modules": {
  get: {
  tags: ["Live Classes"],
  summary: "Get modules by subject",
  description: "Fetch modules for a selected subject for the logged-in teacher. Used for module dropdown.",
  parameters: [
    {
      name: "subject_id",
      in: "path",
      required: true,
      description: "ID of the subject",
      schema: {
        type: "integer",
        example: 2
      }
    }
  ],

  responses: {
    200: {
      description: "Modules fetched successfully",
      content: {
        "application/json": {
          examples: {
            success: {
              summary: "Modules found",
              value: {
                success: true,
                data: [
                  {
                    module_id: 10,
                    module_name: "Kinematics"
                  },
                  {
                    module_id: 11,
                    module_name: "Dynamics"
                  }
                ]
              }
            },
            empty: {
              summary: "No modules found",
              value: {
                success: true,
                data: [],
                message: "No modules found"
              }
            }
          }
        }
      }
    },

    
    400: {
      description: "Invalid request parameters",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "subject_id is required"
          }
        }
      }
    },

   
    401: {
      description: "Unauthorized (Missing or invalid token)",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "Unauthorized"
          }
        }
      }
    },

    500: {
      description: "Failed to fetch modules",
      content: {
        "application/json": {
          example: {
            success: false,
            message: "Failed to fetch modules"
          }
        }
      }
    }
  }
},
},
// ─── Start Class ─────────────────────────────────────────────────────────
'/live-classes/{id}/start': {
  post: {
    tags: ['Live Classes'],
    summary: 'Start a scheduled live class',
    description: 'Teacher starts a scheduled class, transitioning its status to "live".',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Class started successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Class started',
              data: {
                class_id: 12,
                room_id: 'live_1719000000000',
                status: 'live',
              },
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:     { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              unauthorized:  { value: { success: false, message: 'UNAUTHORIZED' } },
              already_ended: { value: { success: false, message: 'CLASS_ALREADY_COMPLETED' } },
              cancelled:     { value: { success: false, message: 'CLASS_CANCELLED' } },
            },
          },
        },
      },
    },
  },
},

// ─── Resume Class ────────────────────────────────────────────────────────
'/live-classes/{id}/resume': {
  post: {
    tags: ['Live Classes'],
    summary: 'Resume a paused live class',
    description: 'Teacher resumes a class that was previously paused, setting status back to "live".',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Class resumed successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Class resumed',
              data: {
                class_id: 12,
                room_id: 'live_1719000000000',
                status: 'live',
              },
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:     { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              unauthorized:  { value: { success: false, message: 'UNAUTHORIZED' } },
              already_ended: { value: { success: false, message: 'CLASS_ALREADY_COMPLETED' } },
              cancelled:     { value: { success: false, message: 'CLASS_CANCELLED' } },
            },
          },
        },
      },
    },
  },
},

// ─── Generate Teacher Broadcast Token ────────────────────────────────────
'/live-classes/{id}/broadcast-token': {
  post: {
    tags: ['Live Classes'],
    summary: 'Generate ZEGO broadcast token for teacher',
    description: 'Generates a ZEGO Host token for the teacher to start broadcasting in the room.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Broadcast token generated successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Broadcast token generated',
              data: {
                app_id: 1234567890,
                token: 'zegotoken_xxxxxxx',
                room_id: 'live_1719000000000',
                user_id: '42',
                user_name: 'Jane Doe',
                role: 'Host',
                class_id: 12,
              },
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:    { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              unauthorized: { value: { success: false, message: 'UNAUTHORIZED' } },
              no_room:      { value: { success: false, message: 'ROOM_ID_NOT_FOUND' } },
            },
          },
        },
      },
    },
  },
},

// ─── End Class ───────────────────────────────────────────────────────────
'/live-classes/{id}/end': {
  post: {
    tags: ['Live Classes'],
    summary: 'End a live class',
    description: 'Teacher ends an active class, transitioning its status to "completed".',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Class ended successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Class ended',
              data: null,
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:     { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              unauthorized:  { value: { success: false, message: 'UNAUTHORIZED' } },
              already_ended: { value: { success: false, message: 'CLASS_ALREADY_COMPLETED' } },
              cancelled:     { value: { success: false, message: 'CLASS_CANCELLED' } },
            },
          },
        },
      },
    },
  },
},

// ─── Cancel Class ────────────────────────────────────────────────────────
'/live-classes/{id}/cancel': {
  post: {
    tags: ['Live Classes'],
    summary: 'Cancel a live class',
    description: 'Teacher cancels a scheduled or live class, transitioning its status to "cancelled".',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Class cancelled successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Class cancelled',
              data: null,
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:    { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              unauthorized: { value: { success: false, message: 'UNAUTHORIZED' } },
            },
          },
        },
      },
    },
  },
},

// ─── Join Class (Student) ─────────────────────────────────────────────────
'/live-classes/{id}/join': {
  post: {
    tags: ['Live Classes - Student'],
    summary: 'Student joins a live class',
    description: 'Records attendance for the student and returns a ZEGO Audience token to enter the room. Class must be in "live" status.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Joined class successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Joined class',
              data: {
                room_id: 'live_1719000000000',
                student_id: 7,
                zego: {
                  app_id: 1234567890,
                  token: 'zegotoken_xxxxxxx',
                  room_id: 'live_1719000000000',
                  user_id: '99',
                  user_name: 'John Student',
                  role: 'Audience',
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              not_found:       { value: { success: false, message: 'CLASS_NOT_FOUND' } },
              not_live:        { value: { success: false, message: 'CLASS_NOT_LIVE' } },
              student_missing: { value: { success: false, message: 'STUDENT_NOT_FOUND' } },
            },
          },
        },
      },
    },
  },
},

// ─── Leave Class (Student) ────────────────────────────────────────────────
'/live-classes/{id}/leave': {
  post: {
    tags: ['Live Classes - Student'],
    summary: 'Student leaves a live class',
    description: 'Records the leave time for the student in the attendance table.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Left class successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Left class',
              data: null,
            },
          },
        },
      },
      400: {
        description: 'Business rule violation',
        content: {
          'application/json': {
            examples: {
              student_missing: { value: { success: false, message: 'STUDENT_NOT_FOUND' } },
            },
          },
        },
      },
    },
  },
},

// ─── Get Attendance ───────────────────────────────────────────────────────
'/live-classes/{id}/attendance': {
  get: {
    tags: ['Live Classes'],
    summary: 'Get attendance for a live class',
    description: 'Returns the full attendance list for a given class, including join time, leave time, and duration for each student.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', example: 12 },
        description: 'Live class ID',
      },
    ],
    responses: {
      200: {
        description: 'Attendance fetched successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              message: 'Attendance fetched',
              data: [
                {
                  student_id: 7,
                  student_name: 'John Student',
                  joined_at: '2024-07-15T10:05:00.000Z',
                  left_at: '2024-07-15T11:00:00.000Z',
                  duration_minutes: 55,
                },
                {
                  student_id: 12,
                  student_name: 'Priya Sharma',
                  joined_at: '2024-07-15T10:08:00.000Z',
                  left_at: null,
                  duration_minutes: null,
                },
              ],
            },
          },
        },
      },
      400: {
        description: 'Failed to fetch attendance',
        content: {
          'application/json': {
            example: { success: false, message: 'Some error message' },
          },
        },
      },
    },
  },
},

// ─── Student Classes (Upcoming / Past) ───────────────────────────────────
'/live-classes/student/classes': {
  get: {
    tags: ['Live Classes - Student'],
    summary: 'Get student upcoming or past classes',
    description: 'Returns a list of upcoming or past live classes for the authenticated student based on the "type" query param.',
    parameters: [
      {
        name: 'type',
        in: 'query',
        required: true,
        schema: {
          type: 'string',
          enum: ['upcoming', 'past'],
        },
        description: 'Filter classes by type — "upcoming" for scheduled, "past" for completed.',
      },
    ],
    responses: {
      200: {
        description: 'Student classes fetched successfully',
        content: {
          'application/json': {
            example: {
              success: true,
              type: 'upcoming',
              data: [
                {
                  class_id: 10,
                  title: 'Introduction to Algebra',
                  subject_name: 'Mathematics',
                  module_name: 'Linear Equations',
                  scheduled_start_time: '2024-07-20T09:00:00.000Z',
                  scheduled_end_time: '2024-07-20T10:00:00.000Z',
                  duration_minutes: 60,
                  status: 'scheduled',
                  teacher_name: 'Jane Doe',
                  room_id: 'live_1719000000001',
                },
              ],
            },
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            example: {
              success: false,
              message: "Query param 'type' is required and must be 'upcoming' or 'past'",
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
            example: { success: false, message: 'Failed to fetch student classes' },
          },
        },
      },
    },
  },
},

// ─── Student Live Now ─────────────────────────────────────────────────────
'/live-classes/student/live-now': {
  get: {
    tags: ['Live Classes - Student'],
    summary: 'Get the currently live class for the student',
    description: 'Returns the single live class currently in progress for the authenticated student. Returns null if no class is live.',
    parameters: [],
    responses: {
      200: {
        description: 'Fetched successfully (null if none is live)',
        content: {
          'application/json': {
            examples: {
              live_class_found: {
                summary: 'A class is currently live',
                value: {
                  success: true,
                  data: {
                    class_id: 10,
                    title: 'Introduction to Algebra',
                    subject_name: 'Mathematics',
                    module_name: 'Linear Equations',
                    scheduled_start_time: '2024-07-20T09:00:00.000Z',
                    scheduled_end_time: '2024-07-20T10:00:00.000Z',
                    duration_minutes: 60,
                    status: 'live',
                    teacher_name: 'Jane Doe',
                    room_id: 'live_1719000000001',
                  },
                },
              },
              no_live_class: {
                summary: 'No class is currently live',
                value: {
                  success: true,
                  data: null,
                },
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
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            example: { success: false, message: 'Failed to fetch ongoing live class' },
          },
        },
      },
    },
  },
},

  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────────────────
  tags: [
    { name: 'Live Classes', description: 'Schedule, manage, and search live classes for teachers' },
    { name: 'Live Classes - Student', description: 'Student-facing endpoints for joining and viewing live classes' },
  ],
};