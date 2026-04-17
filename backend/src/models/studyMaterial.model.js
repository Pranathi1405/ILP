/**
 * AUTHORS: Preethi Deevanapelli
 * Study Material Model (Queries)
 */

// Insert Study Material
export const insertStudyMaterialQuery = `
    INSERT INTO study_materials
    (module_id, material_name, content_html, resource_type, pdf_url, file_size_mb, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

// Check Module Existence 
export const checkModuleExistQuery = `
    SELECT module_id FROM subject_modules WHERE module_id = ?
`;

// Get All Study Materials
export const getAllStudyMaterialsQuery = `
    SELECT 
        material_id,
        module_id,
        material_name,
        content_html,
        resource_type,
        pdf_url,
        file_size_mb,
        is_published,
        created_at,
        updated_at
    FROM study_materials
`;

// Count Study Materials
export const countStudyMaterialsQuery = `
    SELECT COUNT(*) AS total
    FROM study_materials 
`;

// Get Study Material By ID
export const getStudyMaterialByIdQuery = `
    SELECT 
        material_id,
        module_id,
        material_name,
        content_html,
        resource_type,
        pdf_url,
        file_size_mb,
        is_published,
        created_at,
        updated_at
    FROM study_materials
    WHERE material_id = ?
`;

// Delete Study Material
export const deleteStudyMaterialQuery = `
    DELETE FROM study_materials
    WHERE material_id = ?
`;

export const insertAnnotationQuery = `
    INSERT INTO pdf_annotations
    (student_id, material_id, page_number, type, coordinates, color)
    VALUES (?, ?, ?, ?, ?, ?)
`;

export const getAnnotationsQuery = `
    SELECT 
        annotation_id,
        page_number,
        type,
        coordinates,
        color,
        created_at
    FROM pdf_annotations
    WHERE student_id = ? AND material_id = ?
`;

export const deleteAnnotationQuery = `
    DELETE FROM pdf_annotations
    WHERE annotation_id = ? AND student_id = ?
`;

export const getStudentMaterialWithPdfQuery = `
    SELECT 
        material_id,
        pdf_url,
        is_published
    FROM study_materials
    WHERE material_id = ?
`;
