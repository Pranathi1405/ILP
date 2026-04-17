export const categorySwagger = {
  tags: [
    {
      name: "Categories",
      description: "Category management APIs (Admin controlled, ordered list system)",
    },
  ],

  paths: {
    // ─────────────────────────────────────────────
    // CREATE CATEGORY
    // ─────────────────────────────────────────────
    "/categories": {
      post: {
        tags: ["Categories"],
        summary: "Create a new category (Admin only, auto ordering applied)",
        description: `
- If displayOrder is NOT provided → category will be added at the end
- If displayOrder is provided → existing categories will shift automatically
- displayOrder must be > 0
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoryRequest" },
              example: {
                categoryName: "Programming",
                description: "All programming related courses",
                thumbnail: "https://example.com/image.png",
                displayOrder: 1
              }
            }
          }
        },
        responses: {
          201: {
            description: "Category created successfully",
            content: {
              "application/json": {
                example: {
                  categoryId: 5
                }
              }
            }
          },
          400: {
            description: "Validation error / duplicate category name"
          }
        }
      },

      // ─────────────────────────────────────────────
      // GET ALL CATEGORIES
      // ─────────────────────────────────────────────
      get: {
        tags: ["Categories"],
        summary: "Get all categories (ordered, with optional search)",
        parameters: [
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search categories by name"
          }
        ],
        responses: {
          200: {
            description: "Categories fetched successfully",
            content: {
              "application/json": {
                example: [
                  {
                    category_id: 1,
                    category_name: "Programming",
                    description: "All programming courses",
                    thumbnail: "https://example.com/image.png",
                    display_order: 1
                  }
                ]
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // GET / UPDATE / DELETE BY ID
    // ─────────────────────────────────────────────
    "/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by ID",
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
            description: "Category fetched successfully",
            content: {
              "application/json": {
                example: {
                  category_id: 1,
                  category_name: "Programming",
                  description: "All programming courses",
                  thumbnail: "https://example.com/image.png",
                  display_order: 1
                }
              }
            }
          },
          400: {
            description: "Invalid category ID"
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      // ─────────────────────────────────────────────
      // UPDATE CATEGORY
      // ─────────────────────────────────────────────
      patch: {
        tags: ["Categories"],
        summary: "Update category (Admin only, supports reordering)",
        description: `
- Changing displayOrder will automatically reorder other categories
- Cannot send empty body
- displayOrder must be > 0
        `,
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
              schema: { $ref: "#/components/schemas/UpdateCategoryRequest" },
              example: {
                categoryName: "Advanced Programming",
                displayOrder: 2
              }
            }
          }
        },
        responses: {
          200: {
            description: "Category updated successfully",
            content: {
              "application/json": {
                example: {
                  message: "Category updated successfully"
                }
              }
            }
          },
          400: {
            description: "Validation error / no fields / invalid order"
          },
          404: { $ref: "#/components/responses/NotFound" }
        }
      },

      // ─────────────────────────────────────────────
      // DELETE CATEGORY
      // ─────────────────────────────────────────────
      delete: {
        tags: ["Categories"],
        summary: "Delete category (Admin only, auto reorders list)",
        description: `
- After deletion, all categories below will shift up automatically
        `,
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
            description: "Category deleted successfully",
            content: {
              "application/json": {
                example: {
                  message: "Category deleted successfully"
                }
              }
            }
          },
          400: {
            description: "Invalid category ID"
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
    CreateCategoryRequest: {
      type: "object",
      required: ["categoryName"],
      properties: {
        categoryName: {
          type: "string",
          example: "Programming"
        },
        description: {
          type: "string"
        },
        thumbnail: {
          type: "string"
        },
        displayOrder: {
          type: "number",
          example: 1,
          description: "Must be > 0. If omitted, added at end"
        }
      }
    },

    UpdateCategoryRequest: {
      type: "object",
      properties: {
        categoryName: { type: "string" },
        description: { type: "string" },
        thumbnail: { type: "string" },
        displayOrder: {
          type: "number",
          description: "Reorders category list dynamically"
        }
      }
    }
  }
};