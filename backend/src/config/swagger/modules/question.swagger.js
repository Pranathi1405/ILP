/**
 * src/config/swagger/modules/question.swagger.js
 * Swagger docs for Question Bank APIs.
 */

export const questionSwagger = {
  tags: [
    {
      name: "Question Bank",
      description: "Create and manage questions for subjects and modules",
    },
  ],

  schemas: {
    QuestionOption: {
      type: "object",
      properties: {
        option_text: { type: "string", example: "Velocity remains constant" },
        option_image_url: { type: "string", nullable: true, example: null },
        is_correct: { type: "boolean", example: true },
      },
    },

    AddQuestionRequest: {
      type: "object",
      required: [
        "subject_id",
        "module_id",
        "question_type",
        "difficulty",
        "question_text",
        "marks",
      ],
      properties: {
        subject_id: { type: "integer", example: 259 },
        module_id: { type: "integer", example: 784 },
        question_type: {
          type: "string",
          enum: ["mcq", "mcq_multi", "numerical", "match_list"],
          example: "mcq",
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "hard"],
          example: "medium",
        },
        question_text: { type: "string", example: "What is Newton's second law?" },
        question_image_url: { type: "string", nullable: true, example: null },
        image_position: {
          type: "string",
          enum: ["above", "below"],
          default: "above",
        },
        marks: { type: "number", example: 4 },
        correct_answer: {
          type: "string",
          nullable: true,
          example: "4.9",
          description: "Required for numerical questions",
        },
        explanation: { type: "string", nullable: true, example: "F = m * a" },
        hints: { type: "string", nullable: true, example: "Think of acceleration" },
        ideal_time_mins: { type: "number", nullable: true, example: 1.5 },
        options: {
          type: "array",
          items: { $ref: "#/components/schemas/QuestionOption" },
          description: "Required for MCQ/MCQ multi/match_list",
        },
      },
    },

    ParagraphQuestionRequest: {
      type: "object",
      required: ["subject_id", "module_id", "difficulty", "marks", "paragraph", "questions"],
      properties: {
        subject_id: { type: "integer", example: 259 },
        module_id: { type: "integer", example: 784 },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"], example: "hard" },
        marks: { type: "number", example: 4 },
        ideal_time_mins: { type: "number", nullable: true, example: 6 },
        paragraph: {
          type: "object",
          required: ["paragraph_text"],
          properties: {
            paragraph_text: { type: "string", example: "Passage about thermodynamics..." },
            paragraph_image_url: { type: "string", nullable: true, example: null },
          },
        },
        questions: {
          type: "array",
          description: "At least 2 sub-questions required",
          items: {
            type: "object",
            required: ["question_text", "question_type"],
            properties: {
              question_text: { type: "string" },
              question_type: {
                type: "string",
                enum: ["mcq", "mcq_multi", "numerical", "match_list"],
              },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"], example: "hard" },
              correct_answer: { type: "string", nullable: true },
              explanation: { type: "string", nullable: true },
              hints: { type: "string", nullable: true },
              options: { type: "array", items: { $ref: "#/components/schemas/QuestionOption" } },
            },
          },
        },
      },
    },

    BulkQuestionsRequest: {
      type: "array",
      maxItems: 50,
      items: {
        anyOf: [
          { $ref: "#/components/schemas/AddQuestionRequest" },
          { $ref: "#/components/schemas/ParagraphQuestionRequest" },
        ],
      },
    },
  },

  paths: {
    "/questions": {
      post: {
        tags: ["Question Bank"],
        summary: "Add a single question",
        description: "Teacher-only. Supports MCQ, MCQ multi, numerical, and match list.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddQuestionRequest" },
              example: {
                subject_id: 259,
                module_id: 784,
                question_type: "mcq",
                difficulty: "medium",
                question_text: "Acceleration for 10 N force on 2 kg mass?",
                marks: 4,
                options: [
                  { option_text: "2 m/s^2", is_correct: false },
                  { option_text: "5 m/s^2", is_correct: true },
                  { option_text: "10 m/s^2", is_correct: false },
                  { option_text: "20 m/s^2", is_correct: false },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: "Question added successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },

      get: {
        tags: ["Question Bank"],
        summary: "List questions by subject",
        parameters: [
          { name: "subjectId", in: "query", required: true, schema: { type: "integer" }, example: 259 },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["easy", "medium", "hard"] } },
          { name: "questionType", in: "query", schema: { type: "string", enum: ["mcq", "mcq_multi", "numerical", "match_list"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: { description: "Questions fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    "/questions/paragraph": {
      post: {
        tags: ["Question Bank"],
        summary: "Add a paragraph-based question set",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ParagraphQuestionRequest" },
              example: {
                subject_id: 259,
                module_id: 784,
                difficulty: "hard",
                marks: 4,
                ideal_time_mins: 6,
                paragraph: { paragraph_text: "Passage about climate change." },
                questions: [
                  {
                    question_text: "Which gas is primary driver?",
                    question_type: "mcq",
                    difficulty: "medium",
                    options: [
                      { option_text: "CO2", is_correct: true },
                      { option_text: "O2", is_correct: false },
                      { option_text: "N2", is_correct: false },
                      { option_text: "He", is_correct: false },
                    ],
                  },
                  {
                    question_text: "Expected temp rise by 2050 (°C)?",
                    question_type: "numerical",
                    difficulty: "hard",
                    correct_answer: "1.5",
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: "Paragraph questions added successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    "/questions/bulk": {
      post: {
        tags: ["Question Bank"],
        summary: "Bulk add up to 50 questions",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkQuestionsRequest" },
            },
          },
        },
        responses: {
          201: { description: "Bulk upload completed" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    "/questions/{id}": {
      get: {
        tags: ["Question Bank"],
        summary: "Get question by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Question fetched successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },

      patch: {
        tags: ["Question Bank"],
        summary: "Update a question (owner teachers only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  question_image_url: { type: "string" },
                  image_position: { type: "string", enum: ["above", "below"] },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  hints: { type: "string" },
                  ideal_time_mins: { type: "number" },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  options: { type: "array", items: { $ref: "#/components/schemas/QuestionOption" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Question updated successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },

      delete: {
        tags: ["Question Bank"],
        summary: "Delete question (owner teachers only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Question deleted successfully" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
};
