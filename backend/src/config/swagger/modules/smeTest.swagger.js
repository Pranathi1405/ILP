/**
 * src/config/swagger/modules/smeTest.swagger.js
 * Swagger docs for SME Test engine (teacher authored tests).
 */

export const smeTestSwagger = {
  tags: [
    {
      name: "SME Tests",
      description: "Teacher-authored tests with QB/manual questions and student attempts",
    },
  ],

  schemas: {
    SmeTestCreateRequest: {
      type: "object",
      required: ["exam_code", "subject_id", "question_source", "scheduled_start", "scheduled_end"],
      properties: {
        exam_code: { type: "string", example: "JEE-MAIN" },
        subject_id: { type: "integer", example: 259 },
        question_source: { type: "string", enum: ["qb", "manual"], example: "qb" },
        scheduled_start: { type: "string", format: "date-time", example: "2026-04-10T09:00:00Z" },
        scheduled_end: { type: "string", format: "date-time", example: "2026-04-10T11:00:00Z" },
      },
    },

    SmeTestAddQbQuestionRequest: {
      type: "object",
      required: ["section_id", "question_ids"],
      properties: {
        section_id: { type: "integer", example: 12 },
        question_ids: {
          type: "array",
          items: { type: "integer" },
          example: [101, 102, 103],
        },
      },
    },

    SmeTestAddManualQuestionRequest: {
      type: "object",
      required: ["section_id", "question_text", "question_type", "difficulty"],
      properties: {
        section_id: { type: "integer", example: 12 },
        question_text: { type: "string", example: "State Ohm's law." },
        question_type: {
          type: "string",
          enum: ["mcq", "mcq_multi", "nat", "numerical", "match_list"],
          example: "mcq",
        },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"], example: "easy" },
        options: {
          type: "array",
          description: "Required for non-NAT types",
          items: {
            type: "object",
            properties: {
              option_text: { type: "string", example: "V = I/R" },
              is_correct: { type: "boolean", example: true },
            },
          },
        },
        correct_answer: { type: "string", nullable: true, example: "42" },
        explanation: { type: "string", nullable: true, example: "From V = IR" },
      },
    },

    SmeTestSubmitAnswersRequest: {
      type: "object",
      required: ["answers"],
      properties: {
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_id: { type: "integer", example: 501 },
              selected_option_id: { type: "integer", nullable: true, example: 9001 },
              selected_option_ids: { type: "array", items: { type: "integer" }, example: [9002, 9003] },
              numerical_answer: { type: "number", nullable: true, example: 3.14 },
            },
          },
        },
      },
    },
  },

  paths: {
    "/sme-tests/teacher/dealing-subjects": {
      get: {
        tags: ["SME Tests"],
        summary: "Teacher's assigned subjects and exams",
        responses: {
          200: { description: "Subjects and exams fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { description: "No active subjects assigned" },
        },
      },
    },

    "/sme-tests/exams": {
      get: {
        tags: ["SME Tests"],
        summary: "List available exams for SME tests",
        responses: {
          200: { description: "Exams fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/sme-tests/exams/{examCode}/subjects": {
      get: {
        tags: ["SME Tests"],
        summary: "Get subjects for an exam code",
        parameters: [
          { name: "examCode", in: "path", required: true, schema: { type: "string" }, example: "JEE-MAIN" },
        ],
        responses: {
          200: { description: "Subjects fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/chapters": {
      get: {
        tags: ["SME Tests"],
        summary: "List chapters for a subject",
        parameters: [
          { name: "subjectId", in: "query", required: true, schema: { type: "integer" }, example: 259 },
        ],
        responses: {
          200: { description: "Chapters fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/sme-tests": {
      post: {
        tags: ["SME Tests"],
        summary: "Create a new SME test (teacher)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SmeTestCreateRequest" },
              example: {
                exam_code: "JEE-MAIN",
                subject_id: 259,
                question_source: "qb",
                scheduled_start: "2026-04-10T09:00:00Z",
                scheduled_end: "2026-04-10T11:00:00Z",
              },
            },
          },
        },
        responses: {
          201: { description: "SME test created successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },

      get: {
        tags: ["SME Tests"],
        summary: "List tests (teacher: own tests, student: published tests)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: { description: "Tests fetched successfully" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/sme-tests/{id}": {
      get: {
        tags: ["SME Tests"],
        summary: "Get SME test by ID (teacher/student/admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        responses: {
          200: { description: "Test fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/available-questions": {
      get: {
        tags: ["SME Tests"],
        summary: "Available QB questions for a section (teacher)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 },
          { name: "section_id", in: "query", required: true, schema: { type: "integer" }, example: 12 },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["easy", "medium", "hard"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Available questions fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/questions": {
      post: {
        tags: ["SME Tests"],
        summary: "Add questions to a test (teacher)",
        description: "For QB tests use question_ids. For manual tests supply full question payload.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/SmeTestAddQbQuestionRequest" },
                  { $ref: "#/components/schemas/SmeTestAddManualQuestionRequest" },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: "Question(s) added successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/questions/{qid}": {
      delete: {
        tags: ["SME Tests"],
        summary: "Remove a question from test (teacher)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 },
          { name: "qid", in: "path", required: true, schema: { type: "integer" }, example: 901 },
        ],
        responses: {
          200: { description: "Question removed successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/publish": {
      patch: {
        tags: ["SME Tests"],
        summary: "Publish test (teacher)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        responses: {
          200: { description: "Test published successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/start": {
      post: {
        tags: ["SME Tests"],
        summary: "Start an attempt (student)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        responses: {
          200: { description: "Attempt started successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/submit": {
      post: {
        tags: ["SME Tests"],
        summary: "Submit answers (student)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SmeTestSubmitAnswersRequest" },
            },
          },
        },
        responses: {
          200: { description: "Test submitted successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/attempts/{attemptId}/results": {
      get: {
        tags: ["SME Tests"],
        summary: "Get attempt results (student)",
        parameters: [
          { name: "attemptId", in: "path", required: true, schema: { type: "integer" }, example: 301 },
        ],
        responses: {
          200: { description: "Results fetched successfully" },
          400: { description: "Test not submitted or still in progress" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    "/sme-tests/{id}/analytics": {
      get: {
        tags: ["SME Tests"],
        summary: "Teacher analytics for a test",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, example: 45 }],
        responses: {
          200: { description: "Analytics fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
};
