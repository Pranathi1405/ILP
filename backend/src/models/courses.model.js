/**
 *  AUTHORS: Preethi Deevanapelli,
 * courses  Model
 * ================================
 * Database queries for the `courses` table.
 */


/**
 * Fetch a single course by its ID
 */
export const findCourseById = 
    `SELECT 
        course_id,
        course_code,
        course_name,
        description,
        category_id,
        thumbnail_url,
        is_free,
        difficulty_level,
        medium,
        enrolled_students,
        price,
        is_published,
        details,
        prerequisites,
        learning_outcomes,
        start_date,
        end_date,
        created_at,
        updated_at
    FROM courses 
    WHERE course_id = ?
    `;

/**
 * Fetch all courses ordered by latest created
 */
export const findAllCourses = 
    `SELECT 
        course_id,
        course_code,
        course_name,
        description,
        category_id,
        thumbnail_url,
        is_free,
        difficulty_level,
        medium,
        enrolled_students,
        price,
        is_published,
        details,
        prerequisites,
        learning_outcomes,
        start_date, 
        end_date,
        created_at,
        updated_at 
    FROM courses 
    ORDER BY course_id DESC`;

/**
 * Insert a new course into DB
 */
export const insertCourse = 
    `INSERT INTO courses 
    (course_name, course_code, description, category_id, is_free, medium, details, thumbnail_url, difficulty_level, price, prerequisites, learning_outcomes, is_published, start_date, end_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/**
 * Dynamic update query builder
 */
export const updateCourse = (updates) => 
    `UPDATE courses SET ${updates.join(", ")} WHERE course_id = ?`;
        
/**
 * Delete course by ID
 */
export const deleteCourseById = 
    "DELETE FROM courses WHERE course_id = ?";


/**
 * Validate if given category exists
 */
export const findCategoryById = 
    "SELECT category_id FROM categories WHERE category_id = ?";


// Browse Base Query (used for both count & data)
export const browseCoursesBase = `
  FROM courses c
  LEFT JOIN categories cat ON c.category_id = cat.category_id
`;

// Data select query
export const browseCoursesSelect = `
  SELECT
    c.course_id,
    c.course_name,
    c.course_code,
    c.description,
    c.thumbnail_url,
    c.price,
    c.is_free,
    c.difficulty_level,
    c.medium,
    c.enrolled_students,
    c.created_at,
    c.category_id,
    cat.category_name
`;

/**
 * Count total records for pagination
 */
export const browseCoursesCount = `
  SELECT COUNT(*) as total
`;

/**
 * Simple count of all courses
 */
export const countCourses = `
SELECT COUNT(*) as total
FROM courses c
`;

/**
 * checks if a student is already enrolled in a course
 */
export const checkAlreadyEnrolledQuery = `
    SELECT enrollment_id 
    FROM course_enrollments
    WHERE student_id = ? AND course_id = ?
`;

/**
 * inserts an enrollment
 */
export const insertEnrollmentQuery = `
    INSERT INTO course_enrollments (
        student_id,
        course_id,
        enrollment_date,
        status
    ) VALUES (?, ?, NOW(), 'enrolled')
`;

/**
 * gets student ID
 */
export const getStudentByUserIdQuery = `
    SELECT student_id
    FROM students
    WHERE user_id = ?
`;

export const getAllPlans = `
  SELECT plan_id, plan_name, price
  FROM plans
`;

export const findCourseTeachers = `
    SELECT DISTINCT
        CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
        s.subject_name
    FROM course_subjects s
    JOIN teachers t ON t.teacher_id = s.teacher_id
    JOIN users u ON u.user_id = t.user_id
    WHERE s.course_id = ?
    AND s.is_active = 1;
`