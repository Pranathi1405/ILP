/**
 * AUTHORS: Preethi Deevanapelli
 * Study Material Service
 */


import pool from "../config/database.config.js";
import { 
    checkModuleExistQuery, 
    countStudyMaterialsQuery, 
    deleteAnnotationQuery, 
    deleteStudyMaterialQuery, 
    getAllStudyMaterialsQuery, 
    getAnnotationsQuery, 
    getStudentMaterialWithPdfQuery, 
    getStudyMaterialByIdQuery, 
    insertAnnotationQuery, 
    insertStudyMaterialQuery 
} from "../models/studyMaterial.model.js";

import { generatePdfFromHtml } from "../utils/pdfGenerator.js";


//create study material
export const createStudyMaterial = async (data) => {
    const {
        moduleId,
        materialName,
        contentHtml,
        resourceType,
        pdfUrl = null,
        fileSize = null,
        isPublished = 1
    } = data;

    // Validations
    if (!moduleId) {
        throw { status: 400, message: "ModuleId is required" };
    }

    if (!materialName || materialName.trim() === "") {
        throw { status: 400, message: "Material name is required" };
    }

    const allowedTypes = ['pdf', 'document'];
    if (!allowedTypes.includes(resourceType)) {
        throw { status: 400, message: "Invalid resource type" };
    }

    if (fileSize && fileSize < 0) {
        throw { status: 400, message: "File size cannot be negative" };
    }

    // Conditional Validation 
    if (resourceType === "document") {
        if (!contentHtml || contentHtml.trim() === "") {
            throw { status: 400, message: "contentHtml is required for document type" };
        }
    }

    if (resourceType === "pdf") {
        if (!pdfUrl || pdfUrl.trim() === "") {
            throw { status: 400, message: "pdfUrl is required for pdf type" };
        }
    }

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        // Check module existence
        const [module] = await connection.query(checkModuleExistQuery, [moduleId]);

        if (module.length === 0) {
            throw { status: 400, message: "Module not found" };
        }

        // Normalize values before insert
        const finalContentHtml = resourceType === "document" ? contentHtml : null;
        let finalPdfUrl = pdfUrl || null;

        // Insert Study Material
        const [result] = await connection.query(insertStudyMaterialQuery, [
            moduleId,
            materialName.trim(),
            finalContentHtml,
            resourceType,
            finalPdfUrl,
            fileSize || null,
            isPublished
        ]);

        const materialId = result.insertId;

        await connection.commit();
        // Step 2: Generate PDF if document
        try {
            if (resourceType === "document") {
                finalPdfUrl = await generatePdfFromHtml(contentHtml, materialId);

                await connection.query(
                    `UPDATE study_materials SET pdf_url = ? WHERE material_id = ?`,
                    [finalPdfUrl, materialId]
                );
            }
        } catch (pdfError) {
            console.error("PDF generation failed:", pdfError);
            throw { status: 500, message: "Failed to generate PDF" };
        }


        return {
            materialId,
            message: "Study Material created successfully"
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
    connection.release();
    }
};

//get all study materials
export const getAllStudyMaterialsService = async (queryParams, user) => {
    try {
        let {
            page = 1,
            limit = 10,
            moduleId, 
            resourceType,
            status,
            search,
            sortBy = "created_at",
            order = "DESC"
        } = queryParams;

        // Normalize pagination
        page = Math.max(1, parseInt(page) || 1);
        limit = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const offset = (page - 1) * limit;

        // Allowed sorting
        const allowedSortFields = ["created_at", "material_name", "file_size_mb"];
        const allowedOrder = ["ASC", "DESC"];

        if (!allowedSortFields.includes(sortBy)) sortBy = "created_at";
        if (!allowedOrder.includes(order.toUpperCase())) order = "DESC";

        // Build conditions 
        let conditions = [];
        let values = [];

        // Module Filter
        if (moduleId) {
            conditions.push("module_id = ?");
            values.push(moduleId);
        }

        // Resource type filter
        if (resourceType) {
            if (resourceType === "document") {
                conditions.push("resource_type = ? AND content_html IS NOT NULL");
                values.push("document");
            } else if (resourceType === "pdf") {
                conditions.push("resource_type = ? AND pdf_url IS NOT NULL");
                values.push("pdf");
            }
        }

        // Role-based control
        if (user?.role === "student") {
            conditions.push("is_published = 1");
        } else {
            if (status) {
                if (status === "published") {
                    conditions.push("is_published = 1");
                } else if (status === "draft") {
                    conditions.push("is_published = 0");
                }
            }
        }

        // Search
        if (search) {
            conditions.push("material_name LIKE ?");
            values.push(`%${search}%`);
        }

        // Final WHERE clause
        const whereClause = conditions.length
            ? "WHERE " + conditions.join(" AND ")
            : "";

        // Data Query
        const dataQuery = `
            ${getAllStudyMaterialsQuery}
            ${whereClause}
            ORDER BY ${sortBy} ${order}
            LIMIT ? OFFSET ?
        `;

        // Count Query
        const countQuery = `
            ${countStudyMaterialsQuery}
            ${whereClause}
        `;

        const [data] = await pool.query(dataQuery, [...values, limit, offset]);
        const [countResult] = await pool.query(countQuery, values);

        if (user?.role === "student") {
            data.forEach(item => {
                item.content_html = null;

                if (!item.pdf_url) {
                     item.pdf_url = null;
                }
            });
        }

        const total = countResult[0].total;

        return {
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data
        };

    } catch (error) {
        throw error;
    }
};

//get study material by id
export const getStudyMaterialByIdService = async (id, user) => {
    try {
        // Validate ID
        if (!id) {
            throw { status: 400, message: "Material ID is required" };
        }

        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            throw { status: 400, message: "Invalid material ID" };
        }

        const [rows] = await pool.query(getStudyMaterialByIdQuery, [parsedId]);

        if (!rows.length) {
            throw { status: 404, message: "Study Material not found" };
        }

        const material = rows[0];

        // Role-based restriction
        if (user?.role === "student" && material.is_published === 0) {
            throw { status: 403, message: "Access denied: material not published" };
        }

        if (user?.role === "student") {
            if (!material.pdf_url) {
                throw { status: 500, message: "PDF not generated" };
            }

            material.content_html = null; // hide HTML from student
        }



        return material;

    } catch (error) {
        throw error;
    }
};

//update study material by id
export const updateStudyMaterialService = async (materialId, body) => {
    try {

        // Validate materialId
        if (materialId === undefined) {
            throw { status: 400, message: "Material ID is required" };
        }

        const parsedId = parseInt(materialId);
        if (isNaN(parsedId) || parsedId <= 0) {
            throw { status: 400, message: "Invalid material ID" };
        }

        const {
            moduleId,
            materialName,
            contentHtml,
            resourceType,
            pdfUrl,
            fileSizeMb,
            isPublished
        } = body;

        if (
            moduleId === undefined &&
            materialName === undefined &&
            contentHtml === undefined &&
            resourceType === undefined &&
            pdfUrl === undefined &&
            fileSizeMb === undefined &&
            isPublished === undefined
        ) {
            throw { status: 400, message: "At least one field is required to update" };
        }

        // Fetch existing material 
        const [rows] = await pool.execute(getStudyMaterialByIdQuery, [parsedId]);

        if (!rows.length) {
            throw { status: 404, message: "Study material not found" };
        }

        const existing = rows[0];

        let fields = [];
        let values = [];

        // Module update
        if (moduleId !== undefined) {
            const parsedModuleId = parseInt(moduleId);

            if (isNaN(parsedModuleId) || parsedModuleId <= 0) {
                throw { status: 400, message: "Invalid module ID" };
            }

            const [module] = await pool.query(checkModuleExistQuery, [parsedModuleId]);
            if (!module.length) {
                throw { status: 400, message: "Module not found" };
            }

            fields.push("module_id = ?");
            values.push(parsedModuleId);
        }

        // Material Name
        if (materialName !== undefined) {
            if (typeof materialName !== "string" || materialName.trim() === "") {
                throw { status: 400, message: "Invalid material name" };
            }
            fields.push("material_name = ?");
            values.push(materialName.trim());
        }

        //  Resource Type Validation 
        const finalResourceType = resourceType || existing.resource_type;

        if (resourceType !== undefined) {
            const allowed = ["pdf", "document"];
            if (!allowed.includes(resourceType)) {
                throw { status: 400, message: "Invalid resource type" };
            }
            fields.push("resource_type = ?");
            values.push(resourceType);
        }

        // Content / PDF logic
        if (finalResourceType === "document") {
            const finalContent = contentHtml !== undefined 
                ? contentHtml 
                : existing.content_html;

            const generatedPdf = await generatePdfFromHtml(finalContent, parsedId);

            fields.push("pdf_url = ?");
            values.push(generatedPdf);

            fields.push("content_html = ?");
            values.push(finalContent);
        }

        if (finalResourceType === "pdf") {

            const finalPdf = pdfUrl !== undefined ? pdfUrl : existing.pdf_url;

            if (!finalPdf || finalPdf.trim() === "") {
                throw { status: 400, message: "pdfUrl is required for pdf type" };
            }

            fields.push("pdf_url = ?");
            values.push(finalPdf);

            // clear content_html
            fields.push("content_html = ?");
            values.push(null);
        }

        //  File Size
        if (fileSizeMb !== undefined) {
            const size = parseFloat(fileSizeMb);
            if (isNaN(size) || size < 0) {
                throw { status: 400, message: "Invalid file size" };
            }
            fields.push("file_size_mb = ?");
            values.push(size);
        }

        // Publish Status
        if (isPublished !== undefined) {
            if (![0, 1, true, false].includes(isPublished)) {
                throw { status: 400, message: "Invalid isPublished value" };
            }
            fields.push("is_published = ?");
            values.push(isPublished ? 1 : 0);
        }

        // Build query
        const sql = `
            UPDATE study_materials
            SET ${fields.join(", ")}
            WHERE material_id = ?
        `;

        values.push(parsedId);

        const [result] = await pool.execute(sql, values);

        if (!result.affectedRows) {
            throw { status: 400, message: "Failed to update study material" };
        }

        return { materialId: parsedId };

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            throw {
                status: 400,
                message: "Duplicate study material for this module"
            };
        }

        if (error.status) {
            throw error;
        }

        console.error("DB ERROR:", error);

        throw {
            status: 500,
            message: "Internal server error"
        };
    }
};

//delete study material by id
export const deleteStudyMaterialService = async (materialId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Validate materialId
    if (!materialId || isNaN(materialId)) {
      throw { status: 400, message: "Invalid material ID" };
    }

    const parsedId = parseInt(materialId);

    // Fetch material (
    const [rows] = await connection.query(
      getStudyMaterialByIdQuery,
      [parsedId]
    );

    if (rows.length === 0) {
      throw { status: 404, message: "Study material not found" };
    }

    // Delete material
    const [result] = await connection.query(
      deleteStudyMaterialQuery,
      [parsedId]
    );

    if (!result.affectedRows) {
      throw { status: 500, message: "Failed to delete study material" };
    }

    await connection.commit();

    return {
      success: true,
      message: "Study material deleted successfully",
      materialId: parsedId
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Add annotation
export const createAnnotationService = async (data, user) => {
    const {
        materialId,
        pageNumber,
        type,
        coordinates,
        color = "yellow"
    } = data;

    if (!materialId || !pageNumber || !type || !coordinates) {
        throw { status: 400, message: "Missing required fields" };
    }

    if (!["highlight", "underline"].includes(type)) {
        throw { status: 400, message: "Invalid annotation type" };
    }

    const [result] = await pool.query(insertAnnotationQuery, [
        user.id,
        materialId,
        pageNumber,
        type,
        JSON.stringify(coordinates),
        color
    ]);

    return {
        annotationId: result.insertId
    };
};


// Get annotations
export const getAnnotationsService = async (materialId, user) => {

    if (!materialId) {
        throw { status: 400, message: "Material ID required" };
    }

    const [rows] = await pool.query(getAnnotationsQuery, [
        user.id,
        materialId
    ]);

    // parse JSON
    const data = rows.map(item => ({
        ...item,
        coordinates: JSON.parse(item.coordinates)
    }));

    return data;
};


// Delete annotation
export const deleteAnnotationService = async (annotationId, user) => {

    if (!annotationId) {
        throw { status: 400, message: "Annotation ID required" };
    }

    const [result] = await pool.query(deleteAnnotationQuery, [
        annotationId,
        user.id
    ]);

    if (!result.affectedRows) {
        throw { status: 404, message: "Annotation not found" };
    }

    return { message: "Annotation deleted" };
};

export const getStudentMaterialWithAnnotationsService = async (materialId, user) => {

    // Validate
    if (!materialId) {
        throw { status: 400, message: "Material ID is required" };
    }

    const parsedId = parseInt(materialId);
    if (isNaN(parsedId) || parsedId <= 0) {
        throw { status: 400, message: "Invalid material ID" };
    }

    // Get material
    const [rows] = await pool.query(getStudentMaterialWithPdfQuery, [parsedId]);

    if (!rows.length) {
        throw { status: 404, message: "Study material not found" };
    }

    const material = rows[0];

    // Check published
    if (material.is_published === 0) {
        throw { status: 403, message: "Access denied: material not published" };
    }

    // Ensure PDF exists
    if (!material.pdf_url) {
        throw { status: 500, message: "PDF not available yet" };
    }

    // Fetch annotations (student-specific)
    const [annotations] = await pool.query(getAnnotationsQuery, [
        user.id,
        parsedId
    ]);

    const parsedAnnotations = annotations.map(item => ({
        ...item,
        coordinates: JSON.parse(item.coordinates)
    }));

    //  Final response
    return {
        materialId: material.material_id,
        pdfUrl: material.pdf_url,
        annotations: parsedAnnotations
    };
};