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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCourseRequest" },
              example: {
                courseName: "Node.js Basics",
                courseCode: "NODE101",
                description: "Learn Node.js from scratch",
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
            description: "Course created successfully",
            content: {
              "application/json": {
                example: {
                  courseId: 12,
                  basePrice: 999,
                  pricing: [
                    {
                      planId: 1,
                      planName: "Basic",
                      finalPrice: 1099
                    },
                    {
                      planId: 2,
                      planName: "Pro",
                      finalPrice: 1299
                    }
                  ]
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
            schema: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
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
            description: "Courses fetched successfully",
            content: {
              "application/json": {
                example: {
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
                      is_free: false,
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
    },

    // ─────────────────────────────────────────────
    // GET / UPDATE / DELETE COURSE
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
            description: "Course fetched successfully",
            content: {
              "application/json": {
                example: {
                  course_id: 1,
                  course_name: "Node.js Basics",
                  price: 999,
                  is_free: false,

                  // pricing
                  basicPrice: 1099,
                  proPrice: 1299,

                  // ✅ NEW FIELD
                  teachers: [
                    {
                      teacher_name: "Ravi Kumar",
                      email: "ravi@gmail.com"
                    },
                    {
                      teacher_name: "Anita Rao",
                      email: "anita@gmail.com"
                    }
                  ]
                }
              }
            }
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      patch: {
        tags: ["Courses"],
        summary: "Update course (Admin only)",
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
              schema: { $ref: "#/components/schemas/UpdateCourseRequest" },
              example: {
                courseName: "Advanced Node.js",
                price: 1200,
                isFree: false
              }
            }
          }
        },
        responses: {
          200: {
            description: "Course updated successfully",
            content: {
              "application/json": {
                example: {
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
            description: "Course deleted successfully",
            content: {
              "application/json": {
                example: {
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
        summary: "Enroll in a course (Student only, FREE courses only)",
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
            description: "Enrollment successful",
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
            description: "Validation / business rule error (paid course, already enrolled, etc.)"
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      }
    }
  },

  // ─────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────
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
        medium: { type: "string", enum: ["english", "telugu", "hindi"] },
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

    Teacher: {
      type: "object",
      properties: {
        teacher_name: { type: "string" },
        email: { type: "string" }
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
};