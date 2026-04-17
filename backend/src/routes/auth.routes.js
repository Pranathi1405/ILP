/**
 * AUTHORS: Sathvik Goli,
 * Authentication Routes - For handling user signup, login, password resets, and fetching user lists.
 * ====================
 * Maps all API endpoints to their controllers.
 */

import express from "express";
import {initiateSignup,
  completeSignup,
  resendOtp,
  initiateLogin,
  completeLogin,
  rotateRefreshToken,
  logout,
  logoutAll,
  // getStudents,
  // getTeachers,
  // getParents,
  sendResetLink,
  resetPassword,
  removeSessionAndLogin,
} from '../controllers/auth.controller.js'
import { getActiveSessions } from '../services/auth.services.js'
import { adminOnly, authenticate, rlimit, teacherOrAdmin} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup/send-otp", initiateSignup);
router.post("/signup/verify-otp", completeSignup);
// Resend OTP (for both signup & login)
router.post("/resend-otp", resendOtp);

router.post("/login", rlimit ,initiateLogin);

router.post("/login/verify-otp", completeLogin);
router.post('/sessions/remove-login', removeSessionAndLogin);
router.get ('/sessions',authenticate, getActiveSessions);
router.post("/refresh-token", rotateRefreshToken);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);

// router.get("/students", authenticate, teacherOrAdmin, getStudents);
// router.get("/teachers", authenticate, adminOnly, getTeachers);
// router.get("/parents",  authenticate, adminOnly, getParents);

router.post("/reset-link",sendResetLink);
router.post("/reset-password",resetPassword);

export default router;