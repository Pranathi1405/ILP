//Authors : Sathvik Goli
// Admin Model - Contains SQL queries for admin related database operations

export const getActiveStudents = `
  SELECT COUNT(*) AS total_students from users where user_type = 'student' and is_active = true
`;

export const getTeacherCount = `
  SELECT 
  COUNT(*) AS totalTeachers,
  SUM(is_verified = 1) AS verifiedTeachers,
  SUM(is_verified = 0) AS pendingTeachers
FROM teachers;
`;

export const getTotalParents = `
  SELECT COUNT(*) AS total_parents from users where user_type = 'parent' and is_active = true
`;

export const getFilteredUsersCount = `
  SELECT COUNT(*) AS total
  FROM users u
  LEFT JOIN teachers t ON u.user_id = t.user_id AND u.user_type = 'teacher'
  WHERE
    (? IS NULL OR u.user_type = ?)
    AND (? IS NULL OR u.is_active = ?)
    AND (
      ? IS NULL                                              -- no approval filter (All)
      OR (? = 0 AND u.user_type = 'teacher' AND t.is_verified = 0)  -- pending filter
      OR (? = 1 AND (u.user_type != 'teacher' OR t.is_verified = 1)) -- active/suspended: exclude pending teachers
    )
    AND (? IS NULL OR (
      LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE ? OR
      LOWER(u.email) LIKE ?
    ));
`;

export const getFilteredUsers = `
  SELECT 
    u.user_id, 
    u.email, 
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.created_at AS joined_date, 
    u.user_type AS role, 
    u.is_active AS status,
    t.is_verified AS approval
  FROM users u 
  LEFT JOIN teachers t ON u.user_id = t.user_id AND u.user_type = 'teacher'
  WHERE
    (? IS NULL OR u.user_type = ?)
    AND (? IS NULL OR u.is_active = ?)
    AND (
      ? IS NULL                                              -- no approval filter (All)
      OR (? = 0 AND u.user_type = 'teacher' AND t.is_verified = 0)  -- pending filter
      OR (? = 1 AND (u.user_type != 'teacher' OR t.is_verified = 1)) -- active/suspended: exclude pending teachers
    )
    AND (? IS NULL OR (
      LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE ? OR
      LOWER(u.email) LIKE ?
    ))
  ORDER BY u.created_at DESC
  LIMIT ? OFFSET ?;
`;

export const getStudentDetailsById = `
  SELECT u.user_id, u.email, u.first_name, u.last_name,
         u.phone, u.is_active,
         s.student_id, s.grade_level, s.section,
         s.parent_link_code, s.enrollment_date  from users u
  JOIN students s ON s.user_id = u.user_id
  WHERE u.user_id = ? AND u.is_active = TRUE
`;

export const getParentDetailsById = `
  SELECT u.user_id, u.email, u.first_name, u.last_name,
         u.phone, u.is_active,
         p.parent_id, p.occupation from users u 
    JOIN parents p ON p.user_id = u.user_id
    WHERE u.user_id = ? AND u.is_active = TRUE
`;

export const getParentLinkCountById = `
  SELECT COUNT(*) AS linked_children from parent_student_relationship
    WHERE parent_id = ?
`;

export const getTeacherDetailsById = `
  SELECT u.user_id, u.email, u.first_name, u.last_name,
         u.phone, u.is_active,
         t.teacher_id, t.department, t.specialization,
         t.qualification, t.experience_years, t.rating, t.is_verified from users u 
    JOIN teachers t ON t.user_id = u.user_id
    WHERE u.user_id = ? AND u.is_active = TRUE
`;

export const getAdminDetailsById = `
  SELECT u.user_id, u.email, u.first_name, u.last_name,
         u.phone, u.is_active,
         a.role, a.permissions from users u
    JOIN admins a ON u.user_id = a.user_id
    WHERE u.user_id = ? AND u.is_active = TRUE
`;

export const suspendAccountByUserId = `
  UPDATE users SET is_active = FALSE WHERE user_id = ?
`;

export const reinstateAccountByUserId = `
    UPDATE users SET is_active = TRUE WHERE user_id = ?
`;

export const approveTeacherById = `
  UPDATE teachers SET is_verified = TRUE WHERE user_id = ?
`;

export const rejectTeacherById = `
  delete from users where user_id = ?
`;

export const approveAdminById = `
  UPDATE admins SET user_type = 'admin' WHERE user_id = ?
`;

export const addNewTeacher = `
  INSERT INTO users (first_name,last_name,email,phone,password_hash,user_type,is_active,is_email_verified) VALUES (?,?,?,?,?,? ,TRUE,TRUE)
`;

export const addTeacherDetails = `
  INSERT INTO teachers (user_id, department, is_verified) VALUES (?,?,TRUE)
`;

export const INSERT_ADMIN_INVITATION = `
  INSERT INTO admin_invitations (email, role, permissions, token_hash, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)
`;

export const GET_INVITATION_BY_TOKEN = `
  SELECT * FROM admin_invitations WHERE token_hash  = ? AND is_used = FALSE AND expires_at>NOW() LIMIT 1
`;

export const MARK_INVITATION_USED = `
  UPDATE admin_invitations SET is_used = TRUE WHERE invitation_id = ?
`;

export const CHECK_INVITATION_EMAIL = `
  SELECT invitation_id FROM admin_invitations WHERE email = ?
    AND is_used  = FALSE
    AND expires_at > NOW()
  LIMIT 1
`;

export const GET_ALL_ADMINS = `
  SELECT
    u.user_id, u.email, u.first_name, u.last_name,
    u.is_active, u.created_at,
    a.role, a.permissions, a.is_verified
  FROM users u
  JOIN admins a ON u.user_id = a.user_id
  WHERE u.user_type = 'admin'
  ORDER BY u.created_at DESC
`;

export const GET_ADMIN_BY_USER_ID = `
  SELECT a.role, a.permissions
  FROM admins a
  WHERE a.user_id = ?
  LIMIT 1
`;

export const ADD_ADMIN_TO_USERS = `
  INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, is_active,is_email_verified) VALUES (?, ?, "admin", ?, ?, ?, TRUE, TRUE)
`;

export const ADD_NEW_ADMIN = `
  INSERT INTO admins (user_id, role, permissions) VALUES (?, ?, ?)
`;

export const GET_ALL_TEACHERS_WITH_FILTERS = `
  SELECT 
    t.teacher_id,
    CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
    t.department
  FROM teachers t
  JOIN users u ON u.user_id = t.user_id
  WHERE u.is_active = TRUE
`;