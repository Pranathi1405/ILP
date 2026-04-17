export const userCourseSwagger = {
  tags: [
    {
      name: "User Courses",
      description: "Student and Teacher course related APIs",
    },
  ],

  paths: {

    // ─────────────────────────────────────────────
    // GET ENROLLED COURSES (STUDENT)
    // ─────────────────────────────────────────────
    "/userCourse/student/enrolled-courses": {
      get: {
        tags: ["User Courses"],
        summary: "Get enrolled courses (Student only)",
        responses: {
          200: {
            description: "Enrolled courses fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Enrolled courses fetched successfully",
                  data: [
                    {
                      course_id: 1,
                      course_name: "Physics for JEE",
                      description: "Complete physics course",
                      thumbnail_url: "https://example.com/physics.png",
                      enrollment_date: "2026-04-01T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: {
            description: "Only students can access enrolled courses",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message: "Only students can access enrolled courses"
                }
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET SUBJECTS FOR STUDENT COURSE
    // ─────────────────────────────────────────────
    "/userCourse/student/courses/{courseId}/subjects": {
      get: {
        tags: ["User Courses"],
        summary: "Get subjects for a course (Student only)",
        parameters: [
          {
            name: "courseId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Course ID"
          }
        ],
        responses: {
          200: {
            description: "Subjects fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Subjects fetched successfully",
                  data: [
                    {
                      subject_id: 10,
                      teacher_id: 5,
                      subject_name: "Mathematics",
                      description: "Advanced math topics",
                      display_order: 1,
                      no_of_modules: 8,
                      is_active: 1,
                      created_at: "2026-04-01T10:00:00Z",
                      updated_at: "2026-04-02T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: {
            description: "No subjects found or student not enrolled",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message: "No subjects found or student not enrolled in this course"
                }
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET MODULES FOR STUDENT SUBJECT
    // ─────────────────────────────────────────────
    "/userCourse/student/subjects/{subjectId}/modules": {
      get: {
        tags: ["User Courses"],
        summary: "Get modules for a subject (Student only)",
        parameters: [
          {
            name: "subjectId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Subject ID"
          }
        ],
        responses: {
          200: {
            description: "Modules fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Modules fetched successfully",
                  data: [
                    {
                      module_id: 101,
                      module_name: "Limits",
                      description: "Introduction to limits",
                      display_order: 1,
                      no_of_lectures: 8,
                      is_published: 1,
                      created_at: "2026-04-01T10:00:00Z",
                      updated_at: "2026-04-02T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET TEACHER COURSES
    // ─────────────────────────────────────────────
    "/userCourse/teacher/courses": {
      get: {
        tags: ["User Courses"],
        summary: "Get courses handled by teacher",
        parameters: [
          {
            name: "categoryId",
            in: "query",
            required: false,
            schema: { type: "integer" },
            description: "Optional category filter"
          }
        ],
        responses: {
          200: {
            description: "Teacher courses fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Teacher's courses fetched successfully",
                  data: [
                    {
                      course_id: 3,
                      course_name: "JEE Advanced",
                      course_code: "JEE-ADV",
                      description: "Advanced math topics",
                      thumbnail_url: "https://example.com/math.png",
                      is_free: false,
                      price: 4999,
                      is_published: 1,
                      difficulty_level: "Advanced",
                      created_at: "2026-04-01T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: {
            description: "Teacher not found",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message: "Teacher not found for this user"
                }
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET TEACHER SUBJECTS BY COURSE
    // ─────────────────────────────────────────────
    "/userCourse/teacher/courses/{courseId}/subjects": {
      get: {
        tags: ["User Courses"],
        summary: "Get teacher subjects under a course",
        parameters: [
          {
            name: "courseId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Course ID"
          }
        ],
        responses: {
          200: {
            description: "Subjects fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  count: 2,
                  data: [
                    {
                      subject_id: 10,
                      subject_name: "Mathematics",
                      description: "Advanced math topics",
                      display_order: 1,
                      no_of_modules: 5,
                      created_at: "2026-04-01T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET TEACHER MODULES BY SUBJECT
    // ─────────────────────────────────────────────
    "/userCourse/teacher/subjects/{subjectId}/modules": {
      get: {
        tags: ["User Courses"],
        summary: "Get modules under a subject for teacher",
        parameters: [
          {
            name: "subjectId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Subject ID"
          }
        ],
        responses: {
          200: {
            description: "Modules fetched successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  count: 3,
                  data: [
                    {
                      module_id: 1,
                      subject_id: 10,
                      module_name: "Limits",
                      description: "Introduction to limits",
                      display_order: 1,
                      no_of_lectures: 8,
                      is_published: 1,
                      created_at: "2026-04-01T10:00:00Z",
                      updated_at: "2026-04-02T10:00:00Z"
                    }
                  ]
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" }
        }
      }
    }

  }
};