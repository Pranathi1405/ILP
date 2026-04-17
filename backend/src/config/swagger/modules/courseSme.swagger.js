/**
 * src/config/swagger/modules/courseSme.swagger.js
 * Swagger docs for Course-Level SME Test Engine (Admin + Teacher + Student)
 */

export const courseSmeSwagger = {
  tags: [
    {
      name: "Course SME Tests - Admin",
      description: "Admin controls for course-level SME tests",
    },
    {
      name: "Course SME Tests - Teacher",
      description: "Teacher question management & assignment completion",
    },
    {
      name: "Course SME Tests - Student",
      description: "Student test attempts and results",
    },
  ],

  schemas: {
    CreateCourseSmeTestRequest: {
      type: "object",
      required: ["course_id", "title", "scheduled_start", "scheduled_end"],
      properties: {
        course_id: { type: "integer", example: 101 },
        title: { type: "string", example: "Full Length Mock Test - 1" },
        scheduled_start: {
          type: "string",
          format: "date-time",
          example: "2026-04-20T09:00:00Z",
        },
        scheduled_end: {
          type: "string",
          format: "date-time",
          example: "2026-04-20T12:00:00Z",
        },
      },
    },

    AddQuestionRequest: {
      type: "object",
      required: ["question_text", "options", "correct_answer"],
      properties: {
        question_text: { type: "string", example: "What is 2 + 2?" },
        options: {
          type: "array",
          items: { type: "string" },
          example: ["1", "2", "3", "4"],
        },
        correct_answer: { type: "string", example: "4" },
        module_id: { type: "integer", nullable: true, example: 55 },
      },
    },

    ParseDocumentRequest: {
      type: "object",
      required: ["parsed_count", "required_count"],
      properties: {
        parsed_count: { type: "integer", example: 40 },
        required_count: { type: "integer", example: 50 },
      },
    },

    SubmitAnswersRequest: {
      type: "object",
      required: ["answers"],
      properties: {
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_id: { type: "integer", example: 501 },
              selected_option: { type: "string", example: "A" },
            },
          },
        },
      },
    },
  },

  paths: {
    // ───────────────── ADMIN ROUTES ─────────────────
    // Base: /api/admin/sme-tests

    "/admin/sme-tests": {
      post: {
        tags: ["Course SME Tests - Admin"],
        summary: "Create course-level SME test (parent + child + assignments)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCourseSmeTestRequest" },
            },
          },
        },
        responses: {
          201: { description: "Course SME test created successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/admin/sme-tests/{id}/publish": {
      patch: {
        tags: ["Course SME Tests - Admin"],
        summary: "Publish course SME test (fails if assignments incomplete)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 10 },
        ],
        responses: {
          200: { description: "Course SME test published successfully" },
          400: { description: "Assignments incomplete" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/admin/sme-tests/{id}/assignments": {
      get: {
        tags: ["Course SME Tests - Admin"],
        summary: "Get subject assignment statuses",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 10 },
        ],
        responses: {
          200: { description: "Assignments fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    // ───────────────── TEACHER ROUTES ─────────────────
    // Base: /api/teacher/sme-tests

    "/teacher/sme-tests/assigned": {
      get: {
        tags: ["Course SME Tests - Teacher"],
        summary: "Get assigned SME tests for teacher",
        responses: {
          200: { description: "Assigned tests fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/teacher/sme-tests/{id}/questions": {
      post: {
        tags: ["Course SME Tests - Teacher"],
        summary: "Add question + auto completion check",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 21 },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddQuestionRequest" },
            },
          },
        },
        responses: {
          201: { description: "Question added and completion checked" },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },

    "/teacher/sme-tests/{id}/questions/{qid}": {
      delete: {
        tags: ["Course SME Tests - Teacher"],
        summary: "Remove question + re-check completion",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "qid", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Question removed successfully" },
        },
      },
    },

    "/teacher/sme-tests/{id}/parse-document": {
      post: {
        tags: ["Course SME Tests - Teacher"],
        summary: "Handle document parsing result",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ParseDocumentRequest" },
            },
          },
        },
        responses: {
          200: { description: "Parse handled successfully" },
        },
      },
    },

    "/teacher/sme-tests/{id}/completion-status": {
      get: {
        tags: ["Course SME Tests - Teacher"],
        summary: "Get assignment completion status",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Completion status fetched" },
        },
      },
    },

    // ───────────────── STUDENT ROUTES ─────────────────
    // Base: /api/sme-tests

    "/sme-tests/full": {
      get: {
        tags: ["Course SME Tests - Student"],
        summary: "Get all published course SME tests",
        responses: {
          200: { description: "Full SME tests fetched successfully" },
        },
      },
    },

    "/sme-tests/{id}/pattern": {
      get: {
        tags: ["Course SME Tests - Student"],
        summary: "Get test pattern",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Pattern fetched successfully" },
        },
      },
    },

    "/sme-tests/{id}/questions": {
      get: {
        tags: ["Course SME Tests - Student"],
        summary: "Get test questions",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Questions fetched successfully" },
          403: { description: "Test not available" },
        },
      },
    },

    "/sme-tests/{id}/start": {
      post: {
        tags: ["Course SME Tests - Student"],
        summary: "Start attempt",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Attempt started successfully" },
        },
      },
    },

    "/sme-tests/{id}/submit": {
      post: {
        tags: ["Course SME Tests - Student"],
        summary: "Submit test answers",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitAnswersRequest" },
            },
          },
        },
        responses: {
          200: { description: "Test submitted successfully" },
        },
      },
    },

    "/sme-tests/{id}/results": {
      get: {
        tags: ["Course SME Tests - Student"],
        summary: "Get test results with metrics",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Results fetched successfully" },
          400: { description: "Results not yet available" },
        },
      },
    },
  },
};