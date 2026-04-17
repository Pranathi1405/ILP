// ============================================================
// AUTHORS: Sathvik Goli,
// Authentication Related Queries
// AUTH QUERIES  — aligned with ILP Schema v4
// Central users table + role profile tables
// OTP table uses user_id (not email)
// ============================================================

// ── USERS ────────────────────────────────────────────────────────────────────

export const CHECK_EMAIL_EXISTS = `
  SELECT user_id
  FROM users
  WHERE email = ?
  LIMIT 1
`;

export const INSERT_USER = `
  INSERT INTO users
    (email, password_hash, user_type,
     first_name, last_name, phone,
     date_of_birth, gender,
     address, city, state, country, postal_code)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const INSERT_PENDING_SIGNUP=`
  INSERT INTO pending_signups(
  user_id,email,user_type,data
  ) values (?,?,?,?)
`

export const MARK_EMAIL_VERIFIED = `
  UPDATE users
  SET is_email_verified = TRUE,
      email_verified_at = NOW()
  WHERE user_id = ?
`;

export const deletePendingSignup = `
  DELETE FROM pending_signups WHERE user_id = ?
`
export const deleteUsers = `
  DELETE FROM users WHERE user_id = ?
`

export const GET_USER_BY_ID = `
  SELECT user_id, user_type, email,
         first_name, last_name, phone,
         is_active, is_email_verified
  FROM users
  WHERE user_id = ? AND is_active = TRUE
  LIMIT 1
`;
export const GET_ROLE_DATA = `
  SELECT data from pending_signups where user_id = ?
`

export const GET_USER_BY_EMAIL = `
  SELECT user_id, email, password_hash, user_type,
         first_name, last_name, is_active, is_email_verified
  FROM users
  WHERE email = ? AND is_active = TRUE
  LIMIT 1
`;

export const UPDATE_LAST_LOGIN = `
  UPDATE users SET last_login_at = NOW() WHERE user_id = ?
`;

// ── OTP ──────────────────────────────────────────────────────────────────────

export const INSERT_OTP = `
  INSERT INTO otp_verification
    (user_id, role, otp_code, purpose, expires_at)
  VALUES (?, ?, ?, ?, ?)
`;

export const GET_VALID_OTP = `
  SELECT otp_id
  FROM otp_verification
  WHERE user_id   = ?
    AND otp_code  = ?
    AND purpose   = ?
    AND Is_verified = FALSE
    AND expires_at  > NOW()
  ORDER BY created_at DESC
  LIMIT 1
`;

export const MARK_OTP_VERIFIED = `
  UPDATE otp_verification
  SET Is_verified = TRUE
  WHERE otp_id = ?
`;

export const DELETE_OLD_OTPS = `
  DELETE FROM otp_verification
  WHERE user_id = ? AND purpose = ?
`;

// ── REFRESH TOKENS ───────────────────────────────────────────────────────────

export const INSERT_REFRESH_TOKEN = `
INSERT INTO refresh_tokens
      (user_id, role, token_hash, expires_at, ip_address, user_agent, device_info, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
`;
export const INSERT_INTO_ACTIVITY_LOGS = `
    INSERT INTO activity_logs (user_id, activity_type, activity_description,
    related_entity_type, related_entity_id, ip_address, user_agent, metadata) 
    VALUES (?, 'login', ?, 'user', ?, ?, ?, ?)`
;

export const INSERT_ACTIVITY_LOGS = `
  INSERT INTO activity_logs
      (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
    VALUES (?, 'logout', 'Removed session to free device slot', 'refresh_tokens', ?)
`;

export const INSERT_LOGOUT_LOGS = `
      INSERT INTO activity_logs (user_id, activity_type, activity_description,
    related_entity_type, related_entity_id, ip_address, user_agent, metadata) 
    VALUES (?, 'logout', ?, 'user', ?, ?, ?, ?)
`;

export const GET_SESSIONS = `
   SELECT token_id, device_info, ip_address, created_at, last_used_at
    FROM refresh_tokens
    WHERE user_id = ? AND is_revoked = FALSE AND expires_at > NOW()
    ORDER BY last_used_at DESC
`;

export const VERIFY_USER_SESSION = `
   SELECT token_id FROM refresh_tokens
    WHERE token_id = ? AND user_id = ?
`;

export const DELETE_SESSION = `
  DELETE FROM refresh_tokens WHERE token_id = ?
`;


export const GET_ACTIVE_SESSION = `
  SELECT token_id, device_info, ip_address, created_at, last_used_at
    FROM refresh_tokens
    WHERE user_id = ?
      AND is_revoked = FALSE
      AND expires_at > NOW()
    ORDER BY last_used_at DESC
`

export const GET_CURRENT_SESSION = `
   SELECT token_id, device_info, ip_address, created_at, last_used_at
    FROM refresh_tokens
    WHERE user_id = ? AND WHERE token_hash = ?
      AND is_revoked = FALSE
      AND expires_at > NOW()
    ORDER BY last_used_at DESC
`

export const GET_REFRESH_TOKEN = `
  SELECT token_id, user_id, role, expires_at
  FROM refresh_tokens
  WHERE token_hash = ?
    AND is_revoked  = FALSE
    AND expires_at  > NOW()
  LIMIT 1
`;

export const REVOKE_REFRESH_TOKEN = `
  UPDATE refresh_tokens
  SET is_revoked = TRUE, revoked_at = NOW()
  WHERE token_hash = ?
`;

export const REVOKE_ALL_USER_TOKENS = `
  UPDATE refresh_tokens
  SET is_revoked = TRUE, revoked_at = NOW()
  WHERE user_id = ? AND is_revoked = FALSE
`;

// ── ROLE PROFILES ─────────────────────────────────────────────────────────────

export const INSERT_STUDENT_PROFILE = `
  INSERT INTO students
    (user_id, grade_level, section,
     enrollment_date, parent_link_code)
  VALUES (?, ?, ?, CURDATE(), ?)
`;

export const INSERT_TEACHER_PROFILE = `
  INSERT INTO teachers
    (user_id, department)
  VALUES (?, ?)
`;

export const INSERT_PARENT_PROFILE = `
  INSERT INTO parents (user_id, occupation, relationship_type)
  VALUES (?, ?, ?)
`;

export const INSERT_ADMIN_PROFILE = `
  INSERT INTO admins (user_id, role, permissions)
  VALUES (?, ?, ?)
`;

// parent → child link
export const GET_STUDENT_BY_LINK_CODE = `
  SELECT student_id FROM students
  WHERE parent_link_code = ?
  LIMIT 1
`;

export const INSERT_PARENT_STUDENT_RELATION = `
  INSERT INTO parent_student_relationship
    (parent_id, student_id, relationship_type)
  VALUES (?, ?, ?)
`;

export const GET_STUDENT_ID_BY_USER_ID = `
  SELECT student_id FROM students WHERE user_id = ? LIMIT 1
`;

// ── LIST ENDPOINTS ────────────────────────────────────────────────────────────

// export const GET_ALL_STUDENTS = `
//   SELECT u.user_id, u.email, u.first_name, u.last_name,
//          u.phone, u.is_active,
//          s.student_id, s.grade_level, s.section,
//          s.parent_link_code, s.enrollment_date
//   FROM users u
//   JOIN students s ON s.user_id = u.user_id
//   WHERE u.is_active = TRUE
//   ORDER BY u.created_at DESC
// `;

// export const GET_ALL_TEACHERS = `
//   SELECT u.user_id, u.email, u.first_name, u.last_name,
//          u.phone, u.is_active,
//          t.teacher_id, t.department, t.rating, t.is_verified
//   FROM users u
//   JOIN teachers t ON t.user_id = u.user_id
//   WHERE u.is_active = TRUE
//   ORDER BY u.created_at DESC
// `;

// export const GET_ALL_PARENTS = `
//   SELECT u.user_id, u.email, u.first_name, u.last_name,
//          u.phone, u.is_active,
//          p.parent_id, p.occupation
//   FROM users u
//   JOIN parents p ON p.user_id = u.user_id
//   WHERE u.is_active = TRUE
//   ORDER BY u.created_at DESC
// `;

export const UPDATE_PASSWORD = `
  UPDATE users set password_hash = ? where user_id = ?
`;

export const STORE_TOKEN = `
  INSERT INTO password_resets (user_id,email,reset_token,expires_at)
  VALUES (?, ?, ?, ?);
`;

export const GET_RESET_TOKEN = `
  SELECT reset_token, user_id, expires_at, is_used from password_resets
  where reset_token = ?
  AND is_used = false
  AND expires_at > NOW()
  LIMIT 1
`;

export const MARK_TOKEN_USED = `
  UPDATE password_resets SET is_used = true
  WHERE reset_token = ?
`

export const GET_PROFILE_BY_ID = `
  SELECT email,first_name,last_name,phone,is_active,is_email_verified from users WHERE user_id = ?
`

export const CHECK_OLD_PASSWORD = `
  SELECT user_id FROM users WHERE password_hash = ?
`
export const GET_OLD_PASSWORD = `
  SELECT password_hash FROM users WHERE user_id = ?
`

export const GET_ADMIN_PERMISSIONS = `
  SELECT permissions FROM admins WHERE user_id = ? LIMIT 1
`

export const checkTeacherApproval = `
  SELECT is_verified FROM teachers WHERE user_id = ?
`