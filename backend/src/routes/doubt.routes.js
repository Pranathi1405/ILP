//Author -> Vamshi
import express from "express";
import {
  createDoubt,
  getMyDoubts,
  replyToDoubt,
  updateDoubtStatus,
  getDoubtDetail,
  getEnrolledCourses, 
  getSubjectsByCourse,
  getTeacherPendingCount,
  getAdminTeacherDoubtAnalytics
} from "../controllers/doubt.controller.js";
import { upload } from "../middleware/upload.js";
import {adminOnly, allRoles, authenticate, studentOnly} from "../middleware/auth.middleware.js"

const router = express.Router();

// Create a new doubt
router.post("/",
   authenticate, upload.array("files", 5),studentOnly, createDoubt);
//student my-doubts button
router.get("/my-doubts", authenticate, getMyDoubts); 
// router.get("/teacher-doubts", authenticate, getTeacherDoubts);
router.post("/reply", authenticate, upload.array("files", 5), replyToDoubt);
router.get("/enrolled-courses", authenticate, allRoles, getEnrolledCourses);
router.get("/subjects", authenticate, allRoles, getSubjectsByCourse);
// router.get("/filter", authenticate, getDoubtsByFilter);
// router.get("/search", authenticate, searchDoubts);
//For teacher dashboard displaying no. of open doubts
router.get("/admin/analytics", authenticate, adminOnly, getAdminTeacherDoubtAnalytics);
router.get("/pending-count", authenticate, getTeacherPendingCount);
router.put("/:doubtId/status", authenticate, updateDoubtStatus);
router.get("/:doubtId", authenticate, getDoubtDetail);

export default router;
