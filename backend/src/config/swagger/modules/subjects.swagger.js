export const subjectSwagger = {
  tags: [
    {
      name: "Subjects",
      description: "Subject management APIs (Admin controlled where required)",
    },
  ],

  paths: {
    "/subjects": {
      post: {
        tags: ["Subjects"],
        summary: "Create a new subject (Admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSubjectRequest" },
              example: {
                courseId: 3,
                teacherId: 7,
                title: "Mathematics",
                description: "Basic math concepts",
                displayOrder: 2
              }
            }
          }
        },
        responses: {
          201: {
            description: "Subject created successfully",
            content: {
              "application/json": {
                example: {
                  subjectId: 12,
                  message: "Subject created successfully"
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { description: "Course or Teacher not found" }
        }
      },

      get: {
        tags: ["Subjects"],
        summary: "Get all subjects (search, filter, pagination supported)",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "courseId", in: "query", schema: { type: "integer" } },
          { name: "teacherId", in: "query", schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
          {
            name: "sortBy",
            in: "query",
            schema: {
              type: "string",
              enum: ["created_at", "subject_name"]
            }
          },
          {
            name: "order",
            in: "query",
            schema: {
              type: "string",
              enum: ["ASC", "DESC"]
            }
          }
        ],
        responses: {
          200: {
            description: "Subjects fetched successfully",
            content: {
              "application/json": {
                example: {
                  pagination: {
                    total: 50,
                    page: 1,
                    limit: 10,
                    totalPages: 5
                  },
                  subjects: [
                    {
                      subject_id: 1,
                      subject_name: "Mathematics",
                      course_id: 3,
                      teacher_id: 7,
                      no_of_modules: 5,
                      created_at: "2025-03-01T10:00:00Z"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },

    "/subjects/{id}": {
      get: {
        tags: ["Subjects"],
        summary: "Get subject by ID",
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
            description: "Subject fetched successfully",
            content: {
              "application/json": {
                example: {
                  subject_id: 12,
                  subject_name: "Physics",
                  course_id: 3,
                  teacher_id: 7
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      patch: {
        tags: ["Subjects"],
        summary: "Update subject (Admin only)",
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
              schema: { $ref: "#/components/schemas/UpdateSubjectRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Subject updated successfully",
            content: {
              "application/json": {
                example: {
                  subjectId: 12
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      delete: {
        tags: ["Subjects"],
        summary: "Delete subject (Admin only)",
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
            description: "Subject deleted successfully",
            content: {
              "application/json": {
                example: {
                  subjectId: 12
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      }
    }
  },

  schemas: {
    CreateSubjectRequest: {
      type: "object",
      required: ["courseId", "teacherId", "title"],
      properties: {
        courseId: {
          type: "integer",
          minimum: 1
        },
        teacherId: {
          type: "integer",
          minimum: 1
        },
        title: {
          type: "string",
          minLength: 1
        },
        description: {
          type: "string"
        },
        displayOrder: {
          type: "integer",
          minimum: 1
        }
      }
    },

    UpdateSubjectRequest: {
      type: "object",
      properties: {
        subjectName: {
          type: "string",
          minLength: 1
        },
        courseId: {
          type: "integer",
          minimum: 1
        },
        teacherId: {
          type: "integer",
          minimum: 1
        },
        description: {
          type: "string"
        },
        displayOrder: {
          type: "integer",
          minimum: 1
        }
      }
    }
  }
};