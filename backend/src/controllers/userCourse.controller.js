/**
 * AUTHORS: Preethi Deevanapelli,
 * Users Controller
 * ========================
 * Handles HTTP requests and responses for all user endpoints.
 *
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 *
 * NO business logic here. NO direct DB calls. Keep it thin.
 */

import { 
  getEnrolledCoursesService, 
  getStudentCourseSubjectsService, 
  getStudentSubjectModulesService, 
  getTeacherCoursesService,
  getTeacherModulesBySubjectService,
  getTeacherSubjectsByCourseService, 
} from "../services/userCourse.service.js";



export const getEnrolledCoursesController = async (req, res) => {
  try {
    const userId = req.user.id;

    const courses = await getEnrolledCoursesService(userId);

    return res.status(200).json({
      success: true,
      message: "Enrolled courses fetched successfully",
      data: courses,
    });

  } catch (error) {
    console.error("Error in getEnrolledCoursesController:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getStudentCourseSubjectsController = async (req, res) => {

  try {

    const userId = req.user.id;
    const { courseId } = req.params;

    const subjects = await getStudentCourseSubjectsService(userId, courseId);

    return res.status(200).json({
      success: true,
      message: "Subjects fetched successfully",
      data: subjects
    });

  } catch (error) {

    console.error(error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });

  }

};


export const getStudentSubjectModulesController = async (req, res) => {

  try {

    const userId = req.user.id;
    const { subjectId } = req.params;

    const modules = await getStudentSubjectModulesService(userId, subjectId);

    return res.status(200).json({
      success: true,
      message: "Modules fetched successfully",
      data: modules
    });

  } catch (error) {

    console.error("Controller Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });

  }

};

export const getTeacherCoursesController = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {categoryId} = req.query;

    console.log(categoryId);

    const courses = await getTeacherCoursesService(userId, categoryId);

    return res.status(200).json({
      success: true,
      message: "Teacher's courses fetched successfully",
      data: courses,
    });

  } catch (error) {
    console.error("Error in getTeacherCoursesController:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getTeacherSubjectsByCourseController = async (req, res) => {
  try {

    const userId = req.user?.id;
    const { courseId } = req.params;

    const subjects = await getTeacherSubjectsByCourseService(
      userId,
      courseId
    );

    return res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });

  } catch (error) {

    console.error("Get Teacher Subjects Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

export const getTeacherModulesBySubjectController = async (req, res) => {
  try {

    const userId = req.user.id;
    const { subjectId } = req.params;

    const modules = await getTeacherModulesBySubjectService(
      userId,
      subjectId
    );

    return res.status(200).json({
      success: true,
      count: modules.length,
      data: modules
    });

  } catch (error) {

    console.error("Get Teacher Modules Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};