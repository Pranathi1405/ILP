/**
 *  AUTHORS: Preethi Deevanapelli,
 *  users Model
 * ================================
 * Database queries for the `course_enrollments` table.
 */

export const getEnrolledCourseModel = `
  SELECT 
    c.course_id, 
    c.course_name, 
    c.thumbnail_url,
    (
      SELECT JSON_ARRAYAGG(name)
      FROM (
        SELECT DISTINCT u.first_name, CONCAT(u.first_name, ' ', u.last_name) AS name
        FROM course_subjects cs
        JOIN teachers t ON cs.teacher_id = t.teacher_id
        JOIN users u ON t.user_id = u.user_id
        WHERE cs.course_id = c.course_id
        ORDER BY u.first_name ASC
      ) AS sorted_teachers
    ) AS teacher_names,
    e.enrollment_date
  FROM course_enrollments e 
  LEFT JOIN courses c ON e.course_id = c.course_id
  WHERE e.student_id = ? 
  ORDER BY e.enrollment_date DESC
`;

export const getTeacherCoursesModel = `
  SELECT DISTINCT
      c.course_id,
      c.course_name,
      c.course_code,
      c.description,
      c.thumbnail_url,
      c.is_free,
      c.price,
      c.is_published,
      c.difficulty_level,
      c.created_at
  FROM courses c
  INNER JOIN course_subjects cs 
      ON c.course_id = cs.course_id
  WHERE cs.teacher_id = ?
  AND c.is_published = 1
`;

export const getStudentByUserIdQuery = `
  SELECT student_id 
  FROM students
  WHERE user_id = ?
`;

export const getTeacherByUserIdQuery = `
  SELECT teacher_id 
  FROM teachers
  WHERE user_id = ?
`;

export const getTeacherSubjectsByCourseModel = `
  SELECT
      cs.subject_id,
      cs.subject_name,
      cs.description,
      cs.display_order,
      cs.no_of_modules,
      cs.created_at
  FROM course_subjects cs
  WHERE cs.teacher_id = ?
  AND cs.course_id = ?
  AND cs.is_active = 1
  ORDER BY cs.display_order ASC
`;

export const getTeacherModulesBySubjectModel = `
  SELECT
      m.module_id,
      m.subject_id,
      m.module_name,
      m.description,
      m.display_order,
      m.no_of_lectures,
      m.is_published,
      m.created_at,
      m.updated_at
  FROM subject_modules m
  INNER JOIN course_subjects cs
      ON m.subject_id = cs.subject_id
  WHERE cs.teacher_id = ?
  AND m.subject_id = ?
  ORDER BY m.display_order ASC
`;

export const getSubjectsForStudentCourseQuery = `
SELECT 
    s.subject_id,
    s.teacher_id,
    s.subject_name,
    s.description,
    s.display_order,
    s.no_of_modules,
    s.is_active,
    s.created_at,
    s.updated_at

FROM course_subjects s

JOIN course_enrollments e 
    ON e.course_id = s.course_id

JOIN students st
    ON st.student_id = e.student_id

WHERE 
    st.user_id = ?
    AND s.course_id = ?
    AND s.is_active = 1

ORDER BY s.display_order;
`;

export const getStudentSubjectModulesQuery = `
SELECT 
    m.module_id,
    m.module_name,
    m.description,
    m.display_order,
    m.no_of_lectures,
    m.is_published,
    m.created_at,
    m.updated_at

FROM subject_modules m

JOIN course_subjects s 
    ON s.subject_id = m.subject_id

JOIN course_enrollments e 
    ON e.course_id = s.course_id

JOIN students st
    ON st.student_id = e.student_id

WHERE 
    st.user_id = ?
    AND m.subject_id = ?
    AND m.is_published = 1

ORDER BY m.display_order;
`;