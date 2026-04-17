/**
 *  AUTHORS: Preethi Deevanapelli,
 * Subjects Model
 * ================================
 * Database queries for the `course_subjects` table.
 */

/**
 * Check if course exists 
 */
export const findCourseByIdQuery = `
  SELECT course_id 
  FROM courses 
  WHERE course_id = ?
`;

/**
 * Check if teacher exists
 */
export const findTeacherByIdQuery = `
  SELECT teacher_id 
  FROM teachers 
  WHERE teacher_id = ?
`;

/**
 * Get teacher by user_id 
 */
export const findTeacherByUserIdQuery = `
  SELECT teacher_id 
  FROM teachers
  WHERE user_id = ?
`

/**
 * Check duplicate subject inside same course 
 */
export const findDuplicateSubjectQuery = `
  SELECT subject_id 
  FROM course_subjects 
  WHERE course_id = ? AND LOWER(subject_name) = LOWER(?)
`;

/**
 * Insert new subject
 */
export const insertSubjectQuery = `
  INSERT INTO course_subjects 
  (course_id, teacher_id, subject_name, description, display_order) 
  VALUES (?, ?, ?, ?, ?)
`;

/**
 * Fetch all subjects (base query)
 */
export const getAllSubjectsQuery = `
  SELECT 
      subject_id,
      subject_name,
      course_id,
      teacher_id,
      no_of_modules,
      created_at
  FROM course_subjects
`;

/**
 * Count subjects (for pagination)
 */
export const countSubjectsQuery = `
  SELECT COUNT(*) as total
  FROM course_subjects
`;

/**
 * Get subject by ID
 */
export const getSubjectByIdQuery = `
  SELECT
    subject_id,
    subject_name,
    course_id,
    teacher_id,
    no_of_modules,
    created_at
  FROM course_subjects
  WHERE subject_id = ?
  LIMIT 1
`;

/**
 * Update subject 
 */
export const updateSubjectByIdQuery = `
  UPDATE course_subjects
  SET
    subject_name = ?,
    course_id = ?,
    teacher_id = ?,
    description = ?,
    display_order = ?
  WHERE subject_id = ?
`;

/**
 * Check if subject exists 
 */
export const checkSubjectExistsQuery = `
  SELECT subject_id, course_id, display_order
  FROM course_subjects
  WHERE subject_id = ?
`;

/**
 * Delete subject
 */
export const deleteSubjectByIdQuery = `
  DELETE FROM course_subjects
  WHERE subject_id = ?
`;

/**
 * Get teacher details for email notifications
 */
export const getTeacherDetailsQuery = `
  SELECT u.first_name, u.email
  FROM teachers t
  JOIN users u ON t.user_id = u.user_id
  WHERE t.teacher_id = ?
`;

/**
 * Get course name (for emails)
 */
export const getCourseNameQuery = `
  SELECT course_name
  FROM courses
  WHERE course_id = ?
`;

/**
 * Get subject with teacher and order 
 */
export const getSubjectWithTeacherQuery = `
  SELECT 
    subject_name, 
    course_id, 
    teacher_id,
    display_order
  FROM course_subjects
  WHERE subject_id = ?
`;

/**
 * Get max display order in a course
 */
export const getMaxDisplayOrderQuery = `
  SELECT COALESCE(MAX(display_order), 0) AS maxOrder
  FROM course_subjects
  WHERE course_id = ?
`;

/**
 * Shift subjects DOWN (make space for new subject)
 */
export const shiftDisplayOrderQuery = `
  UPDATE course_subjects
  SET display_order = display_order + 1
  WHERE course_id = ?
  AND display_order >= ?
`;

/**
 * Fix old course ordering (when subject moves out)
 */
export const fixOldCourseOrdering = `
  UPDATE course_subjects
  SET display_order = display_order - 1
  WHERE course_id = ?
  AND display_order >= ?
`;

/**
 * Shift subjects DOWN (when moving subject down)
 */
export const shiftDisplayOrderDownQuery = `
  UPDATE course_subjects
  SET display_order = display_order - 1
  WHERE course_id = ?
  AND display_order > ?
  AND display_order <= ?
`;

/**
 * Shift subjects UP (when moving subject up)
 */
export const shiftDisplayOrderUpQuery = `
  UPDATE course_subjects
  SET display_order = display_order + 1
  WHERE course_id = ?
  AND display_order >= ?
  AND display_order < ?
`;

/**
 * Reorder after delete (fill gap)
 */
export const reorderSubjectsAfterDeleteQuery = `
  UPDATE course_subjects
  SET display_order = display_order - 1
  WHERE course_id = ?
  AND display_order > ?
`;

