
/**
 * AUTHORS: Preethi Deevanapelli,
 * Users Service     
 * */
import pool from "../config/database.config.js";
import { 
  getEnrolledCourseModel, 
  getStudentByUserIdQuery, 
  getStudentSubjectModulesQuery, 
  getSubjectsForStudentCourseQuery, 
  getTeacherByUserIdQuery, 
  getTeacherCoursesModel,
  getTeacherModulesBySubjectModel,
  getTeacherSubjectsByCourseModel,  
} from "../models/userCourse.model.js";

export const getEnrolledCoursesService = async (userId) => {
  if (!userId) {
    throw { status: 400, message: "User ID is required" };
  }

  const [studentRows] = await pool.execute(getStudentByUserIdQuery, [userId]);
  const studentId = studentRows[0]?.student_id;

  if (!studentId) {
    throw { status: 404, message: "Student profile not found" };
  }

  const [courses] = await pool.execute(getEnrolledCourseModel, [studentId]);

  if (!courses || courses.length === 0) {
    return [];
  }

  return courses;
}; 

export const getStudentCourseSubjectsService = async (userId, courseId) => {

  try {

    if (!courseId || isNaN(courseId)) {
      throw { status: 400, message: "Invalid course ID" };
    }

    const [subjects] = await pool.query(
      getSubjectsForStudentCourseQuery,
      [userId, courseId]
    );

    if (subjects.length === 0) {
      throw {
        status: 404,
        message: "No subjects found or student not enrolled in this course"
      };
    }

    return subjects;

  } catch (error) {

    throw error;

  } 
};


export const getStudentSubjectModulesService = async (userId, subjectId) => {

  try {

    if (!subjectId || isNaN(subjectId)) {
      throw { status: 400, message: "Invalid subject ID" };
    }

    const [modules] = await pool.query(
      getStudentSubjectModulesQuery,
      [userId, subjectId]
    );

    return modules;

  } catch (error) {

    console.error("Service Error:", error);
    throw error;

  }

};

export const getTeacherCoursesService = async (userId, categoryId) => {
  if (!userId || isNaN(userId)) {
    throw { status: 400, message: "User ID is Invalid" };
  }

  // Validate categoryId ONLY if provided
  if (categoryId && isNaN(categoryId)) {
    throw { status: 400, message: "Invalid category ID" };
  }
  
  const [teacherRows] = await pool.execute(getTeacherByUserIdQuery, [userId]);
  if (!teacherRows || teacherRows.length === 0) {
    throw { status: 404, message: "Teacher not found for this user" };
  }

  const teacherId = teacherRows[0].teacher_id;

  // Base query
  let query = getTeacherCoursesModel;
  let params = [teacherId];

  // Apply category filter only if provided
  if (categoryId) {
    query += ` AND c.category_id = ?`;
    params.push(categoryId);
  }

  query += ` ORDER BY c.created_at DESC`;

  const [courses] = await pool.execute(query, params);

  //  handle empty case
  if (!courses || courses.length === 0) {
    return [];
  }

  return courses;
}; 

export const getTeacherSubjectsByCourseService = async (userId, courseId) => {

  // Validate userId
  if (!userId || isNaN(userId)) {
    throw { status: 400, message: "Invalid user ID" };
  }

  // Validate courseId
  if (!courseId || isNaN(courseId)) {
    throw { status: 400, message: "Invalid course ID" };
  }

  // Get teacherId
  const [teacherRows] = await pool.execute(getTeacherByUserIdQuery, [userId]);

  if (!teacherRows || teacherRows.length === 0) {
    throw { status: 404, message: "Teacher not found" };
  }

  const teacherId = teacherRows[0].teacher_id;

  // Fetch subjects
  const [subjects] = await pool.execute(
    getTeacherSubjectsByCourseModel,
    [teacherId, courseId]
  );

  return subjects;
};

export const getTeacherModulesBySubjectService = async (userId, subjectId) => {

  // Validate user
  if (!userId || isNaN(userId)) {
    throw { status: 400, message: "Invalid user ID" };
  }

  // Validate subject
  if (!subjectId || isNaN(subjectId)) {
    throw { status: 400, message: "Invalid subject ID" };
  }

  // Get teacherId
  const [teacherRows] = await pool.execute(getTeacherByUserIdQuery, [userId]);

  if (!teacherRows || teacherRows.length === 0) {
    throw { status: 404, message: "Teacher not found" };
  }

  const teacherId = teacherRows[0].teacher_id;

  // Fetch modules
  const [modules] = await pool.execute(
    getTeacherModulesBySubjectModel,
    [teacherId, subjectId]
  );

  return modules;
};
