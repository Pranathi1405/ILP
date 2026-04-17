
/**
 * AUTHORS: Preethi Deevanapelli,
 * Subjects Service     
 * */


import pool from "../config/database.config.js";
import { 
  checkSubjectExistsQuery,
  countSubjectsQuery, 
  deleteSubjectByIdQuery, 
  findCourseByIdQuery, 
  findDuplicateSubjectQuery, 
  findTeacherByIdQuery, 
  fixOldCourseOrdering, 
  getAllSubjectsQuery, 
  getCourseNameQuery, 
  getMaxDisplayOrderQuery, 
  getSubjectByIdQuery, 
  getSubjectWithTeacherQuery, 
  getTeacherDetailsQuery, 
  insertSubjectQuery, 
  reorderSubjectsAfterDeleteQuery, 
  shiftDisplayOrderDownQuery, 
  shiftDisplayOrderQuery, 
  shiftDisplayOrderUpQuery, 
 } from "../models/subjects.model.js";
import { sendSubjectAssignmentEmail, sendTeacherUnassignmentEmail } from "../utils/subjectEmails.js";

/**
 * CREATE SUBJECT
 */
export const createSubjectService = async (data) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const { courseId, teacherId, title, description, displayOrder } = data;
  
    // Basic Validation
    if (!courseId) {
      throw {status: 400, message: "courseId is required" };
    }
  
    if (!teacherId) {
      throw {status: 400, message: "teacherId is required" };
    }
  
    if (!title) {
      throw {status: 400, message: "title is required" };
    }
  
    // Ensure title is valid string
    if (typeof title !== "string" || title.trim().length === 0) {
      throw {status: 400, message: "Title must be a valid string" };
    }
  
    // Validate displayOrder only if provided
    // Must be positive integer
    if (displayOrder !== undefined) {
      const parsed = parseInt(displayOrder);
      if (isNaN(parsed) || parsed <= 0) {
        throw {status: 400, message: "displayOrder must be a positive number" };
      }
    }
  
    // Check if Course Exists
    const [courseRows] = await connection.execute(findCourseByIdQuery, [courseId]);
  
    if (courseRows.length === 0) {
      throw {status: 404, message: "Course not found" };
    }
  
    // Check if Teacher Exists
    const [teacherRows] = await connection.execute(findTeacherByIdQuery, [teacherId]);
  
    if (teacherRows.length === 0) {
      throw {status: 404, message: "Teacher not found" };
    }
  
    // Prevent Duplicate Subject Inside Same Course
    const [duplicateRows] = await connection.execute(findDuplicateSubjectQuery, [
      courseId,
      title.trim()
    ]);
  
    if (duplicateRows.length > 0) {
      throw {status: 400, message: "Subject with same title already exists in this course" };
    }
  
    const [orderResult] = await connection.execute(getMaxDisplayOrderQuery, [courseId]);
    
    // Get current max display order in that course
    const maxOrder = orderResult[0].maxOrder;
  
    let finalOrder;
  
    if(displayOrder === undefined) {
      // If not provided → append to end
      finalOrder = maxOrder + 1;
    } else {
      if(displayOrder > maxOrder + 1) {
        // If user gives large number → clamp to end
        finalOrder = maxOrder + 1;
      } else {
        // Insert at specific position
        finalOrder = displayOrder;
  
        /* move others down */
        await connection.execute (
          shiftDisplayOrderQuery,
          [courseId, displayOrder]
        );
      }
    }
  
    // Insert Subject
    const [result] = await connection.execute(insertSubjectQuery, [
      courseId,
      teacherId,
      title.trim(),
      description || null,
      finalOrder
    ]);
  
    if (!result.insertId) {
      throw {status: 400, message:"Failed to create subject"};
    }
  
    // get teacher details
    const [teacherDetails] = await connection.execute(getTeacherDetailsQuery, [teacherId]);
  
    if (!teacherDetails.length) {
      throw {status: 404, message:"Teacher not found"};
    }
  
    const teacher = teacherDetails[0];
  
    // get course name
    const [courseDetails] = await connection.execute(getCourseNameQuery, [courseId]);
  
    if (!courseDetails.length) {
      throw {status: 404, message:"Course not found"};
    }
  
    const course = courseDetails[0];
  
    // send email (don't break API if email fails)
    try {
      await sendSubjectAssignmentEmail({
        teacherEmail: teacher.email,
        teacherName: teacher.first_name,
        subjectName: title,
        courseName: course.course_name
      });
      console.log("Subject assigned email sent to:", teacher.email);
    } catch (err) {
      console.error("Email sending failed:", err.message);
    }
  
    return {
      subjectId: result.insertId,
      message: "Subject created successfully"
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * GET ALL SUBJECTS
 */
export const getAllSubjectsService = async (query) => {
  let {
    page = 1,
    limit = 10,
    search,
    courseId,
    teacherId,
    sortBy = "created_at",
    order = "DESC"
  } = query;

  // Pagination validation
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page <= 0) throw {status: 400, message:"Invalid page number"};
  if (isNaN(limit) || limit <= 0) throw {status: 400, message:"Invalid limit value"};

  // Offset calculation for SQL LIMIT
  const offset = (page - 1) * limit;

  let sql = getAllSubjectsQuery;
  let countSql = countSubjectsQuery;

  // Build WHERE conditions dynamically
  let conditions = [];
  let params = [];
  let countParams = [];

  // search
  if (search) {
    conditions.push("subject_name LIKE ?");
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  // filter by course
  if (courseId) {
    conditions.push("course_id = ?");
    params.push(courseId);
    countParams.push(courseId);
  }

  // filter by teacher
  if (teacherId) {
    conditions.push("teacher_id = ?");
    params.push(teacherId);
    countParams.push(teacherId);
  }

  // apply conditions
  if (conditions.length > 0) {
    const whereClause = " WHERE " + conditions.join(" AND ");
    sql += whereClause;
    countSql += whereClause;
  }

  // allowed sorting columns
  const allowedSortFields = ["created_at", "subject_name"];
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = "created_at";
  }

  order = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  sql += ` ORDER BY ${sortBy} ${order} LIMIT ${limit} OFFSET ${offset}`;

  // Data query → paginated results
  const [subjects] = await pool.execute(sql, params);

  // Count query → total records
  const [countResult] = await pool.execute(countSql, countParams);

  const total = countResult[0].total;

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    subjects
  };
};

/**
 * GET SUBJECT BY ID
 */
export const getSubjectByIdService = async (subjectId) => {

  // Validate ID
  if (!subjectId) {
    throw {status: 400, message:"Subject ID is required"};
  }

  const parsedId = parseInt(subjectId);

  if (isNaN(parsedId) || parsedId <= 0) {
    throw {status: 400, message:"Invalid subject ID"};
  }

  const [rows] = await pool.execute(getSubjectByIdQuery, [parsedId]);

  if (!rows || rows.length === 0) {
    throw {status: 404, message:"Subject not found"};
  }

  return rows[0];
};

/**
 * UPDATE SUBJECT BY ID
 */
export const updateSubjectByIdService = async (subjectId, body) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (!subjectId) {
      throw {status: 400, message:"Subject ID is required"};
    }
  
    const parsedId = parseInt(subjectId);
  
    if (isNaN(parsedId) || parsedId <= 0) {
      throw {status: 400, message:"Invalid subject ID"};
    }
  
    const { subjectName, courseId, teacherId, description, displayOrder } = body;
  
    // Ensure at least one field is provided
    if (
      subjectName === undefined &&
      courseId === undefined &&
      teacherId === undefined &&
      description === undefined &&
      displayOrder === undefined
    ) {
      throw {status: 400, message:"At least one field is required to update"};
    }
  
    // get existing subject
    const [subjectRows] = await connection.execute(getSubjectWithTeacherQuery, [parsedId]);
  
    if (!subjectRows.length) {
      throw {status: 404, message:"Subject not found"};
    }
  
    const existingSubject = subjectRows[0];
  
    // Store old values (used for ordering + email logic)
    const oldTeacherId = existingSubject.teacher_id;
    const oldCourseId = existingSubject.course_id;
    const oldOrder = existingSubject.display_order;
    const oldSubjectName = existingSubject.subject_name;
  
    let newCourseId = oldCourseId;
    
    if (courseId !== undefined) {
      const parsedCourseId = parseInt(courseId);
      if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
        throw {status: 400, message:"Invalid course ID"};
      }
      
      const [courseRows] = await connection.execute (
        findCourseByIdQuery,
        [parsedCourseId]
      );
  
      // If courseId is changing → validate new course exists
      if(!courseRows.length) {
        throw {status: 404, message:"Course not found"};
      }
  
      newCourseId = parsedCourseId;
    }
  
    let newOrder = oldOrder;
    
    // Parse new display order
    if (displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder);
      if (isNaN(parsedOrder) || parsedOrder <= 0) {
        throw {status: 400, message:"Invalid display order"};
      }
      
      newOrder = parsedOrder;
    }
  
    const [orderResult] = await connection.execute (
      getMaxDisplayOrderQuery,
      [newCourseId]
    );
  
    // Get max order in NEW course
    let maxOrder = orderResult[0].maxOrder;
  
    if (newCourseId === oldCourseId) {
      // Reduce maxOrder by 1 because current subject will move
      maxOrder = maxOrder - 1;
    }
  
    // Clamp order to valid range
    if (newOrder > maxOrder + 1) {
      newOrder = maxOrder + 1;
    }
  
    if (newCourseId !== oldCourseId) {
      // Fill the gap left in old course
      await connection.execute (
        fixOldCourseOrdering,
        [oldCourseId, oldOrder]
      );
  
      await connection.execute (
        // Make space in new course
        shiftDisplayOrderQuery,
        [newCourseId, newOrder]
      );
    } else if (newOrder !== oldOrder ) {
      if ( newOrder > oldOrder) {
        await connection.execute(
          shiftDisplayOrderDownQuery,
          [oldCourseId, oldOrder, newOrder]
        );
      } else {
        await connection.execute (
          shiftDisplayOrderUpQuery,
          [oldCourseId, newOrder, oldOrder]
        );
      }
    }
  
    let fields = [];
    let values = [];
  
    // Determine name to check (new or existing)
    let nameToCheck = oldSubjectName;
  
    if (subjectName !== undefined) {
      if (typeof subjectName !== "string" || subjectName.trim() === "") {
        throw {status: 400, message:"Invalid subject name"};
      }
      nameToCheck = subjectName.trim();
    }
  
    // Run duplicate check if:
    // - name is changing OR
    // - course is changing
    if (subjectName !== undefined || newCourseId !== oldCourseId) {
      const [duplicate] = await connection.execute(findDuplicateSubjectQuery, [
        newCourseId,
        nameToCheck
      ]);
  
      if (duplicate.length && duplicate[0].subject_id !== parsedId) {
        throw {status: 400, message:"Duplicate subject in same course"};
      }
    }
  
    // Now handle subject_name update
    if (subjectName !== undefined) {
      fields.push("subject_name = ?");
      values.push(nameToCheck);
    }
  
    if (teacherId !== undefined) {
      const parsedTeacherId = parseInt(teacherId);
      if (isNaN(parsedTeacherId) || parsedTeacherId <= 0) {
        throw {status: 400, message:"Invalid teacher ID"};
      }
      const [teacher] = await connection.execute(
        findTeacherByIdQuery,
        [teacherId]
      );
      if (teacher.length === 0) {
        throw {status: 404, message:"Teacher not found"};
      }
      fields.push("teacher_id = ?");
      values.push(parsedTeacherId);
    }
  
    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
  
    if (newCourseId !== oldCourseId) {
      fields.push("course_id = ?");
      values.push(newCourseId);
    }
  
    if (newOrder !== oldOrder) {
      fields.push ("display_order = ?");
      values.push (newOrder);
    }
  
    const sql = `
      UPDATE course_subjects
      SET ${fields.join(", ")}
      WHERE subject_id = ?
    `;
  
    values.push(parsedId);
  
    const [result] = await connection.execute(sql, values);
  
    if (!result.affectedRows) {
      throw {status: 400, message:"Failed to update subject"};
    }
  
    if (teacherId !== undefined && parseInt(teacherId) !== oldTeacherId) {
  
      try {
  
        // new teacher
        const [newTeacherRows] = await connection.execute(getTeacherDetailsQuery, [teacherId]);
  
        // old teacher
        const [oldTeacherRows] = await connection.execute(getTeacherDetailsQuery, [oldTeacherId]);
  
        // course
        const [courseRows] = await connection.execute(getCourseNameQuery, [newCourseId]);
  
        const courseName = courseRows[0].course_name;
  
        const newTeacher = newTeacherRows[0];
        const oldTeacher = oldTeacherRows[0];
  
        // send assignment email
        await sendSubjectAssignmentEmail({
          teacherEmail: newTeacher.email,
          teacherName: newTeacher.first_name,
          subjectName,
          courseName
        });
  
        // send unassignment email
        await sendTeacherUnassignmentEmail({
          teacherEmail: oldTeacher.email,
          teacherName: oldTeacher.first_name,
          subjectName,
          courseName
        });
  
      } catch (err) {
  
        console.error("Teacher email notification failed:", err.message);
  
      }
  
    }
  
    return { subjectId: parsedId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * DELETE SUBJECT BY ID
 */
export const deleteSubjectByIdService = async (subjectId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    if (!subjectId) {
      throw {status: 400, message:"Subject ID is required"};
    }
  
    const parsedId = parseInt(subjectId);
  
    if (isNaN(parsedId) || parsedId <= 0) {
      throw {status: 400, message:"Invalid subject ID"};
    }
  
    // check if subject exists
    const [existing] = await connection.execute(checkSubjectExistsQuery, [parsedId]);
  
    if (!existing || existing.length === 0) {
      throw {status: 404, message:"Subject not found"};
    }
  
    const courseId = existing[0].course_id;
    const displayOrder = existing[0].display_order;
  
    const [result] = await connection.execute(deleteSubjectByIdQuery, [parsedId]);
  
    if (!result || result.affectedRows === 0) {
      throw {status: 400, message:"Failed to delete subject"};
    }
  
    await connection.execute(
      reorderSubjectsAfterDeleteQuery,
      [courseId, displayOrder]
    );
  
    return {
      subjectId: parsedId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};