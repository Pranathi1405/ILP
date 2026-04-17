export const moduleSwagger = {
  tags: [
    {
      name: "Modules",
      description: "Module management APIs (Teacher/Admin controlled)",
    },
  ],

  paths: {
    "/modules": {
      post: {
        tags: ["Modules"],
        summary: "Create a new module (Teacher/Admin only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateModuleRequest" },
              example: {
                subjectId: 1,
                moduleName: "Introduction to Algebra",
                moduleDescription: "Basics of algebra",
                displayOrder: 1
              }
            }
          }
        },
        responses: {
          201: {
            description: "Module created successfully",
            content: {
              "application/json": {
                example: {
                  moduleId: 10
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { description: "Subject not found" }
        }
      },

      get: {
        tags: ["Modules"],
        summary: "Get all modules (search, filter, pagination supported)",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "subjectId", in: "query", schema: { type: "integer" } },
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
          {
            name: "sortBy",
            in: "query",
            schema: {
              type: "string",
              enum: ["created_at", "module_name", "display_order"]
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
            description: "Modules fetched successfully",
            content: {
              "application/json": {
                example: {
                  pagination: {
                    total: 20,
                    page: 1,
                    limit: 10,
                    totalPages: 2
                  },
                  modules: [
                    {
                      module_id: 1,
                      module_name: "Introduction to Algebra",
                      subject_id: 1,
                      display_order: 1,
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

    "/modules/{id}": {
      get: {
        tags: ["Modules"],
        summary: "Get module by ID",
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
            description: "Module fetched successfully",
            content: {
              "application/json": {
                example: {
                  module_id: 1,
                  module_name: "Introduction to Algebra",
                  subject_id: 1,
                  display_order: 1
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      patch: {
        tags: ["Modules"],
        summary: "Update module (Teacher/Admin only)",
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
              schema: { $ref: "#/components/schemas/UpdateModuleRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Module updated successfully",
            content: {
              "application/json": {
                example: {
                  moduleId: 1
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      delete: {
        tags: ["Modules"],
        summary: "Delete module (Teacher/Admin only)",
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
            description: "Module deleted successfully",
            content: {
              "application/json": {
                example: {
                  moduleId: 1,
                  deleted: true
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
    CreateModuleRequest: {
      type: "object",
      required: ["subjectId", "moduleName"],
      properties: {
        subjectId: {
          type: "integer",
          minimum: 1
        },
        moduleName: {
          type: "string",
          maxLength: 255
        },
        moduleDescription: {
          type: "string",
          maxLength: 1000
        },
        displayOrder: {
          type: "integer",
          minimum: 1
        }
      }
    },

    UpdateModuleRequest: {
      type: "object",
      properties: {
        subjectId: {
          type: "integer",
          minimum: 1
        },
        moduleName: {
          type: "string",
          maxLength: 255
        },
        moduleDescription: {
          type: "string",
          maxLength: 1000
        },
        displayOrder: {
          type: "integer",
          minimum: 1
        }
      }
    }
  }
};