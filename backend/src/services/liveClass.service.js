//Author Vamshi


import pool from "../config/database.config.js";
import {
    DASHBOARD_SCHEDULED_TODAY,
    DASHBOARD_TOTAL_BROADCASTS,
    DASHBOARD_AVG_ENGAGEMENT,
    GET_UPCOMING_CLASSES,
    INSERT_LIVE_CLASS,
    GET_LIVE_CLASS_BY_ID,
    UPDATE_LIVE_CLASS,
    DELETE_LIVE_CLASS,
    GET_PAST_CLASSES,
    SEARCH_UPCOMING_LIVE_CLASSES,
    SEARCH_PAST_LIVE_CLASSES,
    GET_STUDENT_BY_USER,
    GET_USER_BASIC_INFO,
    CHECK_STUDENT_ENROLLMENT,
    GET_TEACHER_BY_USER,
    VALIDATE_SUBJECT,
    VALIDATE_MODULE,
    GET_MODULES_BY_SUBJECT,
    GET_SUBJECTS_BY_COURSE,
    GET_TEACHER_COURSES,
    GET_CLASS_BASIC,
    START_CLASS,
    UPDATE_CLASS_STATUS,
    END_CLASS,
    UPSERT_ATTENDANCE,
    UPDATE_LEAVE,
    GET_ATTENDANCE,
    GET_STUDENT_UPCOMING_CLASSES,
    GET_STUDENT_PAST_CLASSES,
    GET_STUDENT_LIVE_NOW,
    STUDENT_ATTENDANCE_STATS,
    GET_TEACHER_NEXT_CLASS_REMINDER,
    FINALIZE_ATTENDANCE_ON_CLASS_END

} from "../models/liveClass.model.js";

import { generateZegoToken } from "../utils/zegoToken.util.js";
import {
  buildTeacherReminderPayload
} from "../utils/teacherReminder.util.js";


// ─── Dashboard Stats ───────────────────────────────────────────────
export const getDashboardStats = async (user_id) => {
 
    const connection = await pool.getConnection();
 
    try {
 
        const [scheduledToday]  = await connection.query(DASHBOARD_SCHEDULED_TODAY,  [user_id]);
        const [totalBroadcasts] = await connection.query(DASHBOARD_TOTAL_BROADCASTS, [user_id]);
        const [avgEngagement]   = await connection.query(DASHBOARD_AVG_ENGAGEMENT,   [user_id]);
 
        return {
            scheduled_today:  scheduledToday[0].scheduled_today,
            total_broadcasts: totalBroadcasts[0].total_broadcasts,
            avg_engagement:   avgEngagement[0].avg_engagement
        };
 
    } finally {
 
        connection.release();
 
    }
 
};
 
// ─── Classes (Upcoming / Past) ─────────────────────────────────────
export const getClasses = async (user_id, type) => {
 
    const connection = await pool.getConnection();
 
    try {
 
        const query        = type === "upcoming" ? GET_UPCOMING_CLASSES : GET_PAST_CLASSES;
        const [rows]       = await connection.query(query, [user_id]);
 
        return rows;
 
    } finally {
 
        connection.release();
 
    }
 
};


export const getUpcomingClasses = async (teacher_id) => {

    const connection = await pool.getConnection();

    try {

        const [rows] = await connection.query(GET_UPCOMING_CLASSES,
            [teacher_id]
        );

        return rows;

    } finally {
        connection.release();
    }

};

export const getTeacherCourses = async (user_id) => {

    const connection = await pool.getConnection();

    try {

        //Step 1: get teacher_id
        const [[teacher]] = await connection.query(
            `SELECT teacher_id FROM teachers WHERE user_id = ?`,
            [user_id]
        );

        if (!teacher) {
            throw new Error("Teacher not found");
        }

        //Step 2: get courses
        const [rows] = await connection.query(
            GET_TEACHER_COURSES,
            [teacher.teacher_id]
        );

        return rows;

    } finally {
        connection.release();
    }
};

export const getSubjectsByCourse = async (course_id, user_id) => {

    const connection = await pool.getConnection();

    try {

        const [rows] = await connection.query(
            GET_SUBJECTS_BY_COURSE,
            [course_id, user_id]   
        );

        return rows;

    } finally {
        connection.release();
    }
};

export const getModulesBySubject = async (subject_id, user_id) => {

    const connection = await pool.getConnection();

    try {

        const [rows] = await connection.query(
            GET_MODULES_BY_SUBJECT,
            [subject_id, user_id]   
        );

        return rows;

    } finally {
        connection.release();
    }
};

export const createLiveClass = async (data, user_id) => {

    const connection = await pool.getConnection();

    try {

        const {
            course_id,
            subject_id,
            module_id,
            title,
            description,
            scheduled_start_time,
            scheduled_end_time,
            duration_minutes
        } = data;

        //1. Check user is teacher
        const [[teacher]] = await connection.query(
            GET_TEACHER_BY_USER,
            [user_id]
        );

        if (!teacher) {
            throw new Error("UNAUTHORIZED_TEACHER");
        }

        const teacher_id = teacher.teacher_id;

        //2. Validate subject belongs to course
        if (subject_id) {
            const [subject] = await connection.query(
                VALIDATE_SUBJECT,
                [subject_id, course_id]
            );

            if (!subject.length) {
                throw new Error("INVALID_SUBJECT");
            }
        }

        //3. Validate module belongs to subject
        if (module_id) {
            const [module] = await connection.query(
                VALIDATE_MODULE,
                [module_id, subject_id]
            );

            if (!module.length) {
                throw new Error("INVALID_MODULE");
            }
        }

        //4. Generate room_id
        const room_id = `live_${Date.now()}`;

        //5. Format datetime
        
        const start_time = normalizeMySQLDatetime(scheduled_start_time);

        let end_time = null;
        if (scheduled_end_time) {
            end_time = normalizeMySQLDatetime(scheduled_end_time);
        } else {
            const startDate = new Date(start_time.replace(" ", "T"));
            if (Number.isNaN(startDate.getTime())) {
                throw new Error("INVALID_DATETIME");
            }

            const endDate = new Date(startDate.getTime() + Number(duration_minutes) * 60 * 1000);
            const pad = (num) => String(num).padStart(2, "0");

            end_time = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;
        }

        if (new Date(start_time.replace(" ", "T")) >= new Date(end_time.replace(" ", "T"))) {
            throw new Error("INVALID_TIME_RANGE");
        }


        //6. Insert
        const [result] = await connection.query(
            INSERT_LIVE_CLASS,
            [
                course_id,
                subject_id || null,
                module_id || null,
                teacher_id,
                title,
                description,
                start_time,
                end_time,
                duration_minutes,
                room_id
            ]
        );

        return {
            class_id: result.insertId,
            room_id
        };

    } finally {
        connection.release();
    }
};

export const getLiveClassById = async (class_id, user_id) => {

    const connection = await pool.getConnection();

    try {

        const [rows] = await connection.query(
            GET_LIVE_CLASS_BY_ID,
            [class_id, user_id]   
        );

        return rows.length ? rows[0] : null;

    } catch (error) {
        console.error("DB Error:", error);
        throw error; 
    } finally {
        connection.release();
    }
};

export const updateLiveClass = async (class_id, user_id, data) => {

    const connection = await pool.getConnection();

    try {

        const {
            course_id,
            subject_id,
            module_id,
            title,
            description,
            scheduled_start_time,
            scheduled_end_time,
            duration_minutes
        } = data;

        const toMySQLDatetime = (iso) =>
            new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

        const start_time = scheduled_start_time ? normalizeMySQLDatetime(scheduled_start_time) : null;
        const end_time = scheduled_end_time ? normalizeMySQLDatetime(scheduled_end_time) : null;

        if (start_time && end_time) {
            if (new Date(start_time.replace(" ", "T")) >= new Date(end_time.replace(" ", "T"))) {
                throw new Error("INVALID_TIME_RANGE");
            }
        }


        const [result] = await connection.query(
            UPDATE_LIVE_CLASS,
            [
                course_id ?? null,
                subject_id ?? null,
                module_id ?? null,
                title ?? null,
                description ?? null,
                start_time ?? null,
                end_time ?? null,
                duration_minutes ?? null,
                class_id,
                user_id
            ]

        );

        return result.affectedRows;

    } catch (error) {
        console.error("DB Error:", error);
        throw error;
    } finally {
        connection.release();
    }
};

export const deleteLiveClass = async (class_id, user_id) => {

    const connection = await pool.getConnection();

    try {

        const [result] = await connection.query(
            DELETE_LIVE_CLASS,
            [class_id, user_id]   
        );

        return result.affectedRows;

    } catch (error) {
        console.error("DB Error:", error);
        throw error;
    } finally {
        connection.release();
    }

};

export const getPastClasses = async (teacher_id) => {

    const connection = await pool.getConnection();

    try {

        const [rows] = await connection.query(
            GET_PAST_CLASSES,
            [teacher_id]
        );

        return rows;

    } finally {
        connection.release();
    }

};

export const searchLiveClasses = async (user_id, q, type) => {

    const connection = await pool.getConnection();

    try {

               const keyword = `%${q}%`;
        const query = type === "upcoming"
            ? SEARCH_UPCOMING_LIVE_CLASSES
            : SEARCH_PAST_LIVE_CLASSES;

        const [rows] = await connection.query(query, [
            user_id,
            keyword,
            keyword,
        ]);


        return rows;

    } finally {
        connection.release();
    }

};




//Helper function 
const getTeacherId = async (connection, user_id) => {
    const [[teacher]] = await connection.query(
        `SELECT teacher_id FROM teachers WHERE user_id = ?`,
        [user_id]
    );

    if (!teacher) throw new Error("UNAUTHORIZED_TEACHER");

    return teacher.teacher_id;
};

const getDisplayName = (user, fallbackLabel = "User") => {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();

  if (fallbackLabel === "Teacher") {
    return fullName ? `${fullName}(Teacher)` : "Teacher";
  }

  if (fallbackLabel === "Student") {
    return fullName ? `${fullName}(Student)` : "Student";
  }

  return fullName || fallbackLabel;
};


const getUserBasicInfo = async (connection, user_id) => {
    const [[user]] = await connection.query(GET_USER_BASIC_INFO, [user_id]);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
};


const normalizeMySQLDatetime = (value) => {
    if (!value) return null;

    const localDateTimePattern = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?$/;
    if (localDateTimePattern.test(value)) {
        const normalized = value.replace("T", " ");
        return normalized.length === 16 ? `${normalized}:00` : normalized;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error("INVALID_DATETIME");
    }

    const pad = (num) => String(num).padStart(2, "0");

    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

const getLiveClassTokenTTLFromSchedule = (scheduledEndTime, fallbackDurationMinutes = 60) => {
    const bufferMinutes = Number(process.env.ZEGO_TOKEN_BUFFER_MINUTES || 15);
    const minTTLSeconds = Number(process.env.ZEGO_TOKEN_MIN_TTL_SECONDS || 1800);
    const maxTTLSeconds = Number(process.env.ZEGO_TOKEN_MAX_TTL_SECONDS || 14400);

    const end = new Date(scheduledEndTime);
    const now = new Date();

    let rawTTL = ((end.getTime() - now.getTime()) / 1000) + (bufferMinutes * 60);

    if (!Number.isFinite(rawTTL) || rawTTL <= 0) {
        rawTTL = (Number(fallbackDurationMinutes || 60) + bufferMinutes) * 60;
    }

    return Math.min(Math.max(Math.floor(rawTTL), minTTLSeconds), maxTTLSeconds);
};



export const startClassService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const teacher_id = await getTeacherId(conn, user_id);

        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);

        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");
        if (cls.status === "completed") throw new Error("CLASS_ALREADY_COMPLETED");
        if (cls.status === "cancelled") throw new Error("CLASS_CANCELLED");
        if (cls.status === "live") throw new Error("CLASS_ALREADY_LIVE");
        if (cls.status !== "scheduled") throw new Error("INVALID_CLASS_STATUS");


        await conn.query(START_CLASS, [class_id]);

        return { 
             class_id: cls.class_id,
             room_id: cls.room_id,
             status: "live",
        };

    } finally {
        conn.release();
    }
};



export const resumeClassService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const teacher_id = await getTeacherId(conn, user_id);
        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);

        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");
        if (cls.status === "completed") throw new Error("CLASS_ALREADY_COMPLETED");
        if (cls.status === "cancelled") throw new Error("CLASS_CANCELLED");
        if (cls.status === "live") throw new Error("CLASS_ALREADY_LIVE");
        if (cls.status !== "scheduled") throw new Error("INVALID_CLASS_STATUS");


        await conn.query(UPDATE_CLASS_STATUS, ['live', class_id]);

        return { 
              class_id: cls.class_id,
              room_id: cls.room_id,
              status: "live",
        };

    } finally {
        conn.release();
    }
};


export const generateTeacherBroadcastTokenService = async (class_id, user) => {
  const conn = await pool.getConnection();

  try {
    const teacher_id = await getTeacherId(conn, user.id);
    const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);
    const userInfo = await getUserBasicInfo(conn, user.id);

    if (!cls) throw new Error("CLASS_NOT_FOUND");
    if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");
    if (!cls.room_id) throw new Error("ROOM_ID_NOT_FOUND");

      const token = generateZegoToken({
      userId: String(user.id),
      roomId: cls.room_id,
      role: "Host",
      effectiveTimeInSeconds: getLiveClassTokenTTLFromSchedule(
        cls.scheduled_end_time,
        cls.duration_minutes
      ),
    });


    return {
      app_id: Number(process.env.ZEGO_APP_ID),
      token,
      room_id: cls.room_id,
      user_id: String(user.id),
      user_name: getDisplayName(userInfo, "Teacher"),
      role: "Host",
      class_id: cls.class_id,
    };
  } finally {
    conn.release();
  }
};




export const endClassService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const teacher_id = await getTeacherId(conn, user_id);
        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);

        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");
        if (cls.status === 'completed') throw new Error("CLASS_ALREADY_COMPLETED");
        if (cls.status === 'cancelled') throw new Error("CLASS_CANCELLED");

        await conn.query(END_CLASS, [class_id]);
        await conn.query(FINALIZE_ATTENDANCE_ON_CLASS_END, [class_id]);
        return true;

    } finally {
        conn.release();
    }
};


export const cancelClassService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const teacher_id = await getTeacherId(conn, user_id);
        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);

        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");
        if (cls.status === "completed") throw new Error("CLASS_ALREADY_COMPLETED");
        if (cls.status === "cancelled") throw new Error("CLASS_ALREADY_CANCELLED");

        await conn.query(UPDATE_CLASS_STATUS, ['cancelled', class_id]);


        return true;

    } finally {
        conn.release();
    }
};



export const joinClassService = async (class_id, user) => { // receive full user
    const conn = await pool.getConnection();
    try {
        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);
        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.status !== 'live') throw new Error("CLASS_NOT_LIVE");

        const [[student]] = await conn.query(GET_STUDENT_BY_USER, [user.id]);

        if (!student) throw new Error("STUDENT_NOT_FOUND");

        const [[enrollment]] = await conn.query(CHECK_STUDENT_ENROLLMENT, [
            student.student_id,
            cls.course_id
        ]);

        if (!enrollment) throw new Error("STUDENT_NOT_ENROLLED");

        const userInfo = await getUserBasicInfo(conn, user.id);

        await conn.query(UPSERT_ATTENDANCE, [class_id, student.student_id]);

            const token = generateZegoToken({
            userId: String(user.id),
            roomId: cls.room_id,
            role: "Audience",
            effectiveTimeInSeconds: getLiveClassTokenTTLFromSchedule(
                cls.scheduled_end_time,
                cls.duration_minutes
            )
        });


        return {
            room_id: cls.room_id,
            student_id: student.student_id,
            zego: {
                app_id: Number(process.env.ZEGO_APP_ID),
                token,
                room_id: cls.room_id,
                user_id: String(user.id),
                user_name: getDisplayName(userInfo, "Student"),
                role: "Audience"
            }
        };
    } finally {
        conn.release();
    }
};




export const leaveClassService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const [[student]] = await conn.query(GET_STUDENT_BY_USER, [user_id]);

        if (!student) throw new Error("STUDENT_NOT_FOUND");

        await conn.query(UPDATE_LEAVE, [class_id, student.student_id]);

        return true;

    } finally {
        conn.release();
    }
};



export const getAttendanceService = async (class_id, user_id) => {

    const conn = await pool.getConnection();

    try {

        const teacher_id = await getTeacherId(conn, user_id);
        const [[cls]] = await conn.query(GET_CLASS_BASIC, [class_id]);

        if (!cls) throw new Error("CLASS_NOT_FOUND");
        if (cls.teacher_id !== teacher_id) throw new Error("UNAUTHORIZED");

        const [rows] = await conn.query(GET_ATTENDANCE, [class_id]);

        return rows;

    } finally {
        conn.release();
    }
};





export const getStudentClasses = async (user_id, type) => {
 
    const connection = await pool.getConnection();
 
    try {
 
        const query  = type === "upcoming" ? GET_STUDENT_UPCOMING_CLASSES : GET_STUDENT_PAST_CLASSES;
        const [rows] = await connection.query(query, [user_id]);
 
        return rows;
 
    } finally {
 
        connection.release();
 
    }
 
};


export const getStudentLiveNow = async (user_id) => {
 
    const connection = await pool.getConnection();
 
    try {
 
        const [rows] = await connection.query(GET_STUDENT_LIVE_NOW, [user_id]);
        return rows.length ? rows[0] : null;
 
    } finally {
 
        connection.release();
 
    }
 
};






export const getStudentDashboardStats = async (user_id) => {
 
    const connection = await pool.getConnection();
 
    try {
 
        const [rows] = await connection.query(STUDENT_ATTENDANCE_STATS, [user_id]);
        const stats = rows[0] || {};
 
        return {
            total_eligible_classes: Number(stats.total_eligible_classes || 0),
            present_classes: Number(stats.present_classes || 0),
            attendance_percentage: Number(stats.attendance_percentage || 0)
        };
 
    } finally {
 
        connection.release();
 
    }
 
};

const getTeacherProfile = async (connection, userId) => {
  const [rows] = await connection.execute(GET_TEACHER_BY_USER, [userId]);
  return rows[0] ?? null;
};


export const getTeacherReminderForUser = async (user) => {
  const connection = await pool.getConnection();

  try {
    if (user.role !== "teacher") {
      const error = new Error("Only teachers can access the next class reminder.");
      error.statusCode = 403;
      throw error;
    }

    const teacher = await getTeacherProfile(connection, user.id);
    if (!teacher) {
      const error = new Error("Teacher profile not found for this user.");
      error.statusCode = 403;
      throw error;
    }

    const [rows] = await connection.execute(GET_TEACHER_NEXT_CLASS_REMINDER, [user.id]);
    const nextClass = rows[0] || null;

    return buildTeacherReminderPayload(nextClass);
  } finally {
    connection.release();
  }
};

