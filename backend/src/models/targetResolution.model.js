/**
 * Authors: Harshitha Ravuri,
 * Target Resolution Model
 * ========================
 * Helper functions to resolve USER IDs from various sources.
 * These are used by teachers and admins to find who to notify.
 *
 * Examples:
 *  - "notify all students in course 5" → getStudentUserIdsByCourse(5)
 *  - "notify parents of student 3" → getParentUserIdsByStudent(3)
 *
 * All functions return an array of user_ids (numbers).
 */

import pool from '../config/database.config.js';

/**
 * Get user_ids of all students enrolled in a specific course.
 *
 * @param {number} courseId
 * @returns {Array<number>} user_ids
 */
export const getStudentUserIdsByCourse = async (courseId) => {
  const sql = `
    SELECT u.user_id
    FROM users u
    JOIN students s ON s.user_id = u.user_id
    JOIN course_enrollments ce ON ce.student_id = s.student_id
    WHERE ce.course_id = ?
      AND ce.status != 'dropped'
      AND u.is_active = TRUE
  `;
  const [rows] = await pool.query(sql, [courseId]);
  return rows.map((r) => r.user_id);
};

/**
 * Get user_ids of parents of ALL students in a course.
 *
 * @param {number} courseId
 * @returns {Array<number>} user_ids of parents
 */
export const getParentUserIdsByCourse = async (courseId) => {
  const sql = `
    SELECT DISTINCT u.user_id
    FROM users u
    JOIN parents p ON p.user_id = u.user_id
    JOIN parent_student_relationship psr ON psr.parent_id = p.parent_id
    JOIN students st ON st.student_id = psr.student_id
    JOIN course_enrollments ce ON ce.student_id = st.student_id
    WHERE ce.course_id = ?
      AND ce.status != 'dropped'
      AND u.is_active = TRUE
  `;
  const [rows] = await pool.query(sql, [courseId]);
  return rows.map((r) => r.user_id);
};

/**
 * Get user_id of a specific student (single student notification).
 * Returns an array with 1 element for consistency with other helpers.
 *
 * @param {number} studentId - The student_id of the student
 * @returns {Array<number>} [user_id] or []
 */
export const getUserIdByStudentId = async (studentId) => {
  const sql = `
    SELECT user_id FROM Students
    WHERE student_id = ?
  `;
    const [rows] = await pool.query(sql, [studentId]);

  return rows.length ? rows[0].user_id : null;
};

/**
 * Get user_ids of parents of a specific student.
 *
 * @param {number} studentId - The student_id of the student 
 * @returns {Array<number>} user_ids of parents
 */
export const getParentUserIdsByStudentId = async (studentId) => {
  const sql = `
    SELECT DISTINCT u.user_id
    FROM users u
    JOIN parents p ON p.user_id = u.user_id
    JOIN parent_student_relationship psr ON psr.parent_id = p.parent_id
    JOIN students s ON s.student_id = psr.student_id
    WHERE s.student_id = ?
      AND u.is_active = TRUE
  `;
  const [rows] = await pool.query(sql, [studentId]);
  return rows.map((r) => r.user_id);
};

/**
 * Get user_ids of all users with a specific role.
 *
 * @param {string} role - 'student'|'teacher'|'parent'|'admin'
 * @returns {Array<number>} user_ids
 */
export const getUserIdsByRole = async (role) => {
  const sql = `
    SELECT user_id FROM users
    WHERE user_type = ? AND is_active = TRUE
  `;
  const [rows] = await pool.query(sql, [role]);
  return rows.map((r) => r.user_id);
};

/**
 * Get user_ids of all active users (all roles combined).
 *
 * @returns {Array<number>} user_ids
 */
export const getAllActiveUserIds = async () => {
  const sql = `SELECT user_id FROM users WHERE is_active = TRUE`;
  const [rows] = await pool.query(sql);
  return rows.map((r) => r.user_id);
};

/**
 * Get user_ids of all teachers (for teacher-wide announcements).
 *
 * @returns {Array<number>} user_ids
 */
export const getAllTeacherUserIds = async () => {
  return getUserIdsByRole('teacher');
};

/**
 * Verify that a teacher is authorized to access a course.
 * A teacher can only send notifications for courses they teach.
 *
 * @param {number} teacherUserId - The teacher's user_id
 * @param {number} courseId
 * @returns {boolean}
 */
export const isTeacherOfCourse = async (teacherUserId, courseId) => {
   console.log("Checking authorization...");
  console.log("teacherUserId:", teacherUserId);
  console.log("courseId:", courseId);

  const sql = `
    SELECT 1
    FROM course_subjects cs
    JOIN teachers t ON t.teacher_id = cs.teacher_id
    WHERE cs.course_id = ?
      AND t.user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [courseId, teacherUserId]);

  console.log("Auth rows:", rows);

  return rows.length > 0;
};

/**
 * Verify that a student is enrolled in a course taught by this teacher.
 * Used before a teacher sends a notification to an individual student.
 *
 * @param {number} teacherUserId
 * @param {number} studentId
 * @returns {boolean}
 */
export const isStudentOfTeacher = async (teacherUserId, studentId) => {
  console.log("Query values:", teacherUserId, studentId);
  const sql = `
    SELECT 1
    FROM course_enrollments ce
    JOIN course_subjects cs ON cs.course_id = ce.course_id
    JOIN teachers t ON t.teacher_id = cs.teacher_id
    JOIN students s ON s.student_id = ce.student_id
    WHERE t.user_id = ?
      AND s.student_id = ?
      AND ce.status != 'dropped'
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [teacherUserId, studentId]);
  console.log("isStudentOfTeacher rows:", rows);
  return rows.length > 0;
};

/**
 * Get user_ids of all active admin users.
 * Used by system notification service to alert all admins at once.
 *
 * @returns {Array<number>} user_ids of all admins
 */
export const getAllAdminUserIds = async () => {
  return getUserIdsByRole('admin');
};

export const getStudentIdByUserId = async (userId) => {
  const sql = `
    SELECT student_id FROM students
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [userId]);

  return rows.length ? rows[0].student_id : null;
};
 export const getParentIdByUserId= async(userId)=>{
  const sql= `
    SELECT parent_id FROM parents  
    WHERE user_id = ?
  `;
  const [rows] = await pool.query(sql, [userId]);
  return rows.map((r) => r.parent_id);
};
export const getTeacherIdByUserId = async (userId) => {
  const sql = `
    SELECT teacher_id FROM teachers     
    WHERE user_id = ?
  `;

  const [rows] = await pool.query(sql, [userId]);
  return rows.length ? rows[0].teacher_id : null;
};
