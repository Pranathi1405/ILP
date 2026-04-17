/**
 * AUTHORS: Sathvik Goli,
 * User Authentication
 * */

// ============================================================
// AUTH SERVICES  — ILP Schema v4
// All DB operations live here. Controller stays thin.
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import pool from '../config/database.config.js';
import { generateOtp } from '../utils/generateOtp.js';
import * as emailHelper from '../utils/emailHelper.js';
import * as authModel from '../models/auth.models.js';
//import analytics events to update the analytics tables
import { ANALYTICS_EVENTS } from '../constants/analyticsTypes.js';
import { emitAnalyticsEvent } from '../queues/analyticsQueue.js';
// ── HELPERS ──────────────────────────────────────────────────────────────────

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateLinkCode = () => `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

const DEVICE_LIMIT = 20;

const normalizePermissions = (permissions) => {
  if (!permissions) return null;
  if (typeof permissions === 'string') {
    try {
      return JSON.parse(permissions);
    } catch {
      return null;
    }
  }
  return permissions;
};

const buildSessionUser = (user) => {
  const sessionUser = {
    user_id: user.user_id,
    email: user.email,
    userType: user.user_type,
    firstName: user.first_name,
    lastName: user.last_name,
  };

  if ((user.user_type === 'admin' || user.user_type === 'super_admin') && user.permissions) {
    sessionUser.permissions = normalizePermissions(user.permissions);
  }

  return sessionUser;
};

const signTokens = (user) => {
  const payload = { id: user.user_id, role: user.user_type };

  if (user.user_type === 'admin') {
    payload.permissions = normalizePermissions(user.permissions);
  }

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// ── OTP HELPERS ──────────────────────────────────────────────────────────────

export const createAndSendOtp = async (user_id, email, purpose) => {
  // Remove previous OTPs for this user+purpose to avoid stale rows
  await pool.execute(authModel.DELETE_OLD_OTPS, [user_id, purpose]);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.execute(authModel.INSERT_OTP, [user_id, null, otp, purpose, expiresAt]);
  
  const data = { email, otp, purpose, expiresAt}
  await emailHelper.createAndSendOtp(data);
  console.log(`[OTP] ${purpose} OTP for ${email}: ${otp} ExpiresAt: ${expiresAt}`); 
};

//Verifies an OTP. Returns the otp_id on success, null on failure.
export const verifyOtp = async (user_id, otp, purpose) => {
  const [rows] = await pool.execute(authModel.GET_VALID_OTP, [user_id, otp, purpose]);
  if (rows.length === 0) return null;

  const { otp_id } = rows[0];
  await pool.execute(authModel.MARK_OTP_VERIFIED, [otp_id]);
  return otp_id;
};
// ── device ip helpers ───────────────────────────────────────────────────────────────────
const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip
)?.replace('::ffff:', '');

const getDeviceInfo = (req) => {
  const parser  = new UAParser(req.headers['user-agent']);
  const browser = parser.getBrowser();
  const os      = parser.getOS();
  const device  = parser.getDevice();
  return `${browser.name || 'Unknown'} ${browser.version || ''} / ${os.name || 'Unknown'} ${os.version || ''} / ${device.type || 'desktop'}`.trim();
};

export const initiateSignup = async (data) => {
  // console.log("Data called in initial: ",data);
  const {
    email,
    password,
    user_type,
    first_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    state,
    country = 'India',
    postal_code,
  } = data;

  //Duplicate check
  const [existing] = await pool.execute(authModel.CHECK_EMAIL_EXISTS, [email]);
  if (existing.length > 0) {
    const [isverified] = await pool.execute(
      'select is_email_verified from users where email = ? ',
      [email]
    );
    if (isverified[0].is_email_verified) {
      throw Object.assign(new Error('Email already registered. Please Login'), { status: 409 });
    } else {
      await pool.execute(authModel.deletePendingSignup, [existing[0].user_id]);
      await pool.execute(authModel.deleteUsers, [existing[0].user_id]);
    }
  }

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  const [result] = await pool.execute(authModel.INSERT_USER, [
    email,
    password_hash,
    user_type,
    first_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    state,
    country,
    postal_code,
  ]);
  const user_id = result.insertId;
  let datarole = {};
  if (user_type === 'student') {
    datarole = {
      grade_level: data.grade_level,
      section: data.section,
    };
  } else if (user_type === 'parent') {
    datarole = {
      occupation: data.occupation,
      child_link_code: data.child_link_code,
      relationship_type: data.relationship_type,
    };
  } else if (user_type === 'teacher') {
    datarole = {
      department: data.department,
    };
  }
  const dataroleJson = JSON.stringify(datarole);
  const [pending] = await pool.execute(authModel.INSERT_PENDING_SIGNUP, [
    user_id,
    email,
    user_type,
    dataroleJson,
  ]);

  await createAndSendOtp(user_id, email, 'registration');

  return user_id;
};

// ── STEP 2: VERIFY SIGNUP OTP + CREATE ROLE PROFILE ─────────────────────────

/**
 * Verifies OTP → marks email verified → creates role-specific profile.
 * roleData contains role-specific extra fields.
 */
export const completeSignup = async (user_id, otp, req) => {
  // 1. Get user
  const [userRows] = await pool.execute(authModel.GET_USER_BY_ID, [user_id]);
  if (userRows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  const user = userRows[0];

  // 2. Verify OTP
  console.log(otp);

  const otpId = await verifyOtp(user_id, otp, 'registration');
  if (!otpId) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
  }

  // 3. Mark email verified
  await pool.execute(authModel.MARK_EMAIL_VERIFIED, [user_id]);

  // 4. Create role profile (in a transaction where needed)
  const [rows] = await pool.execute(authModel.GET_ROLE_DATA, [user_id]);

  const roleData = rows[0];
  // console.log("roledata called in signup function",roleData.data);
  await createRoleProfile(user_id, user.user_type, roleData.data);

  // 5. Sign JWT tokens
  const { accessToken, refreshToken } = signTokens(user);


  // 6. Store hashed refresh token in DB
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const ip         = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  await pool.execute(authModel.INSERT_REFRESH_TOKEN, [
    user_id,
    user.user_type,
    tokenHash,
    expiresAt,
    ip,
    req.headers['user-agent'],
    deviceInfo,
  ]);
  await emitAnalyticsEvent(ANALYTICS_EVENTS.USER_REGISTERED, {
    userType: user.user_type,
  });
  return {
    accessToken,
    refreshToken,
    user: buildSessionUser(user),
  };
};

// ── ROLE PROFILE CREATOR ─────────────────────────────────────────────────────

const createRoleProfile = async (user_id, userType, roleData) => {
  // console.log("role data called in porfile:",roleData);
  switch (userType) {
    case 'student': {
      const linkCode = generateLinkCode();
      await pool.execute(authModel.INSERT_STUDENT_PROFILE, [
        user_id,
        roleData.grade_level || null,
        roleData.section || null,
        linkCode,
      ]);
      return { parentLinkCode: linkCode };
    }

    case 'teacher': {
      await pool.execute(authModel.INSERT_TEACHER_PROFILE, [user_id, roleData.department || null]);
      return {};
    }

    case 'parent': {
      // Parent registration requires a child link code — use a transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [parents] = await connection.execute(authModel.INSERT_PARENT_PROFILE, [
          user_id,
          roleData.occupation || null,
          roleData.relationship_type || null,
        ]);
        const parentId = parents.insertId;
        console.log(roleData.child_link_code);
        // Link to child if link code provided
        if (roleData.child_link_code) {
          const [studentRows] = await connection.execute(authModel.GET_STUDENT_BY_LINK_CODE, [
            roleData.child_link_code,
          ]);
          if (studentRows.length === 0) {
            throw Object.assign(new Error('Invalid child link code'), { status: 400 });
          }

          // const [parentRows] = await connection.execute(
          //   authModel.GET_PARENT_ID_BY_USER_ID,
          //   [user_id]
          // );
          // const parentId = parentRows[0].parent_id;
          const studentId = studentRows[0].student_id;

          await connection.execute(authModel.INSERT_PARENT_STUDENT_RELATION, [
            parentId,
            studentId,
            roleData.relationship_type || 'guardian',
          ]);
        }

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
      return {};
    }

    case 'admin': {
      await pool.execute(authModel.INSERT_ADMIN_PROFILE, [
        user_id,
        roleData.adminRole || 'admin',
        roleData.permissions ? JSON.stringify(roleData.permissions) : null,
      ]);
      return {};
    }

    default:
      throw Object.assign(new Error('Invalid user type'), { status: 400 });
  }
};

// ── LOGIN STEP 1: VALIDATE CREDENTIALS + SEND OTP ────────────────────────────

export const initiateLogin = async (email, password) => {
  const [rows] = await pool.execute(authModel.GET_USER_BY_EMAIL, [email]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }
  const user = rows[0];

  if (!user.is_active) {
    throw Object.assign(new Error('Account is deactivated. Contact support.'), { status: 403 });
  }
  if (!user.is_email_verified) {
    throw Object.assign(new Error('Email not verified. Please verify your email first.'), {
      status: 403,
    });
  }
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }
  await createAndSendOtp(user.user_id, email, 'login');

  return { user_id: user.user_id, role: user.user_type };
};

//Verify otp and complete login by issuing tokens

export const completeLogin = async (user_id, otp, req) => {
  const otpId = await verifyOtp(user_id, otp, 'login');
  if (!otpId) {
    throw Object.assign(new Error('Invalid or expired OTP'), { status: 401 });
  }
  // 2. Get user info for token payload
  const [rows] = await pool.execute(authModel.GET_USER_BY_ID, [user_id]);
  if (rows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  //Admins Response contains permissions in the payload for role-based access control in frontend
  const [adminpermissions] = await pool.execute(authModel.GET_ADMIN_PERMISSIONS, [user_id]);

  const user = rows[0];
  if (user.user_type === 'admin' || user.user_type === 'super_admin') {
    user.permissions = adminpermissions.length > 0
      ? normalizePermissions(adminpermissions[0].permissions)
      : null;
  }

    //──────── device limit check ───────────────────────────────────────────────
  const [activeSessions] = await pool.query(authModel.GET_ACTIVE_SESSION, [user_id]);
  console.log("Active Sessions are :",activeSessions);


  if (activeSessions.length >= DEVICE_LIMIT) {
    // don't issue token — return device list to frontend
    return {
      limitReached: true,
      user_id,
      activeSessions: activeSessions.map(s => ({
        tokenId:    s.token_id,
        deviceInfo: s.device_info || 'Unknown device',
        ipAddress:  s.ip_address  || 'Unknown IP',
        lastUsed:   s.last_used_at,
        loginDate:  s.created_at,
      })),
    };
  }

  // 3. Sign JWT tokens
  const { accessToken, refreshToken } = signTokens(user);

  // 4. Store hashed refresh token in DB
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const ip         = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  await pool.execute(authModel.INSERT_REFRESH_TOKEN, [
    user_id,
    user.user_type,
    tokenHash,
    expiresAt,
    ip,
    req.headers['user-agent'],
    deviceInfo,
  ]);

  // inserting into activity_logs
  const activity = await pool.query(authModel.INSERT_INTO_ACTIVITY_LOGS,[
     user_id,
    `Login from ${deviceInfo}`,
    user_id,
    ip,
    req.headers['user-agent'],
    JSON.stringify({ deviceInfo, ip }),
  ])
  console.log("inserted into activity logs",activity);

  // 5. Update last login
  await pool.execute(authModel.UPDATE_LAST_LOGIN, [user_id]);

  return {
    limitReached : false,
    accessToken,
    refreshToken,
    user: buildSessionUser(user),
  };
};

export const removeSessionAndLogin = async (user_id, tokenId, req) => {
  console.log("removesession called");

  // verify session belongs to this user
  const [session] = await pool.query(authModel.VERIFY_USER_SESSION, [tokenId, user_id]);

  if (!session.length) {
    throw Object.assign(new Error('Session not found'), { status: 404 });
  }

  // delete the selected session
  await pool.query(authModel.DELETE_SESSION, [tokenId]);

  // log to activity_logs


  const ip         = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  await pool.query(authModel.INSERT_INTO_ACTIVITY_LOGS,[
     user_id,
    `Removed session ${tokenId} and logged in from ${deviceInfo}`,
    user_id,
    ip,
    req.headers['user-agent'],
    JSON.stringify({ deviceInfo, ip }),
  ])

  // now complete login normally — slot is free
  // return await completeLogin(user_id, otp, req);
  const [rows] = await pool.query(authModel.GET_USER_BY_ID,[user_id]);
  const user = rows[0];
  if (user.user_type === 'admin' || user.user_type === 'super_admin') {
    const [adminpermissions] = await pool.execute(authModel.GET_ADMIN_PERMISSIONS, [user_id]);
    user.permissions = adminpermissions.length > 0
      ? normalizePermissions(adminpermissions[0].permissions)
      : null;
  }
  const { accessToken, refreshToken } = signTokens(user);

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.execute(authModel.INSERT_REFRESH_TOKEN, [
    user_id,
    user.user_type,
    tokenHash,
    expiresAt,
    ip,
    req.headers['user-agent'],
    deviceInfo,
  ]);
  return { accessToken, refreshToken, user: buildSessionUser(user) };
};

// get all active sessions for a user (settings page)
export const getActiveSessions = async (user_id) => {
  const [sessions] = await pool.query(authModel.GET_SESSIONS, [user_id]);
  return sessions;
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────

export const rotateRefreshToken = async (oldRefreshToken, req) => {
  const tokenHash = hashToken(oldRefreshToken);

  // 1. Validate token in DB
  const [rows] = await pool.execute(authModel.GET_REFRESH_TOKEN, [tokenHash]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }
  const { user_id, role } = rows[0];

  // 2. Verify JWT signature
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  // 3. Revoke old token (rotation)
  await pool.execute(authModel.REVOKE_REFRESH_TOKEN, [tokenHash]);

  // 4. Issue new tokens
  const [userRows] = await pool.execute(authModel.GET_USER_BY_ID, [user_id]);
  if (userRows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const user = userRows[0];
  if (role === 'admin' || role === 'super_admin') {
    const [adminpermissions] = await pool.execute(authModel.GET_ADMIN_PERMISSIONS, [user_id]);
    user.permissions = adminpermissions.length > 0
      ? normalizePermissions(adminpermissions[0].permissions)
      : null;
  }
  const { accessToken, refreshToken: newRefreshToken } = signTokens(user);

  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const ip         = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  await pool.execute(authModel.INSERT_REFRESH_TOKEN, [
    user_id,
    user.user_type,
    newHash,
    expiresAt,
    ip,
    req.headers['user-agent'],
    deviceInfo,
  ]);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: buildSessionUser(user),
  };
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────

export const logoutUser = async (refreshToken, user_id, req) => {

  if (!refreshToken) return;
  const ip         = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  const tokenHash = hashToken(refreshToken);
  await pool.execute(authModel.REVOKE_REFRESH_TOKEN, [tokenHash]);
  await pool.query(authModel.INSERT_LOGOUT_LOGS,[user_id,
    `Logout from ${deviceInfo}`,
    user_id,
    ip,
    req.headers['user-agent'],
    JSON.stringify({deviceInfo, ip})
  ]);
};

export const logoutAllDevices = async (user_id) => {
  await pool.execute(authModel.REVOKE_ALL_USER_TOKENS, [user_id]);
};

// ── RESEND OTP ────────────────────────────────────────────────────────────────

export const resendOtp = async (user_id, email, purpose) => {
  const [rows] = await pool.execute(authModel.GET_USER_BY_ID, [user_id]);
  if (rows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  await createAndSendOtp(user_id, email, purpose);
};

export const sendResetLink = async (email) => {
  const [rows] = await pool.execute(authModel.CHECK_EMAIL_EXISTS, [email]);
  if (rows.length == 0) {
    throw Object.assign(new Error('No User Exists With the Given Email'), { status: 400 });
  }
  const user_id = rows[0].user_id;
  const token = jwt.sign({ user_id: user_id }, process.env.JWT_SECRET, { expiresIn: '5m' });
  console.log(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.execute(authModel.STORE_TOKEN, [user_id, email, token, expiresAt]);

  const resetLink = `http://localhost:4200/reset-password/${token}`;
  const data = { email, resetLink, expiresAt };
  await emailHelper.sendResetLink(data);
  return true;
};

export const resetPassword = async (token, password) => {
  let decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user_id = decoded.user_id;
  const [tokenRows] = await pool.execute(authModel.GET_RESET_TOKEN, [token]);

  if (tokenRows.length === 0) {
    throw Object.assign(new Error('Reset link is invalid or has already been used.'), {
      status: 400,
    });
  }
  const [hash] = await pool.execute(authModel.GET_OLD_PASSWORD,[user_id]);
  let isMatch = await bcrypt.compare(password, hash[0].password_hash);

  if (isMatch) {
    throw new Error("Password should not be the same as old one");
  }
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password,salt);
  await pool.execute(authModel.UPDATE_PASSWORD, [hashed_password, user_id]);
  await pool.execute(authModel.MARK_TOKEN_USED, [token]);
  return true;
};

// ── LIST SERVICES ─────────────────────────────────────────────────────────────

export const getAllStudents = async () => {
  const [rows] = await pool.execute(authModel.GET_ALL_STUDENTS);
  return rows;
};

export const getAllTeachers = async () => {
  const [rows] = await pool.execute(authModel.GET_ALL_TEACHERS);
  return rows;
};

export const getAllParents = async () => {
  const [rows] = await pool.execute(authModel.GET_ALL_PARENTS);
  return rows;
};

export const getStudentData = async () => {
  const [result] = await pool.execute(authModel.GET_PROFILE_BY_ID, [user_id]);
  if (result.length == 0) {
    return null;
  }
  return result;
};

export const checkTeacherApproval = async (userId) => {
  console.log('User id is : ', userId);
  const [result] = await pool.query(authModel.checkTeacherApproval, [userId]);
  console.log(result);
  if (!result.length || !result[0].is_verified) {
    return false;
  }
  return true;
};
