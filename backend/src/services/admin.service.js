// ============================================================
// AUTHORS: Sathvik Goli,
// Admin Related Services
//Added almosty all admin related services here, except the ones related to course management which are in course.service.js
// ============================================================
import * as adminModel from '../models/admin.model.js';
import { CHECK_EMAIL_EXISTS } from '../models/auth.models.js';
import pool from '../config/database.config.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as authModel from '../models/auth.models.js';
import * as emailHelper from '../utils/emailHelper.js';

export const getStudentCount = async () => {
  const [rows] = await pool.execute(adminModel.getActiveStudents);
  return rows[0].total_students;
};

export const getParentCount = async () => {
  const [rows] = await pool.execute(adminModel.getTotalParents);
  return rows[0].total_parents;
};

export const getStudentDetails = async (userId) => {
  const [rows] = await pool.execute(adminModel.getStudentDetailsById, [userId]);
  return rows[0];
};

export const getParentDetails = async (userId) => {
  const [rows] = await pool.execute(adminModel.getParentDetailsById, [userId]);
  const [rows2] = await pool.execute(adminModel.getParentLinkCountById, [rows[0].parentId]);
  return { parentDetails: rows[0], linkedChildrenCount: rows2[0].linked_children };
};

export const getTeacherDetails = async (userId) => {
  const [rows] = await pool.execute(adminModel.getTeacherDetailsById, [userId]);
  return rows[0];
};

export const getAdminDetails = async (userId) => {
  const [rows] = await pool.execute(adminModel.getAdminDetailsById, [userId]);
  return rows[0];
};

export const suspendAccount = async (userId) => {
  await pool.execute(adminModel.suspendAccountByUserId, [userId]);
};

export const reinstateAccount = async (userId) => {
  await pool.execute(adminModel.reinstateAccountByUserId, [userId]);
};

export const approveTeacher = async (userId) => {
  await pool.execute(adminModel.approveTeacherById, [userId]);
};

export const rejectTeacher = async (userId) => {
  await pool.execute(adminModel.rejectTeacherById, [userId]);
};

export const getCountOfTeachers = async () => {
  const [rows] = await pool.execute(adminModel.getTeacherCount);
  const { totalTeachers, verifiedTeachers, pendingTeachers } = rows[0];
  return {
    totalTeachers,
    verifiedTeachers,
    pendingTeachers,
  };
};

export const getFilteredUsersService = async (rawFilters) => {
  // --- sanitize & defaults ---
  const VALID_ROLES = ['student', 'teacher', 'parent', 'admin'];
  const VALID_SORT = ['created_at', 'first_name', 'user_id'];

  const role = VALID_ROLES.includes(rawFilters.role) ? rawFilters.role : null;
  const status = rawFilters.status === 'active' ? 1 : rawFilters.status === 'suspended' ? 0 : null;
  // is_verified filter — pending=0, null=no filter
  // 'pending' only makes sense for teachers so query handles it via LEFT JOIN
  const approval =
    rawFilters.status === 'pending'
      ? 0
      : rawFilters.status === 'active' || rawFilters.status === 'suspended'
        ? 1
        : null;
  const search = rawFilters.search?.trim() || null;
  const page = Math.max(1, parseInt(rawFilters.page) || 1);
  const limit = Math.min(100, parseInt(rawFilters.limit) || 10);
  const offset = (page - 1) * limit;

  // --- build params (must match ? order in query) ---
  const searchPattern = search ? `%${search.toLowerCase()}%` : null;

  const filterParams = [
    role,
    role, // user_type
    status,
    status, // is_active
    approval,
    approval,
    approval, // approval: null=all, 0=pending only, 1=exclude pending
    search, // search trigger
    searchPattern, // LIKE full_name
    searchPattern, // LIKE email
  ];

  // filterParams = 9 params — same for both queries ✓
  const [rows] = await pool.query(adminModel.getFilteredUsers, [...filterParams, limit, offset]);
  const [count] = await pool.query(adminModel.getFilteredUsersCount, filterParams);

  return {
    data: rows,
    pagination: {
      total: count[0].total,
      page,
      limit,
      totalPages: Math.ceil(count[0].total / limit),
    },
  };
};

export const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = 'ILP@';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const createTeacherAccount = async (data) => {
  try {
    const [checkMail] = await pool.execute(authModel.CHECK_EMAIL_EXISTS, [data.email]);
    if (checkMail.length > 0) {
      throw new Error('Email already exists');
    }
    const tempPassword = generateTempPassword();
    console.log(tempPassword);
    const hashed_password = await bcrypt.hash(tempPassword, 10);

    const [result] = await pool.execute(adminModel.addNewTeacher, [
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      hashed_password,
      'teacher',
    ]);

    const userId = result.insertId;
    await pool.execute(adminModel.addTeacherDetails, [userId, data.department]);
    const requiredData = { data, tempPassword };
    await emailHelper.credentailsEmail(requiredData);
    return userId;
  } catch (error) {
    console.error('Error adding new teacher:', error);
    throw error;
  }
};

export const sendAdminInvitationMail = async (data, invited_by) => {
  const { email, role, permissions } = data;
  const [check] = await pool.execute(CHECK_EMAIL_EXISTS, [email]);
  if (check.length > 0) {
    throw new Error('Email already exists');
  }

  const [invitationCheck] = await pool.execute(adminModel.CHECK_INVITATION_EMAIL, [email]);
  if (invitationCheck.length > 0) {
    throw new Error('An invitation has already been sent to this email');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  console.log(rawToken);

  // console.log("email : ", email, " role: ", role, " permissions: ", permissions, " invited_by: ", invited_by, " expiresAt: ", expiresAt );

  const [result] = await pool.execute(adminModel.INSERT_ADMIN_INVITATION, [
    email,
    role,
    JSON.stringify(permissions),
    tokenHash,
    invited_by,
    expiresAt,
  ]);

  const invitationLink = `${process.env.FRONTEND_URL}/admin-invitation?token=${rawToken}`;
  const invitationData = { email, invitationLink, expiresAt };
  await emailHelper.sendAdminInvitation(invitationData);
  return true;
};

export const verifyAdminInvitationMail = async (token, password, first_name, last_name, phone) => {
  console.log('token is :', token);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.execute(adminModel.GET_INVITATION_BY_TOKEN, [tokenHash]);
  console.log('Rows data is :', rows);
  if (rows.length === 0) {
    return { success: false, message: 'Invalid or expired invitation token' };
  }
  await pool.execute(adminModel.MARK_INVITATION_USED, [rows[0].invitation_id]);

  const hashed_password = await bcrypt.hash(password, 10);
  console.log('Password :', hashed_password);
  const { email, role, permissions } = rows[0];
  console.log('email', email, 'role', role, 'permissions', permissions);
  console.log('firstname', first_name, 'lastname', last_name);

  const [result] = await pool.execute(adminModel.ADD_ADMIN_TO_USERS, [
    email,
    hashed_password,
    first_name,
    last_name,
    phone,
  ]);
  const userId = result.insertId;
  await pool.execute(adminModel.ADD_NEW_ADMIN, [userId, role, JSON.stringify(permissions)]);

  return { success: true, message: 'Admin registered successfully' };
};


export const getAllTeachersService = async (filters) => {
  let query = adminModel.GET_ALL_TEACHERS_WITH_FILTERS;
  const conditions = [];
  const values = [];

  if (filters.department) {
    conditions.push("t.department = ?");
    values.push(filters.department);
  }

  if (filters.rating) {
    conditions.push("t.rating >= ?");
    values.push(filters.rating);
  }

  if (filters.is_verified !== undefined) {
    conditions.push("t.is_verified = ?");
    values.push(filters.is_verified);
  }

  if (filters.min_students) {
    conditions.push("t.total_students_taught >= ?");
    values.push(filters.min_students);
  }

  if (filters.min_courses) {
    conditions.push("t.total_courses_created >= ?");
    values.push(filters.min_courses);
  }

  if (conditions.length > 0) {
    query += " AND " + conditions.join(" AND ");
  }

  query += " ORDER BY t.rating DESC";

  const [rows] = await pool.execute(query, values);

  return rows;
};