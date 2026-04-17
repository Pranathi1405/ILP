/**
 *  AUTHORS: Preethi Deevanapelli,
 * Module Model
 * ================================
 * Database queries for the `subjects_module` table.
 */


export const checkSubjectExistsQuery = `
SELECT subject_id
FROM course_subjects
WHERE subject_id = ?
`;

export const getMaxDisplayOrderQuery = `
SELECT COALESCE(MAX(display_order),0) AS maxOrder
FROM subject_modules
WHERE subject_id = ?
`;

export const shiftDisplayOrderDownQuery = `
UPDATE subject_modules
SET display_order = display_order - 1
WHERE subject_id = ?
AND display_order > ?
AND display_order <= ?; 
`;

export const shiftDisplayOrderUpQuery = `
UPDATE subject_modules
SET display_order = display_order + 1
WHERE subject_id = ?
AND display_order >= ?
AND display_order < ?;
`;

export const fixOldSubjectOrdering = `
UPDATE subject_modules
SET display_order = display_order - 1
WHERE subject_id = ?
AND display_order > ?
`;

export const fixNewSubjectOrdering = `
UPDATE subject_modules
SET display_order = display_order + 1
WHERE subject_id = ?
AND display_order >= ?
`

export const insertModuleQuery = `
INSERT INTO subject_modules
(subject_id, module_name, description, display_order, is_published)
VALUES (?, ?, ?, ?, ?)
`;


export const getAllModulesQuery = `
SELECT
  module_id,
  subject_id,
  module_name,
  description,
  display_order
FROM subject_modules
`;

export const countModulesQuery = `
SELECT COUNT(*) AS total
FROM subject_modules
`;

export const getModuleByIdQuery = `
SELECT 
    module_id,
    subject_id,
    module_name,
    description,
    display_order,
    is_published,
    created_at,
    updated_at
FROM subject_modules
WHERE module_id = ?
LIMIT 1
`;

export const checkModuleExistsQuery = `
  SELECT module_id
  FROM subject_modules
  WHERE module_id = ?
  LIMIT 1
`;

export const updateModuleByIdQuery = `
  UPDATE subject_modules
  SET 
    subject_id = ?,
    module_name = ?,
    description = ?,
    display_order = ?,
    is_published = ?
  WHERE module_id = ?
`;

export const deleteModuleByIdQuery = `
  DELETE FROM subject_modules
  WHERE module_id = ?
`;

export const reorderModulesAfterDeleteQuery = `
  UPDATE subject_modules
  SET display_order = display_order - 1
  WHERE subject_id = ?
  AND display_order > ?
`;