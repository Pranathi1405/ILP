/**
 * AUTHORS: Preethi Deevanapelli,
 * Course Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */

import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourse,
  enrollCourseController,
} from "../controllers/courses.controller.js";
import { adminOnly, authenticate, studentOnly, teacherOrAdmin } from "../middleware/auth.middleware.js";

// router object
const router = express.Router();

// routes

// create course || POST
router.post("/", authenticate, adminOnly, createCourse);

// get all courses || GET
router.get("/", getAllCourses);

// get course by ID || GET
router.get("/:id", getCourseById);

// update course || PATCH
router.patch("/:id", authenticate, adminOnly, updateCourseById);

// delete course || DELETE
router.delete("/:id", authenticate, adminOnly, deleteCourse);

//enroll for a course || POST
router.post("/:id/enroll", authenticate, studentOnly, enrollCourseController);

export default router;