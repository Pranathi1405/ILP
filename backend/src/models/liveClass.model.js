//Author-Vamshi

export const DASHBOARD_SCHEDULED_TODAY = `
    SELECT COUNT(*) AS scheduled_today
    FROM live_classes lc
    JOIN teachers t ON t.teacher_id = lc.teacher_id
    WHERE t.user_id = ?
      AND DATE(lc.scheduled_start_time) = CURDATE()
      AND lc.is_deleted = FALSE
`;
 
export const DASHBOARD_TOTAL_BROADCASTS = `
    SELECT COUNT(*) AS total_broadcasts
    FROM live_classes lc
    JOIN teachers t ON t.teacher_id = lc.teacher_id
    WHERE t.user_id = ?
      AND lc.status = 'completed'
      AND lc.is_deleted = FALSE
`;
 
export const DASHBOARD_AVG_ENGAGEMENT = `
    SELECT IFNULL(AVG(lca.duration_minutes), 0) AS avg_engagement
    FROM live_class_attendance lca
    JOIN live_classes lc ON lc.class_id = lca.class_id
    JOIN teachers t ON t.teacher_id = lc.teacher_id
    WHERE t.user_id = ?
      AND lca.status = 'present'
      AND lc.is_deleted = FALSE
`;
 
// ─── Upcoming Classes ──────────────────────────────────────────────
 
export const GET_UPCOMING_CLASSES = ` 
    SELECT 
        lc.class_id, 
        lc.title, 
        lc.status, 
        lc.room_id, 
        lc.scheduled_start_time, 
        lc.scheduled_end_time, 
        cs.subject_name, 
        c.course_name,
        m.module_name
    FROM live_classes lc 
    JOIN teachers t   ON t.teacher_id   = lc.teacher_id 
    JOIN courses c    ON c.course_id    = lc.course_id 
    LEFT JOIN course_subjects cs ON cs.subject_id = lc.subject_id 
    LEFT JOIN subject_modules m          ON m.module_id   = lc.module_id
    WHERE t.user_id = ? 
      AND lc.status IN ('scheduled', 'live') 
      AND lc.is_deleted = FALSE 
    ORDER BY lc.scheduled_start_time ASC 
`;
 
// ─── Past Classes ──────────────────────────────────────────────────
 
export const GET_PAST_CLASSES = `
    SELECT
        lc.class_id,
        lc.title,
        lc.status,
        lc.room_id,
        lc.scheduled_start_time,
        lc.scheduled_end_time,
        cs.subject_name,
        c.course_name,
        m.module_name
    FROM live_classes lc
    JOIN teachers t  ON t.teacher_id  = lc.teacher_id
    JOIN courses c   ON c.course_id   = lc.course_id
    LEFT JOIN course_subjects cs ON cs.subject_id = lc.subject_id
    LEFT JOIN subject_modules m          ON m.module_id   = lc.module_id
    WHERE t.user_id = ?
      AND lc.status = 'completed'
      AND lc.is_deleted = FALSE
    ORDER BY lc.scheduled_start_time DESC
`;

export const INSERT_LIVE_CLASS = `
INSERT INTO live_classes (
    course_id,
    subject_id,
    module_id,
    teacher_id,
    title,
    description,
    scheduled_start_time,
    scheduled_end_time,
    duration_minutes,
    room_id
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const GET_LIVE_CLASS_BY_ID = `
SELECT
    lc.class_id,
    lc.title,
    lc.description,
    lc.status,
    lc.room_id,
    lc.scheduled_start_time,
    lc.scheduled_end_time,
    lc.actual_start_time,
    lc.actual_end_time,
    lc.duration_minutes,
    lc.max_participants,
    c.course_name,
    cs.subject_name,
    sm.module_name,
    CONCAT(u.first_name,' ',u.last_name) AS teacher_name
FROM live_classes lc
JOIN courses c 
    ON c.course_id = lc.course_id
LEFT JOIN course_subjects cs 
    ON cs.subject_id = lc.subject_id
LEFT JOIN subject_modules sm
    ON sm.module_id = lc.module_id
JOIN teachers t
    ON t.teacher_id = lc.teacher_id
JOIN users u
    ON u.user_id = t.user_id
WHERE lc.class_id = ?
AND t.user_id = ?             
AND lc.is_deleted = FALSE
`;


export const UPDATE_LIVE_CLASS = `
UPDATE live_classes lc
JOIN teachers t ON t.teacher_id = lc.teacher_id
SET
    lc.course_id = COALESCE(?, lc.course_id),
    lc.subject_id = COALESCE(?, lc.subject_id),
    lc.module_id = COALESCE(?, lc.module_id),
    lc.title = COALESCE(?, lc.title),
    lc.description = COALESCE(?, lc.description),
    lc.scheduled_start_time = COALESCE(?, lc.scheduled_start_time),
    lc.scheduled_end_time = COALESCE(?, lc.scheduled_end_time),
    lc.duration_minutes = COALESCE(?, lc.duration_minutes),
    lc.updated_at = CURRENT_TIMESTAMP
WHERE lc.class_id = ?
AND t.user_id = ?              
AND lc.is_deleted = FALSE
`;

export const DELETE_LIVE_CLASS = `
UPDATE live_classes lc
JOIN teachers t ON t.teacher_id = lc.teacher_id
SET
    lc.is_deleted = TRUE,
    lc.updated_at = CURRENT_TIMESTAMP
WHERE lc.class_id = ?
AND t.user_id = ?          
AND lc.is_deleted = FALSE
`;

export const SEARCH_UPCOMING_LIVE_CLASSES = `
SELECT 
    lc.class_id,
    lc.title,
    lc.status,
    lc.room_id,
    lc.scheduled_start_time,
    lc.scheduled_end_time,
    lc.duration_minutes,
    s.subject_name AS subject_name,
    c.course_name AS course_name
FROM live_classes lc
LEFT JOIN courses c ON lc.course_id = c.course_id
LEFT JOIN course_subjects s ON lc.subject_id = s.subject_id
WHERE lc.teacher_id = (
    SELECT teacher_id FROM teachers WHERE user_id = ? LIMIT 1
)
AND lc.is_deleted = FALSE
AND lc.status IN ('scheduled', 'live')
AND (
    lc.title LIKE ? OR
    s.subject_name LIKE ?
)
ORDER BY lc.scheduled_start_time ASC
`;

export const SEARCH_PAST_LIVE_CLASSES = `
SELECT 
    lc.class_id,
    lc.title,
    lc.status,
    lc.room_id,
    lc.scheduled_start_time,
    lc.scheduled_end_time,
    lc.duration_minutes,
    s.subject_name AS subject_name,
    c.course_name AS course_name
FROM live_classes lc
LEFT JOIN courses c ON lc.course_id = c.course_id
LEFT JOIN course_subjects s ON lc.subject_id = s.subject_id
WHERE lc.teacher_id = (
    SELECT teacher_id FROM teachers WHERE user_id = ? LIMIT 1
)
AND lc.is_deleted = FALSE
AND lc.status = 'completed'
AND (
    lc.title LIKE ? OR
    s.subject_name LIKE ?
)
ORDER BY lc.scheduled_start_time DESC
`;


// check teacher
export const GET_TEACHER_BY_USER = `
SELECT teacher_id 
FROM teachers 
WHERE user_id = ?
LIMIT 1
`;

export const GET_STUDENT_BY_USER = `
SELECT student_id
FROM students
WHERE user_id = ?
LIMIT 1
`;

export const GET_USER_BASIC_INFO = `
SELECT
    user_id,
    first_name,
    last_name
FROM users
WHERE user_id = ?
LIMIT 1
`;


export const CHECK_STUDENT_ENROLLMENT = `
SELECT enrollment_id
FROM course_enrollments
WHERE student_id = ?
  AND course_id = ?
  AND status = 'enrolled'
LIMIT 1
`;

// validate subject belongs to course
export const VALIDATE_SUBJECT = `
SELECT subject_id 
FROM course_subjects 
WHERE subject_id = ? AND course_id = ?
`;

// validate module belongs to subject
export const VALIDATE_MODULE = `
SELECT module_id 
FROM subject_modules 
WHERE module_id = ? AND subject_id = ?
`;


export const GET_MODULES_BY_SUBJECT = `
SELECT 
    sm.module_id,
    sm.module_name
FROM subject_modules sm
JOIN course_subjects cs ON cs.subject_id = sm.subject_id
JOIN teachers t ON t.teacher_id = cs.teacher_id
WHERE sm.subject_id = ?
AND t.user_id = ?
ORDER BY sm.module_name ASC;
`;


export const GET_SUBJECTS_BY_COURSE = `
SELECT 
    cs.subject_id,
    cs.subject_name
FROM course_subjects cs
JOIN teachers t ON t.teacher_id = cs.teacher_id
WHERE cs.course_id = ?
AND t.user_id = ?
AND cs.is_active = 1
ORDER BY cs.display_order ASC;
`;


export const GET_TEACHER_COURSES = `
SELECT DISTINCT
    c.course_id,
    c.course_name
FROM course_subjects cs
JOIN courses c 
    ON c.course_id = cs.course_id
WHERE cs.teacher_id = ?
AND cs.is_active = 1
ORDER BY c.course_name ASC
`;







//  Get class basic info
export const GET_CLASS_BASIC = `
  SELECT
    class_id,
    course_id,
    teacher_id,
    room_id,
    status,
    scheduled_start_time,
    scheduled_end_time,
    duration_minutes
  FROM live_classes
  WHERE class_id = ?
    AND is_deleted = 0
  LIMIT 1
`;



//  Update status
export const UPDATE_CLASS_STATUS = `
  UPDATE live_classes
  SET
    status = ?,
    updated_at = NOW()
  WHERE class_id = ?
    AND is_deleted = 0
`;

//  Start class
export const START_CLASS = `
  UPDATE live_classes
  SET
    status = 'live',
    actual_start_time = COALESCE(actual_start_time, NOW()),
    updated_at = NOW()
  WHERE class_id = ?
    AND is_deleted = 0
`;

//  End class
export const END_CLASS = `
    UPDATE live_classes
    SET
        status = 'completed',
        actual_end_time = COALESCE(actual_end_time, NOW()),
        updated_at = NOW()
    WHERE class_id = ?
      AND is_deleted = 0
`;

//  Attendance insert/update
export const UPSERT_ATTENDANCE = `
    INSERT INTO live_class_attendance (
        class_id,
        student_id,
        joined_at,
        status,
        created_at,
        duration_minutes
    )
    VALUES (?, ?, NOW(), 'absent', NOW(), 0)
    ON DUPLICATE KEY UPDATE
        joined_at = CASE
            WHEN left_at IS NOT NULL THEN NOW()
            ELSE joined_at
        END,
        left_at = NULL
`;



//  Leave attendance
export const UPDATE_LEAVE = `
    UPDATE live_class_attendance lca
    JOIN live_classes lc ON lc.class_id = lca.class_id
    SET
        lca.left_at = NOW(),
        lca.duration_minutes = lca.duration_minutes + TIMESTAMPDIFF(
            MINUTE,
            lca.joined_at,
            NOW()
        ),
        lca.status = CASE
            WHEN (
                lca.duration_minutes + TIMESTAMPDIFF(MINUTE, lca.joined_at, NOW())
            ) >= CEIL(lc.duration_minutes * 0.5)
                THEN 'present'
            ELSE 'absent'
        END
    WHERE lca.class_id = ?
      AND lca.student_id = ?
      AND lca.left_at IS NULL
`;



export const FINALIZE_ATTENDANCE_ON_CLASS_END = `
    UPDATE live_class_attendance lca
    JOIN live_classes lc ON lc.class_id = lca.class_id
    SET
        lca.left_at = COALESCE(lc.actual_end_time, NOW()),
        lca.duration_minutes = lca.duration_minutes + TIMESTAMPDIFF(
            MINUTE,
            lca.joined_at,
            COALESCE(lc.actual_end_time, NOW())
        ),
        lca.status = CASE
            WHEN (
                lca.duration_minutes + TIMESTAMPDIFF(
                    MINUTE,
                    lca.joined_at,
                    COALESCE(lc.actual_end_time, NOW())
                )
            ) >= CEIL(lc.duration_minutes * 0.5)
                THEN 'present'
            ELSE 'absent'
        END
    WHERE lca.class_id = ?
      AND lca.left_at IS NULL
`;



//  Attendance list
export const GET_ATTENDANCE = `
    SELECT
        lca.attendance_id,
        lca.class_id,
        lca.student_id,
        lca.joined_at,
        lca.left_at,
        lca.duration_minutes,
        lca.status,
        CONCAT(u.first_name, ' ', u.last_name) AS student_name
    FROM live_class_attendance lca
    JOIN students s ON s.student_id = lca.student_id
    JOIN users u ON u.user_id = s.user_id
    WHERE lca.class_id = ?
    ORDER BY lca.attendance_id DESC
`;



export const GET_STUDENT_UPCOMING_CLASSES = `
    SELECT DISTINCT
        lc.class_id,
        lc.title,
        lc.description,
        lc.status,
        lc.room_id,
        lc.scheduled_start_time,
        lc.scheduled_end_time,
        lc.actual_start_time,
        lc.actual_end_time,
        lc.duration_minutes,
        lc.max_participants,
        cs.subject_name,
        c.course_name,
        sm.module_name,
        CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
    FROM live_classes lc
    JOIN course_enrollments ce
        ON ce.course_id = lc.course_id
       AND ce.status = 'enrolled'
    JOIN students s
        ON s.student_id = ce.student_id
    JOIN teachers t
        ON t.teacher_id = lc.teacher_id
    JOIN users u
        ON u.user_id = t.user_id
    JOIN courses c
        ON c.course_id = lc.course_id
    LEFT JOIN course_subjects cs
        ON cs.subject_id = lc.subject_id
    LEFT JOIN subject_modules sm
        ON sm.module_id = lc.module_id
    WHERE s.user_id = ?
      AND lc.status IN ('scheduled', 'live')
      AND lc.is_deleted = FALSE
    ORDER BY
        CASE WHEN lc.status = 'live' THEN 0 ELSE 1 END,
        lc.scheduled_start_time ASC
`;

export const GET_STUDENT_PAST_CLASSES = `
    SELECT DISTINCT
        lc.class_id,
        lc.title,
        lc.description,
        lc.status,
        lc.room_id,
        lc.scheduled_start_time,
        lc.scheduled_end_time,
        lc.actual_start_time,
        lc.actual_end_time,
        lc.duration_minutes,
        lc.max_participants,
        cs.subject_name,
        c.course_name,
        sm.module_name,
        CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
    FROM live_classes lc
    JOIN course_enrollments ce
        ON ce.course_id = lc.course_id
       AND ce.status = 'enrolled'
    JOIN students s
        ON s.student_id = ce.student_id
    JOIN teachers t
        ON t.teacher_id = lc.teacher_id
    JOIN users u
        ON u.user_id = t.user_id
    JOIN courses c
        ON c.course_id = lc.course_id
    LEFT JOIN course_subjects cs
        ON cs.subject_id = lc.subject_id
    LEFT JOIN subject_modules sm
        ON sm.module_id = lc.module_id
    WHERE s.user_id = ?
      AND lc.status = 'completed'
      AND lc.is_deleted = FALSE
    ORDER BY lc.scheduled_start_time DESC
`;








export const GET_STUDENT_LIVE_NOW = `
    SELECT DISTINCT
        lc.class_id,
        lc.title,
        lc.description,
        lc.status,
        lc.room_id,
        lc.scheduled_start_time,
        lc.scheduled_end_time,
        lc.actual_start_time,
        lc.actual_end_time,
        lc.duration_minutes,
        lc.max_participants,
        cs.subject_name,
        c.course_name,
        sm.module_name,
        CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
    FROM live_classes lc
    JOIN course_enrollments ce
        ON ce.course_id = lc.course_id
       AND ce.status = 'enrolled'
    JOIN students s
        ON s.student_id = ce.student_id
    JOIN teachers t
        ON t.teacher_id = lc.teacher_id
    JOIN users u
        ON u.user_id = t.user_id
    JOIN courses c
        ON c.course_id = lc.course_id
    LEFT JOIN course_subjects cs
        ON cs.subject_id = lc.subject_id
    LEFT JOIN subject_modules sm
        ON sm.module_id = lc.module_id
    WHERE s.user_id = ?
      AND lc.status = 'live'
      AND lc.is_deleted = FALSE
    ORDER BY COALESCE(lc.actual_start_time, lc.scheduled_start_time) DESC
    LIMIT 1
`;




export const STUDENT_ATTENDANCE_STATS = `
    SELECT
        COUNT(DISTINCT lc.class_id) AS total_eligible_classes,
        COUNT(DISTINCT CASE WHEN lca.status = 'present' THEN lc.class_id END) AS present_classes,
        COALESCE(
            ROUND(
                (
                    COUNT(DISTINCT CASE WHEN lca.status = 'present' THEN lc.class_id END) * 100.0
                ) / NULLIF(COUNT(DISTINCT lc.class_id), 0)
            ),
            0
        ) AS attendance_percentage
    FROM students s
    JOIN course_enrollments ce
        ON ce.student_id = s.student_id
       AND ce.status = 'enrolled'
    JOIN live_classes lc
        ON lc.course_id = ce.course_id
    LEFT JOIN live_class_attendance lca
        ON lca.class_id = lc.class_id
       AND lca.student_id = s.student_id
    WHERE s.user_id = ?
      AND lc.is_deleted = FALSE
      AND lc.status = 'completed'
`;


export const GET_TEACHER_NEXT_CLASS_REMINDER = `
  SELECT
    lc.class_id,
    lc.course_id,
    lc.subject_id,
    lc.module_id,
    lc.teacher_id,
    lc.title,
    lc.description,
    lc.status,
    lc.room_id,
    lc.scheduled_start_time,
    lc.scheduled_end_time,
    lc.actual_start_time,
    lc.actual_end_time,
    lc.duration_minutes,
    lc.max_participants,
    c.course_name,
    cs.subject_name,
    sm.module_name,
    CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
    u.user_id AS teacher_user_id,
    COALESCE(att.active_participants, 0) AS active_participants
  FROM live_classes lc
  JOIN teachers t ON t.teacher_id = lc.teacher_id
  JOIN users u ON u.user_id = t.user_id
  JOIN courses c ON c.course_id = lc.course_id
  LEFT JOIN course_subjects cs ON cs.subject_id = lc.subject_id
  LEFT JOIN subject_modules sm ON sm.module_id = lc.module_id
  LEFT JOIN (
    SELECT class_id, COUNT(*) AS active_participants
    FROM live_class_attendance
    WHERE left_at IS NULL
    GROUP BY class_id
  ) att ON att.class_id = lc.class_id
  WHERE t.user_id = ?
    AND lc.is_deleted = FALSE
    AND lc.status IN ('live', 'scheduled')
  ORDER BY
    CASE
      WHEN lc.status = 'live' THEN 0
      WHEN lc.scheduled_start_time >= UTC_TIMESTAMP() THEN 1
      ELSE 2
    END,
    CASE
      WHEN lc.status = 'live' THEN COALESCE(lc.actual_start_time, lc.scheduled_start_time)
      WHEN lc.scheduled_start_time >= UTC_TIMESTAMP() THEN lc.scheduled_start_time
      ELSE NULL
    END ASC,
    CASE
      WHEN lc.status = 'scheduled' AND lc.scheduled_start_time < UTC_TIMESTAMP()
        THEN lc.scheduled_start_time
      ELSE NULL
    END DESC
  LIMIT 1
`;
