/**
 * AUTHORS: Preethi Deevanapelli,
 * Users Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */

import express from "express";
import { 
    authenticate, 
    studentOnly, 
    teacherOnly, 
    teacherOrAdmin
} from "../middleware/auth.middleware.js";
import { 
    getEnrolledCoursesController,
    getStudentCourseSubjectsController,
    getStudentSubjectModulesController,
    getTeacherCoursesController,
    getTeacherModulesBySubjectController,
    getTeacherSubjectsByCourseController
} from "../controllers/userCourse.controller.js";


const router = express.Router();

router.get("/student/enrolled-courses", authenticate, studentOnly, getEnrolledCoursesController);

router.get("/student/courses/:courseId/subjects", authenticate, studentOnly, getStudentCourseSubjectsController);

router.get("/student/subjects/:subjectId/modules", authenticate, studentOnly, getStudentSubjectModulesController);

router.get("/teacher/courses", authenticate, teacherOrAdmin, getTeacherCoursesController);

router.get("/teacher/courses/:courseId/subjects", authenticate, teacherOrAdmin, getTeacherSubjectsByCourseController);

router.get("/teacher/subjects/:subjectId/modules", authenticate, teacherOrAdmin, getTeacherModulesBySubjectController);

export default router;