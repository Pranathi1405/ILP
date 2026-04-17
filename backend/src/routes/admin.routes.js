//Authors : Sathvik Goli
// Admin Routes - For managing users, viewing stats, and handling teacher approvals

import express from 'express';
import {
    getDashboardStats,
    getStudentDetails,
    getParentDetails,
    getTeacherDetails,
    getAdminDetails,
    suspendAccount,
    reinstateAccount,
    approveTeacher,
    rejectTeacher,
    getFilteredUserDetails,
    createTeacherAccount,
    sendAdminInvitationMail,
    verifyAdminInvitationMail,
    getAllTeachersController,
} from '../controllers/admin.controller.js';

import { authenticate, adminOnly, userManagerOnly, courseManagerOnly, announementManagerOnly, financeManagerOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Dashboard stats
router.get('/dashboard-stats',authenticate, adminOnly, getDashboardStats);
router.get('/users', authenticate, adminOnly, userManagerOnly, getFilteredUserDetails);
// User details
router.get('/students/:id', authenticate, adminOnly, getStudentDetails);
router.get('/parents/:id', authenticate, adminOnly, getParentDetails);
router.get('/teachers/:id', authenticate, adminOnly, getTeacherDetails);
router.get('/admins/:id', authenticate, adminOnly, getAdminDetails); // Reusing getTeacherInfo for admin details as well
// Account management
router.post('/suspend/:id', authenticate, adminOnly, suspendAccount);
router.post('/reinstate/:id', authenticate, adminOnly, reinstateAccount);
router.post('/teachers/:id/approve', authenticate, adminOnly,userManagerOnly, approveTeacher);
router.post('/teachers/:id/reject', authenticate, adminOnly, userManagerOnly, rejectTeacher);
router.post('/teachers/add', authenticate, adminOnly, userManagerOnly, createTeacherAccount);
router.post('/admin-invitation', authenticate, adminOnly, userManagerOnly, sendAdminInvitationMail);
router.post('/admin-invitation/verify', verifyAdminInvitationMail); // No auth needed for this route as it's used during registration

router.get("/teachers", authenticate, adminOnly, getAllTeachersController);
export default router; 