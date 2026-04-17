//Author - Vamshi

import express from "express";

import { dashboardStats, 
         classes,
         scheduleLiveClass,
         getLiveClassDetails,
         editLiveClass,
         removeLiveClass,
         searchClasses,
         fetchModulesBySubject,
         fetchSubjectsByCourse,
         fetchTeacherCourses,
         startClass,
         resumeClass,
         endClass,
         cancelClass,
         joinClass,
         leaveClass,
         getAttendance,
         generateTeacherBroadcastToken,
         studentClasses,
         studentLiveNow,
         studentDashboardStats,
         getTeacherNextClassReminder
} from "../controllers/liveClass.controller.js";

import {authenticate} from "../middleware/auth.middleware.js"

const router = express.Router();

router.get("/dashboard", authenticate, dashboardStats);
router.get("/", authenticate, classes);
router.post("/", authenticate, scheduleLiveClass);
router.get("/courses", authenticate, fetchTeacherCourses);
router.get("/courses/:course_id/subjects", authenticate, fetchSubjectsByCourse);
router.get("/subjects/:subject_id/modules", authenticate, fetchModulesBySubject);
router.get("/search", authenticate, searchClasses);
router.get("/student/live-now", authenticate, studentLiveNow);
router.get("/student/classes", authenticate, studentClasses);  //student side upcoming & past classes
router.get("/student/dashboard", authenticate, studentDashboardStats); //to display attendance in student dashboard
router.get("/teacher/reminder", authenticate, getTeacherNextClassReminder); //to display reminder for upcoming class in teacher dashboard
router.get("/:id", authenticate, getLiveClassDetails);
router.put("/:id", authenticate, editLiveClass);
router.delete("/:id", authenticate, removeLiveClass);

//Teacher Side
router.post("/:id/start", authenticate, startClass);
router.post("/:id/resume", authenticate, resumeClass);
// Generate ZEGO token for teacher broadcast screen
router.post("/:id/broadcast-token", authenticate, generateTeacherBroadcastToken);
router.post("/:id/end", authenticate, endClass);
router.post("/:id/cancel", authenticate, cancelClass);
//Students Side
router.post("/:id/join", authenticate, joinClass);
router.post("/:id/leave", authenticate, leaveClass);

router.get("/:id/attendance", authenticate, getAttendance);

export default router;

