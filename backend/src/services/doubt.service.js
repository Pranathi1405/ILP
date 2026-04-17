// Author: Vamshi
import * as doubtModel from "../models/doubt.model.js";
import pool from "../config/database.config.js";
import { getFileType } from "../utils/file.helper.js";
import { emitAnalyticsEvent } from "../queues/analyticsQueue.js";
import { ANALYTICS_EVENTS } from "../constants/analyticsTypes.js";

//Student Ask doubt with attachments
export const createDoubt = async (
  userId,
  courseId,
  subjectId,
  teacherId,
  questionText,
  files = []
) => {

  if (!userId || !courseId || !questionText || !subjectId || !teacherId) {
    throw new Error("Missing required fields");
  }

  //CHECK COURSE ENROLLMENT
  const [enrollment] = await pool.execute(
    doubtModel.CHECK_ENROLLMENT,
    [userId, courseId]
  );

  if (enrollment.length === 0) {
    throw new Error("Access denied: You are not enrolled in this course");
  }

  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [result] = await pool.execute(
    doubtModel.INSERT_DOUBT,
    [userId, courseId, subjectId, teacherId, questionText, deadline]
  );

  const doubtId = result.insertId;

  //  Insert attachments properly
  if (files && files.length > 0) {
    for (const file of files) {

      const fileType = getFileType(file.mimetype);

      await pool.execute(
        doubtModel.INSERT_DOUBT_ATTACHMENT,
        [
          result.insertId,                   // doubt_id
          userId,                           // uploader_id
          fileType || "other",
          file.path || null,
          file.originalname || null,
          Math.round(file.size / 1024)
        ]
      );
    }
  }

  await emitAnalyticsEvent(ANALYTICS_EVENTS.DOUBT_CREATED, {
  studentId: userId,
  courseId,
  subjectId
  });

  return {
    doubtId,
    status: "open",
    createdAt: new Date()
  };
};

export const getMyDoubts = async (userId, role, rawFilters = {}) => {

  const courseId   = rawFilters.courseId  ? parseInt(rawFilters.courseId)  : null;
  const subjectId  = rawFilters.subjectId ? parseInt(rawFilters.subjectId) : null;
  const keyword    = rawFilters.keyword?.trim() || null;
  const page       = Math.max(1, parseInt(rawFilters.page)  || 1);
  const limit      = Math.min(100, parseInt(rawFilters.limit) || 10);
  const offset     = (page - 1) * limit;

  const VALID_STATUSES = ['open', 'answered', 'resolved'];
  const status     = VALID_STATUSES.includes(rawFilters.status)
    ? rawFilters.status
    : null;

  const searchTerm = keyword ? `%${keyword}%` : null;

  // params layout:
  // [userId, status, status, courseId, courseId, subjectId, subjectId,
  //  searchTerm, searchTerm, searchTerm, searchTerm]
  //
  // The (? IS NULL OR col = ?) pattern needs each value twice:
  //   first ? → the NULL check
  //   second ? → the actual value comparison

  let dataQuery, countQuery, params;

  if (role === 'teacher') {

    const [[teacher]] = await pool.execute(
      doubtModel.GET_TEACHER_BY_USER_ID,
      [userId]
    );
    if (!teacher) throw new Error("Teacher not found");

    dataQuery  = doubtModel.SEARCH_TEACHER_DOUBTS;
    countQuery = doubtModel.SEARCH_TEACHER_DOUBTS_COUNT;
    params     = [
      userId,
      status,     status,      // (? IS NULL OR dp.status = ?)
      courseId,   courseId,    // (? IS NULL OR dp.course_id = ?)
      subjectId,  subjectId,   // (? IS NULL OR dp.subject_id = ?)
      searchTerm, searchTerm, searchTerm, searchTerm, // IS NULL check + 3 LIKE
    ];

  } else {

    dataQuery  = doubtModel.SEARCH_STUDENT_DOUBTS;
    countQuery = doubtModel.SEARCH_STUDENT_DOUBTS_COUNT;
    params     = [
      userId,
      status,     status,
      courseId,   courseId,
      subjectId,  subjectId,
      searchTerm, searchTerm, searchTerm, searchTerm,
    ];
  }

  const paginatedQuery = `${dataQuery} LIMIT ${limit} OFFSET ${offset}`;

  const [rows]  = await pool.execute(paginatedQuery, params);
  const [count] = await pool.execute(countQuery, params);

  return {
    data: rows,
    pagination: {
      total:      count[0].total,
      page,
      limit,
      totalPages: Math.ceil(count[0].total / limit),
    },
  };
};

// //Teacher - get all doubts assigned
// export const getTeacherDoubts = async (userId) => {
//   try {

//     const [rows] = await pool.query(
//       doubtModel.GET_DOUBTS_FOR_TEACHER,
//       [userId]
//     );

//     return rows;

//   } catch (error) {
//     throw new Error("Error fetching teacher doubts: " + error.message);
//   }
// };

//Teacher replies to doubt
// export const replyToDoubt = async (
//   doubtId,
//   responderId,
//   replyText,
//   responderType,
//   files = []
// ) => {

//   if (!doubtId || !responderId || !replyText || !responderType) {
//     throw new Error("Missing required fields");
//   }

//   if (!["teacher", "student"].includes(responderType)) {
//     throw new Error("Invalid responder type");
//   }

//   // Check doubt exists
//   const [doubt] = await pool.execute(
//     doubtModel.GET_DOUBT_BY_ID,
//     [doubtId]
//   );

//   if (!doubt.length) {
//     throw new Error("Doubt not found");
//   }

//   // Check doubt is not closed
//   if (doubt[0].status === "closed") {
//     throw new Error("This doubt is closed, no more replies allowed");
//   }

//   // Validate based on who is replying
//   if (responderType === "teacher") {
//     if (doubt[0].assigned_teacher_id !== parseInt(responderId)) {
//       throw new Error("You are not assigned to this doubt");
//     }
//   } else if (responderType === "student") {
//     if (doubt[0].student_id !== parseInt(responderId)) {
//       throw new Error("You can only reply to your own doubt");
//     }
//   }

//   // Insert reply
//   const [replyResult] = await pool.execute(
//     doubtModel.INSERT_DOUBT_REPLY,
//     [doubtId, null, responderId, responderType, replyText]
//   );

//   // Insert attachments (optional)
//   if (files && files.length > 0) {
//     for (const file of files) {
//       const fileType = getFileType(file.mimetype);

//       await pool.execute(
//         doubtModel.INSERT_REPLY_ATTACHMENT,
//         [
//           replyResult.insertId,
//           responderId,
//           fileType || "other",
//           file.path || null,
//           file.originalname || null,
//           Math.round(file.size / 1024)
//         ]
//       );
//     }
//   }
  
//   return {
//     replyId: replyResult.insertId,
//     doubtId,
//     responderType,
//   };
// };

export const getDoubtDetail = async (doubtId) => {

  if (!doubtId) throw new Error("doubtId is required");

  const [rows] = await pool.execute(
    doubtModel.GET_DOUBT_DETAIL,
    [doubtId]
  );

  if (!rows.length) throw new Error("Doubt not found");

  const first = rows[0];

  // Build doubt object 
  const doubt = {
    doubtId: first.doubt_id,
    questionText: first.question_text,
    status: first.status,
    createdAt: first.doubt_created_at,
    student: {
      id: first.student_id,
      name: `${first.student_first_name} ${first.student_last_name}`,
      attachments: []       
    },
    teacher: {
    id:     first.teacher_id,
    name:   `${first.teacher_first_name} ${first.teacher_last_name}`.trim(),
  },
    replies: []
  };
   //student doubt attachments
  const seenDoubtAttachments = new Set();
  for (const row of rows) {
    if (
      row.doubt_attachment_id &&
      !seenDoubtAttachments.has(row.doubt_attachment_id)
    ) {
      seenDoubtAttachments.add(row.doubt_attachment_id);
      doubt.student.attachments.push({
        attachmentId: row.doubt_attachment_id,
        fileType: row.doubt_file_type,
        fileUrl: row.doubt_file_url,
        fileName: row.doubt_file_name,
        fileSizeKb: row.doubt_file_size_kb
      });
    }
  }

  // Build replies map
  const repliesMap = new Map();
  const seenReplyAttachments = new Set();

  for (const row of rows) {
    if (!row.response_id) continue;

    if (!repliesMap.has(row.response_id)) {
      repliesMap.set(row.response_id, {
        replyId: row.response_id,
        replyText: row.response_text,
        responderType: row.responder_type,  
        createdAt: row.reply_created_at,
        responder: {
          id: row.responder_id,
          name: `${row.responder_first_name} ${row.responder_last_name}`,
        },
        attachments: []   
      });
    }

    // Deduplicate reply attachments
    if (
      row.reply_attachment_id &&
      !seenReplyAttachments.has(row.reply_attachment_id)
    ) {
      seenReplyAttachments.add(row.reply_attachment_id);
      repliesMap.get(row.response_id).attachments.push({
        attachmentId: row.reply_attachment_id,
        fileType: row.reply_file_type,
        fileUrl: row.reply_file_url,
        fileName: row.reply_file_name,
        fileSizeKb: row.reply_file_size_kb
      });
    }
  }


  for (const [, reply] of repliesMap) {
    doubt.replies.push(reply);
  }
  await emitAnalyticsEvent(ANALYTICS_EVENTS.DOUBT_VIEWED, {
  doubtId
  });

  return doubt;
};



export const replyToDoubt = async (
  doubtId,
  userId,
  replyText,
  responderType,
  files = []
) => {

  if (!doubtId || !userId || !replyText || !responderType) {
    throw new Error("Missing required fields");
  }

  if (!["teacher", "student"].includes(responderType)) {
    throw new Error("Invalid responder type");
  }

  const [doubt] = await pool.execute(
    doubtModel.GET_DOUBT_BY_ID,
    [doubtId]
  );

  if (!doubt.length) throw new Error("Doubt not found");

  if (doubt[0].status === "resolved") {
    throw new Error("This doubt is already resolved");
  }

  let actualUserId = parseInt(userId);

  if (responderType === "teacher") {

    //fetch first then check
    const [teacherRows] = await pool.execute(
      doubtModel.GET_TEACHER_BY_USER_ID,
      [userId]
    );

    if (!teacherRows.length) throw new Error("Teacher not found");

    if (doubt[0].assigned_teacher_id !== teacherRows[0].teacher_id) {
      throw new Error("You are not assigned to this doubt");
    }

    actualUserId = parseInt(userId); // userId is already users.user_id

  } else if (responderType === "student") {

    if (doubt[0].student_user_id !== parseInt(userId)) {
      throw new Error("You can only reply to your own doubt");
    }

    actualUserId = parseInt(userId);
  }

  // Insert reply
  const [replyResult] = await pool.execute(
    doubtModel.INSERT_DOUBT_REPLY,
    [doubtId, actualUserId, responderType, replyText]
  );

  // Insert attachments (optional)
  if (files && files.length > 0) {
    for (const file of files) {
      const fileType = getFileType(file.mimetype);
      await pool.execute(
        doubtModel.INSERT_REPLY_ATTACHMENT,
        [
          replyResult.insertId,
          actualUserId,
          fileType || "other",
          file.path || null,
          file.originalname || null,
          Math.round(file.size / 1024)
        ]
      );
    }
  }

  // // Update doubt status only when teacher replies
  // if (responderType === "teacher") {
  //   await pool.execute(
  //     doubtModel.UPDATE_DOUBT_STATUS,
  //     [doubtId]
  //   );
  // }
  if (responderType === "teacher") {
 
  }

  return {
    replyId: replyResult.insertId,
    doubtId,
    responderType
    // status: responderType === "teacher" ? "answered" : "open"
  };
};

export const getDoubtsByFilter = async (
  userId,
  subjectId,
  courseId
) => {

  
  if (!subjectId && !courseId) {
    throw new Error("Either subjectId or courseId is required");
  }

  // check if student
  const [[student]] = await pool.execute(
    'SELECT student_id FROM students WHERE user_id = ?',
    [userId]
  );

  // check if teacher
  const [[teacher]] = await pool.execute(
    doubtModel.GET_TEACHER_BY_USER_ID,
    [userId]
  );

  if (student) {
    const [rows] = await pool.execute(
      subjectId
        ? doubtModel.GET_STUDENT_DOUBTS_BY_SUBJECT
        : doubtModel.GET_STUDENT_DOUBTS_BY_COURSE,
      subjectId
        ? [userId, subjectId]
        : [userId, courseId]
    );
    return rows;

  } else if (teacher) {
    const [rows] = await pool.execute(
      subjectId
        ? doubtModel.GET_TEACHER_DOUBTS_BY_SUBJECT
        : doubtModel.GET_TEACHER_DOUBTS_BY_COURSE,
      subjectId
        ? [teacher.teacher_id, subjectId]
        : [teacher.teacher_id, courseId]
    );
    return rows;

  } else {
    throw new Error("User is neither a student nor a teacher");
  }
};


export const updateDoubtStatus = async (doubtId, userId) => {

  if (!doubtId || !userId) {
    throw new Error("Missing required fields");
  }

  const [doubt] = await pool.execute(
    doubtModel.GET_DOUBT_BY_ID,
    [doubtId]
  );

  if (!doubt.length) {
    throw new Error("Doubt not found");
  }

  if (doubt[0].student_user_id !== parseInt(userId)) {
    throw new Error("You can only resolve your own doubt");
  }

  if (doubt[0].status === "resolved") {
    throw new Error("Doubt is already resolved");
  }

  await pool.execute(
    doubtModel.UPDATE_DOUBT_STATUS_RESOLVED,
    [doubtId]
  );

  await emitAnalyticsEvent(ANALYTICS_EVENTS.DOUBT_RESOLVED, {
  teacherId: doubt[0].assigned_teacher_id,
  studentId: userId
});

  return {
    doubtId: parseInt(doubtId),
    status: "resolved"
  };
};




export const searchDoubts = async (userId, keyword) => {

  if (!keyword || keyword.trim() === '') {
    throw new Error("Search keyword is required");
  }

  const searchTerm = `%${keyword}%`;

  // check if student
  const [[student]] = await pool.execute(
    'SELECT student_id FROM students WHERE user_id = ?',
    [userId]
  );

  if (student) {
    const [rows] = await pool.execute(
      doubtModel.SEARCH_STUDENT_DOUBTS,
      [userId, searchTerm, searchTerm, searchTerm]
    );
    return rows;
  }

  // check if teacher
  const [[teacher]] = await pool.execute(
    doubtModel.GET_TEACHER_BY_USER_ID,
    [userId]
  );

  if (teacher) {
    const [rows] = await pool.execute(
      doubtModel.SEARCH_TEACHER_DOUBTS,
      [userId, searchTerm, searchTerm, searchTerm]
    );
    return rows;
  }

  throw new Error("User is neither a student nor a teacher");
};



export const getEnrolledCourses = async (userId) => {
  const [[student]] = await pool.execute(
    'SELECT student_id FROM students WHERE user_id = ?',
    [userId]
  );

  if (student) {
    const [rows] = await pool.execute(
      doubtModel.GET_STUDENT_ENROLLED_COURSES,
      [userId]
    );
    return rows;
  }

  const [rows] = await pool.execute(
    doubtModel.GET_TEACHER_COURSES,
    [userId]
  );
  return rows;
};

export const getSubjectsByCourse = async (userId, courseId) => {
  const [[student]] = await pool.execute(
    'SELECT student_id FROM students WHERE user_id = ?',
    [userId]
  );

  if (student) {
    const [rows] = await pool.execute(
      doubtModel.GET_SUBJECTS_BY_COURSE,
      [courseId]
    );
    return rows;
  }

  const [rows] = await pool.execute(
    doubtModel.GET_TEACHER_SUBJECTS_BY_COURSE,
    [userId, courseId]
  );
  return rows;
};


export const getTeacherPendingCount = async (userId) => {
  const [[result]] = await pool.execute(
    doubtModel.GET_TEACHER_PENDING_COUNT,
    [userId]
  );

  return { pendingCount: result.pending_count };
};







export const getAdminTeacherDoubtAnalytics = async () => {

  const [rows] = await pool.execute(
    doubtModel.GET_ADMIN_TEACHER_DOUBT_ANALYTICS
  );

  if (!rows.length) {
    return [];
  }

  // Group courses under each teacher
  const teacherMap = new Map();

  for (const row of rows) {

    if (!teacherMap.has(row.teacher_id)) {
      teacherMap.set(row.teacher_id, {
        teacherId:   row.teacher_id,
        teacherName: `${row.teacher_first_name} ${row.teacher_last_name}`.trim(),
        courses: [],
        totalOverdueCount: 0
      });
    }

    const teacher = teacherMap.get(row.teacher_id);

    teacher.courses.push({
      courseId:          row.course_id,
      courseName:        row.course_name,
      overdueOpenCount:  row.overdue_open_count
    });

    teacher.totalOverdueCount += row.overdue_open_count;
  }

  return Array.from(teacherMap.values());
};