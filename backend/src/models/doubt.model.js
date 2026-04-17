//AUTHOR -> Vamshi

//inserts doubt
export const INSERT_DOUBT = `
    INSERT INTO doubt_posts 
    (student_id, course_id, subject_id, assigned_teacher_id, question_text, deadline_at)
    VALUES (
       (SELECT student_id FROM students WHERE user_id=?),
       ?, ?, ?, ?, ?
    )
`;

//inserts attachments for doubt
export const INSERT_DOUBT_ATTACHMENT = `
  INSERT INTO doubt_attachments
  (doubt_id, response_id, uploader_id, file_type, file_url, file_name, file_size_kb)
  VALUES (?, NULL, ?, ?, ?, ?, ?)
`;

export const CHECK_ENROLLMENT = `
  SELECT 1
  FROM course_enrollments ce
  JOIN students s ON s.student_id = ce.student_id
  WHERE s.user_id = ?
    AND ce.course_id = ?
    AND ce.status = 'enrolled'
  LIMIT 1
`;

export const GET_DOUBTS_BY_STUDENT = `
    SELECT 
    d.doubt_id,
    d.question_text,
    d.course_id,
    c.course_name,
    d.subject_id,
    s.subject_name,
    d.status,
    d.created_at,
    COALESCE(MAX(dr.updated_at), d.updated_at) AS last_activity_at
  FROM doubt_posts d
  JOIN courses c ON d.course_id = c.course_id
  JOIN course_subjects s ON d.subject_id = s.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = d.doubt_id AND dr.is_deleted = 0
  WHERE d.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND d.is_deleted = 0
  GROUP BY d.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_DOUBTS_BY_STUDENT_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts d
  WHERE d.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND d.is_deleted = 0
`;
// ── Teacher: all doubts ──────────────────────────────────────────
export const GET_DOUBTS_FOR_TEACHER = `
  SELECT 
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    s.student_id,
    u.first_name AS student_name,
    dp.course_id,
    c.course_name,
    dp.subject_id,
    cs.subject_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN students s ON dp.student_id = s.student_id
  JOIN users u ON s.user_id = u.user_id
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id  
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE t.user_id = ?                                        
   GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_DOUBTS_FOR_TEACHER_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  WHERE t.user_id = ?
`;

// Insert teacher reply
export const INSERT_DOUBT_REPLY = `
  INSERT INTO doubt_responses
  (doubt_id, responder_id, responder_type, response_text)
  VALUES (?, ?, ?, ?)
`;

// Insert attachments for reply
export const INSERT_REPLY_ATTACHMENT = `
INSERT INTO doubt_attachments
(doubt_id, response_id, uploader_id, file_type, file_url, file_name, file_size_kb)
VALUES (NULL, ?, ?, ?, ?, ?, ?)
`;

export const UPDATE_DOUBT_STATUS = `
UPDATE doubt_posts
SET status = 'answered'
WHERE doubt_id = ?
`;


// export const GET_DOUBT_DETAIL = `
//   SELECT
//     dp.doubt_id,
//     dp.question_text,
//     dp.status,
//     dp.created_at AS doubt_created_at,

//     su.user_id AS student_id,
//     su.first_name AS student_first_name,
//     su.last_name AS student_last_name,
//     su.profile_picture_url AS student_avatar,

//     da.attachment_id AS doubt_attachment_id,
//     da.file_type AS doubt_file_type,
//     da.file_url AS doubt_file_url,
//     da.file_name AS doubt_file_name,
//     da.file_size_kb AS doubt_file_size_kb,

//     dr.response_id,
//     dr.response_text,
//     dr.responder_type,
//     dr.created_at AS reply_created_at,

//     ru.user_id AS responder_id,
//     ru.first_name AS responder_first_name,
//     ru.last_name AS responder_last_name,
//     ru.profile_picture_url AS responder_avatar,

//     ra.attachment_id AS reply_attachment_id,
//     ra.file_type AS reply_file_type,
//     ra.file_url AS reply_file_url,
//     ra.file_name AS reply_file_name,
//     ra.file_size_kb AS reply_file_size_kb

//   FROM doubt_posts dp
//   JOIN students s
//     ON s.student_id = dp.student_id        
//   JOIN users su
//     ON su.user_id = s.user_id              
//   LEFT JOIN doubt_attachments da
//     ON da.doubt_id = dp.doubt_id
//     AND da.response_id IS NULL
//   LEFT JOIN doubt_responses dr
//     ON dr.doubt_id = dp.doubt_id
//     AND dr.is_deleted = 0
//   LEFT JOIN users ru
//     ON ru.user_id = dr.responder_id
//   LEFT JOIN doubt_attachments ra
//     ON ra.response_id = dr.response_id
//     AND ra.doubt_id IS NULL

//   WHERE dp.doubt_id = ?
//     AND dp.is_deleted = 0
//   ORDER BY dr.created_at ASC
// `;


export const GET_DOUBT_DETAIL = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at AS doubt_created_at,

    su.user_id AS student_id,
    su.first_name AS student_first_name,
    su.last_name AS student_last_name,
    su.profile_picture_url AS student_avatar,


    tu.user_id AS teacher_id,
    tu.first_name AS teacher_first_name,
    tu.last_name AS teacher_last_name,
    tu.profile_picture_url AS teacher_avatar,

    da.attachment_id AS doubt_attachment_id,
    da.file_type AS doubt_file_type,
    da.file_url AS doubt_file_url,
    da.file_name AS doubt_file_name,
    da.file_size_kb AS doubt_file_size_kb,

    dr.response_id,
    dr.response_text,
    dr.responder_type,
    dr.created_at AS reply_created_at,

    ru.user_id AS responder_id,
    ru.first_name AS responder_first_name,
    ru.last_name AS responder_last_name,
    ru.profile_picture_url AS responder_avatar,

    ra.attachment_id AS reply_attachment_id,
    ra.file_type AS reply_file_type,
    ra.file_url AS reply_file_url,
    ra.file_name AS reply_file_name,
    ra.file_size_kb AS reply_file_size_kb

  FROM doubt_posts dp
  JOIN students s
    ON s.student_id = dp.student_id
  JOIN users su
    ON su.user_id = s.user_id
  JOIN teachers t                          
    ON t.teacher_id = dp.assigned_teacher_id
  JOIN users tu                           
    ON tu.user_id = t.user_id
  LEFT JOIN doubt_attachments da
    ON da.doubt_id = dp.doubt_id
    AND da.response_id IS NULL
  LEFT JOIN doubt_responses dr
    ON dr.doubt_id = dp.doubt_id
    AND dr.is_deleted = 0
  LEFT JOIN users ru
    ON ru.user_id = dr.responder_id
  LEFT JOIN doubt_attachments ra
    ON ra.response_id = dr.response_id
    AND ra.doubt_id IS NULL

  WHERE dp.doubt_id = ?
    AND dp.is_deleted = 0
  ORDER BY dr.created_at ASC
`;

export const GET_DOUBT_BY_ID = `
  SELECT 
    dp.doubt_id, 
    dp.student_id,
    s.user_id AS student_user_id,
    dp.assigned_teacher_id, 
    dp.status
  FROM doubt_posts dp
  JOIN students s ON s.student_id = dp.student_id
  WHERE dp.doubt_id = ? AND dp.is_deleted = 0
`;

export const GET_TEACHER_USER_ID = `
  SELECT user_id 
  FROM teachers 
  WHERE teacher_id = ?
`;

//Just add this one new query
export const GET_TEACHER_BY_USER_ID = `
  SELECT teacher_id
  FROM teachers
  WHERE user_id = ?
`;

// Student doubts by subject
// ── Student: by subject ──────────────────────────────────────────
export const GET_STUDENT_DOUBTS_BY_SUBJECT = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    dp.course_id,
    c.course_name,
     COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
    GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;


export const GET_STUDENT_DOUBTS_BY_SUBJECT_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
`;

// ── Student: by course ───────────────────────────────────────────
export const GET_STUDENT_DOUBTS_BY_COURSE = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.course_id = ?
    AND dp.is_deleted = 0
 GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_STUDENT_DOUBTS_BY_COURSE_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.course_id = ?
    AND dp.is_deleted = 0
`;

// ── Teacher: by subject ──────────────────────────────────────────
export const GET_TEACHER_DOUBTS_BY_SUBJECT = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    u.first_name AS student_name,
     COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  JOIN students s ON s.student_id = dp.student_id
  JOIN users u ON u.user_id = s.user_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.assigned_teacher_id = ?
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
   GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_TEACHER_DOUBTS_BY_SUBJECT_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.assigned_teacher_id = ?
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
`;

// ── Teacher: by course ───────────────────────────────────────────
export const GET_TEACHER_DOUBTS_BY_COURSE = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    u.first_name AS student_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  JOIN students s ON s.student_id = dp.student_id
  JOIN users u ON u.user_id = s.user_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.assigned_teacher_id = ?
    AND dp.course_id = ?
    AND dp.is_deleted = 0
   GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;


export const GET_TEACHER_DOUBTS_BY_COURSE_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.assigned_teacher_id = ?
    AND dp.course_id = ?
    AND dp.is_deleted = 0
`;

export const UPDATE_DOUBT_STATUS_RESOLVED = `
  UPDATE doubt_posts
  SET status = 'resolved'
  WHERE doubt_id = ?
`;



// Get enrolled courses for student dropdown
export const GET_STUDENT_ENROLLED_COURSES = `
  SELECT 
    c.course_id,
    c.course_name
  FROM course_enrollments ce
  JOIN courses c ON ce.course_id = c.course_id
  JOIN students s ON ce.student_id = s.student_id
  WHERE s.user_id = ?
    AND ce.status = 'enrolled'
  ORDER BY c.course_name ASC
`;

// Get subjects for a course (for subject dropdown)
export const GET_SUBJECTS_BY_COURSE = `
  SELECT 
    subject_id,
    subject_name
  FROM course_subjects
  WHERE course_id = ?
    AND is_active = 1
  ORDER BY subject_name ASC
`;


// Get courses assigned to teacher for dropdown
export const GET_TEACHER_COURSES = `
  SELECT DISTINCT
    c.course_id,
    c.course_name
  FROM course_subjects cs
  JOIN courses c ON cs.course_id = c.course_id
  JOIN teachers t ON cs.teacher_id = t.teacher_id
  WHERE t.user_id = ?
    AND cs.is_active = 1
  ORDER BY c.course_name ASC
`;

// Get subjects assigned to teacher for a course
export const GET_TEACHER_SUBJECTS_BY_COURSE = `
  SELECT 
    cs.subject_id,
    cs.subject_name
  FROM course_subjects cs
  JOIN teachers t ON cs.teacher_id = t.teacher_id
  WHERE t.user_id = ?
    AND cs.course_id = ?
    AND cs.is_active = 1
  ORDER BY cs.subject_name ASC
`;




// ── Student: search ──────────────────────────────────────────────
// ── Student: combined search + filters ──────────────────────────
export const SEARCH_STUDENT_DOUBTS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    dp.course_id,
    c.course_name,
    dp.subject_id,
    cs.subject_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.is_deleted = 0
    AND (? IS NULL OR dp.status = ?)
    AND (? IS NULL OR dp.course_id = ?)
    AND (? IS NULL OR dp.subject_id = ?)
    AND (
      ? IS NULL OR (
        dp.question_text LIKE ? OR
        c.course_name     LIKE ? OR
        cs.subject_name   LIKE ?
      )
    )
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const SEARCH_STUDENT_DOUBTS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.is_deleted = 0
    AND (? IS NULL OR dp.status = ?)
    AND (? IS NULL OR dp.course_id = ?)
    AND (? IS NULL OR dp.subject_id = ?)
    AND (
      ? IS NULL OR (
        dp.question_text LIKE ? OR
        c.course_name     LIKE ? OR
        cs.subject_name   LIKE ?
      )
    )
`;

// ── Teacher: combined search + filters ──────────────────────────
export const SEARCH_TEACHER_DOUBTS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    dp.course_id,
    c.course_name,
    dp.subject_id,
    cs.subject_name,
    u.first_name AS student_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  JOIN students s ON dp.student_id = s.student_id
  JOIN users u ON u.user_id = s.user_id
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE t.user_id = ?
    AND dp.is_deleted = 0
    AND (? IS NULL OR dp.status = ?)
    AND (? IS NULL OR dp.course_id = ?)
    AND (? IS NULL OR dp.subject_id = ?)
    AND (
      ? IS NULL OR (
        dp.question_text LIKE ? OR
        c.course_name     LIKE ? OR
        cs.subject_name   LIKE ?
      )
    )
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const SEARCH_TEACHER_DOUBTS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  WHERE t.user_id = ?
    AND dp.is_deleted = 0
    AND (? IS NULL OR dp.status = ?)
    AND (? IS NULL OR dp.course_id = ?)
    AND (? IS NULL OR dp.subject_id = ?)
    AND (
      ? IS NULL OR (
        dp.question_text LIKE ? OR
        c.course_name     LIKE ? OR
        cs.subject_name   LIKE ?
      )
    )
`;


// ── Student: all doubts by status ───────────────────────────────
export const GET_DOUBTS_BY_STUDENT_STATUS = `
  SELECT 
    d.doubt_id,
    d.question_text,
    d.course_id,
    c.course_name,
    d.subject_id,
    s.subject_name,
    d.status,
    d.created_at,
    COALESCE(MAX(dr.updated_at), d.updated_at) AS last_activity_at
  FROM doubt_posts d
  JOIN courses c ON d.course_id = c.course_id
  JOIN course_subjects s ON d.subject_id = s.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = d.doubt_id AND dr.is_deleted = 0
  WHERE d.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND d.is_deleted = 0
    AND d.status = ?
  GROUP BY d.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_DOUBTS_BY_STUDENT_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts d
  WHERE d.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND d.is_deleted = 0
    AND d.status = ?
`;

// ── Teacher: all doubts by status ───────────────────────────────
export const GET_DOUBTS_FOR_TEACHER_STATUS = `
  SELECT 
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    s.student_id,
    u.first_name AS student_name,
    dp.course_id,
    c.course_name,
    dp.subject_id,
    cs.subject_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN students s ON dp.student_id = s.student_id
  JOIN users u ON s.user_id = u.user_id
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON dp.subject_id = cs.subject_id
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE t.user_id = ?
    AND dp.status = ?
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_DOUBTS_FOR_TEACHER_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  WHERE t.user_id = ?
    AND dp.status = ?
`;

// ── Student: by subject + status ────────────────────────────────
export const GET_STUDENT_DOUBTS_BY_SUBJECT_STATUS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    dp.course_id,
    c.course_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN courses c ON dp.course_id = c.course_id
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_STUDENT_DOUBTS_BY_SUBJECT_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
`;

// ── Student: by course + status ──────────────────────────────────
export const GET_STUDENT_DOUBTS_BY_COURSE_STATUS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.course_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_STUDENT_DOUBTS_BY_COURSE_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.student_id = (SELECT student_id FROM students WHERE user_id = ?)
    AND dp.course_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
`;

// ── Teacher: by subject + status ────────────────────────────────
export const GET_TEACHER_DOUBTS_BY_SUBJECT_STATUS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    u.first_name AS student_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  JOIN students s ON s.student_id = dp.student_id
  JOIN users u ON u.user_id = s.user_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.assigned_teacher_id = ?
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_TEACHER_DOUBTS_BY_SUBJECT_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.assigned_teacher_id = ?
    AND dp.subject_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
`;

// ── Teacher: by course + status ──────────────────────────────────
export const GET_TEACHER_DOUBTS_BY_COURSE_STATUS = `
  SELECT
    dp.doubt_id,
    dp.question_text,
    dp.status,
    dp.created_at,
    cs.subject_name,
    u.first_name AS student_name,
    COALESCE(MAX(dr.updated_at), dp.updated_at) AS last_activity_at
  FROM doubt_posts dp
  JOIN course_subjects cs ON cs.subject_id = dp.subject_id
  JOIN students s ON s.student_id = dp.student_id
  JOIN users u ON u.user_id = s.user_id
  LEFT JOIN doubt_responses dr ON dr.doubt_id = dp.doubt_id AND dr.is_deleted = 0
  WHERE dp.assigned_teacher_id = ?
    AND dp.course_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
  GROUP BY dp.doubt_id
  ORDER BY last_activity_at DESC
`;

export const GET_TEACHER_DOUBTS_BY_COURSE_STATUS_COUNT = `
  SELECT COUNT(*) AS total
  FROM doubt_posts dp
  WHERE dp.assigned_teacher_id = ?
    AND dp.course_id = ?
    AND dp.is_deleted = 0
    AND dp.status = ?
`;



export const GET_TEACHER_PENDING_COUNT = `
  SELECT COUNT(*) AS pending_count
  FROM doubt_posts dp
  JOIN teachers t ON dp.assigned_teacher_id = t.teacher_id
  WHERE t.user_id = ?
    AND dp.status = 'open'
    AND dp.is_deleted = 0
`;






// ── Admin: teacher-wise overdue doubt analytics ──────────────────
export const GET_ADMIN_TEACHER_DOUBT_ANALYTICS = `
  SELECT
    t.teacher_id,
    u.first_name AS teacher_first_name,
    u.last_name  AS teacher_last_name,
    c.course_id,
    c.course_name,
    COUNT(dp.doubt_id) AS overdue_open_count
  FROM teachers t
  JOIN users u
    ON u.user_id = t.user_id
  JOIN doubt_posts dp
    ON dp.assigned_teacher_id = t.teacher_id
    AND dp.status = 'open'
    AND dp.is_deleted = 0
    AND dp.deadline_at < NOW()
  JOIN courses c
    ON c.course_id = dp.course_id
  GROUP BY t.teacher_id, c.course_id
  ORDER BY overdue_open_count DESC, u.first_name ASC
`;