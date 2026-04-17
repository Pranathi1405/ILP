/**
 * AUTHORS: Sathvik Goli,
 * Authentication Controller
 * ========================
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 */
import * as authService from "../services/auth.services.js";

import {
  emailRegex,
  passwordRegex,
  phoneRegex,
  otpRegex,
  // linkCodeRegex,
} from '../utils/validators.js';
const DEVICE_LIMIT = 20;

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, //change it back to 15 min
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
};

export const initiateSignup = async (req, res) => {
  try {
    const { email, password, user_type, first_name, last_name, phone } = req.body;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be 8+ characters and include uppercase, lowercase, number & special character.',
      });
    }
    if (!phone || !phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a valid Indian phone number.' });
    }
    if (!first_name || !last_name) {
      return res
        .status(400)
        .json({ success: false, message: 'First name and last name are required.' });
    }
    const validRoles = ['student', 'teacher', 'parent'];
    if (!user_type || !validRoles.includes(user_type)) {
      return res
        .status(400)
        .json({ success: false, message: `user_type must be one of: ${validRoles.join(', ')}.` });
    }

    // Role-specific field validation
    // if (user_type === 'parent' && req.body.child_link_code) {
    //   if (!linkCodeRegex.test(req.body.child_link_code)) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: 'Invalid student link code format (e.g. STU-A1B2C3).' });
    //   }
    // }
    const user_id = await authService.initiateSignup(req.body);

    return res.status(200).json({
      success:true,
      message: 'OTP sent to your email. Verify to complete signup.',
      user_id,
    });
  } catch (err) {
    console.log(err.message);
    return res.status(err.status || 500).json({ message: err.message });
  }
};

// ── SIGNUP — STEP 2: VERIFY OTP + COMPLETE REGISTRATION ──────────────────────
/**
 * POST /auth/signup/verify-otp
 * Body: { user_id, otp,
 *         -- student: grade_level, section
 *         -- teacher: department, specialization, qualification, experience_years
 *         -- parent:  occupation, child_link_code, relationship_type
 *         -- admin:   adminRole, permissions }
 */
export const completeSignup = async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required.' });
    }
    if (!otp || !otpRegex.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' });
    }

    const { accessToken, refreshToken, user } = await authService.completeSignup(Number(user_id), otp, req);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Registration Completed Successfully',
      user,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};
// ── RESEND OTP ────────────────────────────────────────────────────────────────
/**
 * POST /auth/resend-otp
 * Body: { user_id, email, purpose }   purpose: "registration" | "login"
 */
export const resendOtp = async (req, res) => {
  try {
    const { user_id, email, purpose } = req.body;

    if (!user_id || !email) {
      return res.status(400).json({ message: 'user_id and email are required.' });
    }
    const validPurposes = ['registration', 'login'];
    if (!purpose || !validPurposes.includes(purpose)) {
      return res.status(400).json({ success:false, message: "purpose must be 'registration' or 'login'." });
    }

    await authService.resendOtp(Number(user_id), email, purpose);

    return res.status(200).json({success:true, message: 'OTP resent successfully.' });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

export const initiateLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success:false, message: 'Enter a valid email address.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const { user_id, role } = await authService.initiateLogin(email, password);

    return res.status(200).json({
      success: true,
      message: 'Credentials verified. OTP sent to your email.',
      user_id,
      role,
    });
  } catch (err) {
    console.log("error from initiate :",err.message)
    return res.status(err.status || 500).json({ message: err.message });
  }
};
export const completeLogin = async (req, res) => {
  try {
    const { user_id, otp } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required.' });
    }
    if (!otp || !otpRegex.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' });
    }

    const result = await authService.completeLogin(Number(user_id), otp, req);
    if(result.limitReached){
      return res.status(409).json({
        success:        false,
        limitReached:   true,
        user_id,
        activeSessions: result.activeSessions,
        message:        `Device limit reached (${DEVICE_LIMIT}). Remove a device to continue.`,
      })
    }
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const user = result.user;
    console.log("user response is :", user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user,
    });
  } catch (err) {
    console.log("Error from complete :", err.message);
    return res.status(err.status || 500).json({ message: err.message });
  }
};

export const removeSessionAndLogin = async (req, res) => {
  try {
    const { user_id, tokenId } = req.body;
    const user = await authService.removeSessionAndLogin(user_id, tokenId, req);

    const setcookies = setAuthCookies(res, user.accessToken, user.refreshToken);
    return res.status(200).json({
      success:true,
      message:"User Login Successful",
      data:"Log Saved Successfully"
    })
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
/**
 * POST /auth/refresh-token
 * Reads refreshToken from cookie; rotates and issues new pair.
 */
export const rotateRefreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    const { accessToken, refreshToken, user } = await authService.rotateRefreshToken(oldRefreshToken, req);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      user,
      expiresIn: 24 * 60 * 60,
    });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(err.status || 401).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const user_id= req.user.id;
    // console.log("UserId is :",user_id);
    await authService.logoutUser(refreshToken, user_id, req);
    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const logoutAll = async (req, res) => {
  try {
    await authService.logoutAllDevices(req.user.id);
    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out from all devices.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// export const getStudents = async (req, res) => {
//   try {
//     const students = await authService.getAllStudents();
//     return res.status(200).json({ success:true, data: students });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// export const getTeachers = async (req, res) => {
//   try {
//     const teachers = await authService.getAllTeachers();
//     return res.status(200).json({ data: teachers });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// export const getParents = async (req, res) => {
//   try {
//     const parents = await authService.getAllParents();
//     return res.status(200).json({ data: parents });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

export const sendResetLink = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const data = await authService.sendResetLink(req.body.email);
    if (data) {
      return res
        .status(200)
        .json({ success: true, message: 'Reset link sent to email successfully.' });
    }
    return res
      .status(400)
      .json({ success: false, message: 'There was an error sending the email.' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const  resetPassword = async (req, res) => {
  try {
    if (!req.body.token || !req.body.password) {
      return res.status(400).json({ success: false, message: 'Token and password are required.' });
    }
    const data = await authService.resetPassword(req.body.token, req.body.password);
    if (!data) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }
    return res.status(200).json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
