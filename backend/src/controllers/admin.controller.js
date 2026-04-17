// Author: Sathvik Goli
// Admin Controller - Handles HTTP requests for admin-related operations
// Delegates business logic to adminService

import * as adminService from '../services/admin.service.js';

/**
 * Fetch dashboard statistics:
 * - Student count
 * - Parent count
 * - Teacher stats (total, verified, pending)
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Run all queries in parallel to improve performance
    let [studentCount, parentCount, { totalTeachers, verifiedTeachers, pendingTeachers }] =
      await Promise.all([
        adminService.getStudentCount(),
        adminService.getParentCount(),
        adminService.getCountOfTeachers(),
      ]);

    // Ensure numeric values (in case DB returns strings)
    verifiedTeachers = Number(verifiedTeachers);
    pendingTeachers = Number(pendingTeachers);

    // Send aggregated response
    res.status(200).json({
      studentCount,
      parentCount,
      totalTeachers,
      verifiedTeachers,
      pendingTeachers,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

/**
 * Get detailed information of a student by userId
 */
export const getStudentDetails = async (req, res) => {
  const userId = req.params.id;

  try {
    const studentDetails = await adminService.getStudentDetails(userId);
    res.status(200).json(studentDetails);
  } catch (error) {
    console.error('Error fetching student info:', error);
    res.status(500).json({ error: 'Failed to fetch student info' });
  }
};

/**
 * Get parent details along with number of linked children
 */
export const getParentDetails = async (req, res) => {
  const userId = req.params.id;

  try {
    // Destructure response and rename linked_children -> linkedChildrenCount
    const { parentDetails, linked_children: linkedChildrenCount } =
      await adminService.getParentDetails(userId);

    res.status(200).json({ ...parentDetails, linkedChildrenCount });
  } catch (error) {
    console.error('Error fetching parent info:', error);
    res.status(500).json({ error: 'Failed to fetch parent info' });
  }
};

/**
 * Get teacher details by userId
 */
export const getTeacherDetails = async (req, res) => {
  const userId = req.params.id;

  try {
    const teacherDetails = await adminService.getTeacherDetails(userId);
    res.status(200).json(teacherDetails);
  } catch (error) {
    console.error('Error fetching teacher info:', error);
    res.status(500).json({ error: 'Failed to fetch teacher info' });
  }
};

/**
 * Get admin details by userId
 */
export const getAdminDetails = async (req, res) => {
  const userId = req.params.id;

  try {
    const adminDetails = await adminService.getAdminDetails(userId);
    res.status(200).json(adminDetails);
  } catch (error) {
    console.error('Error fetching admin info:', error);
    res.status(500).json({ error: 'Failed to fetch admin info' });
  }
};

/**
 * Suspend a user account (soft disable)
 */
export const suspendAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    await adminService.suspendAccount(userId);
    res.status(200).json({ message: 'Account suspended successfully' });
  } catch (error) {
    console.error('Error suspending account:', error);
    res.status(500).json({ error: 'Failed to suspend account' });
  }
};

/**
 * Reinstate a previously suspended account
 */
export const reinstateAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    await adminService.reinstateAccount(userId);
    res.status(200).json({ message: 'Account reinstated successfully' });
  } catch (error) {
    console.error('Error reinstating account:', error);
    res.status(500).json({ error: 'Failed to reinstate account' });
  }
};

/**
 * Approve a teacher account (after verification process)
 */
export const approveTeacher = async (req, res) => {
  const userId = req.params.id;

  try {
    await adminService.approveTeacher(userId);
    res.status(200).json({ message: 'Teacher account approved successfully' });
  } catch (error) {
    console.error('Error approving teacher account:', error);
    res.status(500).json({ error: 'Failed to approve teacher account' });
  }
};

/**
 * Reject a teacher account
 */
export const rejectTeacher = async (req, res) => {
  const userId = req.params.id;

  try {
    await adminService.rejectTeacher(userId);
    res.status(200).json({ message: 'Teacher account rejected successfully' });
  } catch (error) {
    console.error('Error rejecting teacher account:', error);
    res.status(500).json({ error: 'Failed to reject teacher account' });
  }
};

/**
 * Get users based on filters (role, status, etc.)
 * Query params are passed directly to service layer
 */
export const getFilteredUserDetails = async (req, res) => {
  try {
    const result = await adminService.getFilteredUsersService(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching filtered users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Create a teacher account manually by admin
 * Also triggers sending credentials via email
 */
export const createTeacherAccount = async (req, res) => {
  const teacherData = req.body;

  try {
    const userId = await adminService.createTeacherAccount(teacherData);

    res.status(200).json({
      success: true,
      message: 'Teacher account created successfully and credentials sent to email',
      userId,
    });
  } catch (error) {
    console.error('Error creating teacher account:', error);
    res.status(500).json({ error: 'Failed to create teacher account' });
  }
};

/**
 * Send admin invitation email with role & permissions
 * Requires authenticated admin (req.user.id)
 */
export const sendAdminInvitationMail = async (req, res) => {
  // Expected body: email, role, permissions
  const invitationData = req.body;

  console.log("request data is :", invitationData);
  console.log("invited_by", req.user.id);

  try {
    await adminService.sendAdminInvitationMail(invitationData, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Admin invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending admin invitation:', error);
    res.status(500).json({ error: 'Failed to send admin invitation' });
  }
};

/**
 * Verify invitation token and create admin account
 * Token comes from email link
 */
export const verifyAdminInvitationMail = async (req, res) => {
  const { token, password, first_name, last_name, phone } = req.body;

  try {
    // Validate token and create account
    const result = await adminService.verifyAdminInvitationMail(
      token,
      password,
      first_name,
      last_name,
      phone
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Admin account created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error verifying admin invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin invitation'
    });
  }
};

export const getAllTeachersController = async (req, res) => {
  try {
    const filters = {
      department: req.query.department,
      rating: req.query.rating,
      is_verified: req.query.is_verified,
      min_students: req.query.min_students,
      min_courses: req.query.min_courses
    };

    const teachers = await adminService.getAllTeachersService(filters);

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });

  } catch (error) {
    console.error("Error fetching teachers:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers"
    });
  }
};