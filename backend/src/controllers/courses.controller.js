/**
 * AUTHORS: Preethi Deevanapelli,
 * Courses Controller
 * ========================
 * Handles HTTP requests and responses for all Courses endpoints.
 *
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 *
 * NO business logic here. NO direct DB calls. Keep it thin.
 */

import * as courseService from "../services/courses.service.js";

/**
 * POST /api/courses
 * create courses
 */
export const createCourse = async (req, res) => {
  try {
    const result = await courseService.createCourse(req.body);

    res.status(201).json({
      success: true,
      message: "New course created",
      course_id: result.courseId,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * get all courses
 * GET /api/courses
 * GET /api/courses?search=
 * GET /api/courses?limit=
 * GET /api/courses?page=
 * GET /api/courses?categoryId=
 * GET /api/courses?difficulty=
 * GET /api/courses?minPrice=
 * GET /api/courses?maxPrice=
 * GET /api/courses?type= (free or paid)
 */
export const getAllCourses = async (req, res) => {
  try {
    const courses = await courseService.getAllCourses(req.query);

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * GET /api/courses/:id
 * get a course by id
 */
export const getCourseById = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const course = await courseService.getCourseById(courseId);

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * PATCH /api/courses/:id
 * update a course by id
 */
export const updateCourseById = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const result = await courseService.updateCourseById(
      courseId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * DELETE /api/courses/:id
 * delete a course by id
 */
export const deleteCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    const result = await courseService.deleteCourse(courseId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};


/**
 * POST /api/courses/:id/enroll
 * enroll for a course
 */
export const enrollCourseController = async (req, res) => {
    try {
        const user = req.user;
        const courseId = req.params.id;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required"
            });
        }

        const result = await courseService.enrollCourseService(user, courseId);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Enroll Course Error:", error.message);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to enroll in course"
        });
    }
};