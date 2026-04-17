export const studyMaterialSwagger = {
  tags: [
    {
      name: "Study Materials",
      description: "Study material APIs (Teacher + Student with PDF enforcement)"
    },
    {
      name: "Annotations",
      description: "PDF annotation APIs (Student only)"
    }
  ],

  paths: {
    // ─────────────────────────────────────────────
    // CREATE STUDY MATERIAL
    // ─────────────────────────────────────────────
    "/study-materials": {
      post: {
        tags: ["Study Materials"],
        summary: "Create study material (Teacher only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStudyMaterialRequest" }
            }
          }
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    materialId: 10,
                    message: "Study Material created successfully"
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { description: "Module not found" }
        }
      },

      // ─────────────────────────────────────────────
      // GET ALL MATERIALS
      // ─────────────────────────────────────────────
      get: {
        tags: ["Study Materials"],
        summary: "Get all study materials (role-based)",
        parameters: [
          { name: "moduleId", in: "query", schema: { type: "integer" } },
          { name: "resourceType", in: "query", schema: { type: "string", enum: ["pdf", "document"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["published", "draft"] } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Study materials fetched successfully",
                  pagination: {
                    total: 20,
                    page: 1,
                    limit: 10,
                    totalPages: 2
                  },
                  data: [
                    {
                      material_id: 1,
                      material_name: "Algebra Notes",
                      resource_type: "pdf",
                      pdf_url: "https://file.pdf",
                      is_published: 1
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
    // GET / UPDATE / DELETE MATERIAL
    // ─────────────────────────────────────────────
    "/study-materials/{id}": {
      get: {
        tags: ["Study Materials"],
        summary: "Get study material by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    material_id: 1,
                    material_name: "Algebra Notes",
                    resource_type: "document",
                    content_html: "<p>Content</p>",
                    pdf_url: "https://file.pdf"
                  }
                }
              }
            }
          },
          403: { description: "Access denied" },
          404: { description: "Not found" }
        }
      },

      patch: {
        tags: ["Study Materials"],
        summary: "Update study material (Teacher only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStudyMaterialRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "study material updated successfully",
                  data: { materialId: 1 }
                }
              }
            }
          }
        }
      },

      delete: {
        tags: ["Study Materials"],
        summary: "Delete study material (Teacher only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Study material deleted successfully"
                }
              }
            }
          }
        }
      }
    },

    // ─────────────────────────────────────────────
    // STUDENT VIEW (PDF + ANNOTATIONS)
    // ─────────────────────────────────────────────
    "/study-materials/students/{id}": {
      get: {
        tags: ["Study Materials"],
        summary: "Get material as PDF with annotations (Student only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    materialId: 1,
                    pdfUrl: "https://file.pdf",
                    annotations: [
                      {
                        annotation_id: 10,
                        page_number: 1,
                        type: "highlight",
                        coordinates: { x: 100, y: 200 },
                        color: "yellow"
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
    // ANNOTATIONS
    // ─────────────────────────────────────────────
    "/study-materials/annotations": {
      post: {
        tags: ["Annotations"],
        summary: "Create annotation (Student only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAnnotationRequest" }
            }
          }
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { annotationId: 5 }
                }
              }
            }
          }
        }
      }
    },

    "/study-materials/annotations/{materialId}": {
      get: {
        tags: ["Annotations"],
        summary: "Get annotations for a material",
        parameters: [
          { name: "materialId", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Success"
          }
        }
      }
    },

    "/study-materials/annotations/{id}": {
      delete: {
        tags: ["Annotations"],
        summary: "Delete annotation",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Annotation deleted"
                }
              }
            }
          }
        }
      }
    }
  },

  // ─────────────────────────────────────────────
  // SCHEMAS
  // ─────────────────────────────────────────────
  components: {
    schemas: {
      CreateStudyMaterialRequest: {
        type: "object",
        required: ["moduleId", "materialName", "resourceType"],
        properties: {
          moduleId: { type: "integer" },
          materialName: { type: "string" },
          contentHtml: { type: "string" },
          resourceType: { type: "string", enum: ["pdf", "document"] },
          pdfUrl: { type: "string" },
          fileSize: { type: "number" },
          isPublished: { type: "integer", enum: [0, 1] }
        }
      },

      UpdateStudyMaterialRequest: {
        type: "object",
        properties: {
          moduleId: { type: "integer" },
          materialName: { type: "string" },
          contentHtml: { type: "string" },
          resourceType: { type: "string", enum: ["pdf", "document"] },
          pdfUrl: { type: "string" },
          fileSizeMb: { type: "number" },
          isPublished: { type: "integer", enum: [0, 1] }
        }
      },

      CreateAnnotationRequest: {
        type: "object",
        required: ["materialId", "pageNumber", "type", "coordinates"],
        properties: {
          materialId: { type: "integer" },
          pageNumber: { type: "integer" },
          type: { type: "string", enum: ["highlight", "underline"] },
          coordinates: {
            type: "object",
            example: { x: 100, y: 200, width: 50, height: 20 }
          },
          color: { type: "string", example: "yellow" }
        }
      }
    }
  }
};