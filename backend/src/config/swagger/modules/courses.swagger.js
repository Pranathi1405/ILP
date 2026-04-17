export const courseSwagger = {
  tags: [
    {
      name: "Courses",
      description: "Course management and enrollment APIs",
    },
  ],

  paths: {
    // ─────────────────────────────────────────────
    // CREATE COURSE
    // ─────────────────────────────────────────────
    "/courses": {
      post: {
        tags: ["Courses"],
        summary: "Create a new course (Admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCourseRequest" },
              example: {
                courseName: "Node.js Basics",
                courseCode: "NODE101",
                description: "Learn Node.js",
                categoryId: 1,
                isFree: false,
                medium: "english",
                difficultyLevel: "beginner",
                price: 999,
                startDate: "2026-04-01",
                endDate: "2026-06-01",
                isPublished: true
              }
            }
          }
        },
        responses: {
          201: {
            description: "Course created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "New course created",
                  course_id: 12
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" }
        }
      },

      // ─────────────────────────────────────────────
      // GET ALL COURSES
      // ─────────────────────────────────────────────
      get: {
        tags: ["Courses"],
        summary: "Get all courses with filters & pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "integer" } },
          {
            name: "difficulty",
            in: "query",
            schema: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"]
            }
          },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["free", "paid"] }
          }
        ],
        responses: {
          200: {
            description: "Courses fetched",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    pagination: {
                      total: 100,
                      page: 1,
                      limit: 10,
                      totalPages: 10
                    },
                    courses: [
                      {
                        course_id: 1,
                        course_name: "Node.js Basics",
                        price: 999,
                        is_free: 0,
                        basicPrice: 1099,
                        proPrice: 1299
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // COURSE BY ID
    // ─────────────────────────────────────────────
    "/courses/{id}": {
      get: {
        tags: ["Courses"],
        summary: "Get course by ID (includes teachers)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: {
            description: "Course fetched",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    course_id: 1,
                    course_name: "Node.js Basics",
                    price: 999,
                    is_free: 0,

                    basicPrice: 1099,
                    proPrice: 1299,

                    teachers: [
                      {
                        teacher_name: "Ravi Kumar",
                        subject_name: "Backend"
                      }
                    ]
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      patch: {
        tags: ["Courses"],
        summary: "Update course (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCourseRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Updated successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Course updated successfully"
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      delete: {
        tags: ["Courses"],
        summary: "Delete course (Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: {
            description: "Deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Successfully deleted a course"
                }
              }
            }
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      }
    },

    // ─────────────────────────────────────────────
    // ENROLL COURSE
    // ─────────────────────────────────────────────
    "/courses/{id}/enroll": {
      post: {
        tags: ["Courses"],
        summary: "Enroll in FREE course (Student only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: {
            description: "Enrollment success",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Successfully enrolled in course"
                }
              }
            }
          },
          400: {
            description: "Already enrolled / Paid course / Course ended"
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET ENROLLED STUDENTS
    // ─────────────────────────────────────────────
    "/courses/enrolled/students": {
      get: {
        tags: ["Courses"],
        summary: "Get enrolled students (Teacher/Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "course_id",
            in: "query",
            schema: { type: "integer" }
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 }
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 }
          }
        ],
        responses: {
          200: {
            description: "Students fetched",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Enrolled students fetched successfully",
                  data: [
                    {
                      student_id: 1,
                      first_name: "Ravi",
                      last_name: "Kumar",
                      course_id: 1,
                      course_name: "Node.js Basics",
                      average_score: 78.5
                    }
                  ],
                  pagination: {
                    total: 50,
                    page: 1,
                    limit: 10,
                    totalPages: 5
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  components: {
    schemas: {
      CreateCourseRequest: {
        type: "object",
        required: ["courseName", "startDate", "endDate"],
        properties: {
          courseName: { type: "string" },
          courseCode: { type: "string" },
          description: { type: "string" },
          categoryId: { type: "integer" },
          isFree: { type: "boolean" },
          medium: {
            type: "string",
            enum: ["english", "telugu", "hindi"]
          },
          difficultyLevel: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"]
          },
          price: { type: "number" },
          details: { type: "string" },
          thumbnailUrl: { type: "string" },
          prerequisites: { type: "string" },
          learningOutcomes: { type: "string" },
          isPublished: { type: "boolean" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" }
        }
      },

      UpdateCourseRequest: {
        type: "object",
        properties: {
          courseName: { type: "string" },
          description: { type: "string" },
          categoryId: { type: "integer" },
          medium: { type: "string" },
          difficultyLevel: { type: "string" },
          price: { type: "number" },
          isFree: { type: "boolean" },
          prerequisites: { type: "string" },
          learningOutcomes: { type: "string" },
          isPublished: { type: "boolean" },
          courseCode: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" }
        }
      }
    }
  }
};