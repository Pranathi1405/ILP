/**
 * AUTHORS: Preethi Deevanapelli,
 * Courses Service     
 * */

import pool from "../config/database.config.js";
import * as courseModel from "../models/courses.model.js";
import { ANALYTICS_EVENTS } from "../constants/analyticsTypes.js";
import {emitAnalyticsEvent} from '../queues/analyticsQueue.js';
/**
 * CREATE COURSE
 */
export const createCourse = async (courseData) => {
  const connection = await pool.getConnection();

  try {
    const {
      courseName,
      courseCode,
      description = null,
      categoryId = null,
      isFree = false,
      medium = "English",
      details = null,
      thumbnailUrl = null,
      difficultyLevel = "beginner",
      price = 0, // base price
      prerequisites = null,
      learningOutcomes = null,
      isPublished = false,
      startDate,
      endDate
    } = courseData;

    const cleanCourseName = courseName?.trim();
    const cleanCourseCode = courseCode?.trim() ?? null;

    if (!cleanCourseName)
      throw { status: 400, message: "courseName is required" };

    const allowedMediums = ["english", "telugu", "hindi"];
    const allowedLevels = ["beginner", "intermediate", "advanced"];

    if (!allowedMediums.includes(medium.toLowerCase()))
      throw { status: 400, message: "Invalid medium" };

    if (!allowedLevels.includes(difficultyLevel.toLowerCase()))
      throw { status: 400, message: "Invalid difficultyLevel" };

    if (typeof isFree !== "boolean")
      throw { status: 400, message: "isFree must be boolean" };

    if (!Number.isFinite(Number(price)) || Number(price) < 0)
      throw { status: 400, message: "Invalid price" };

    // Date validation
    if (!startDate || !endDate)
      throw { status: 400, message: "startDate and endDate are required" };

    if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
      throw { status: 400, message: "Invalid date format" };
    }

    if (new Date(endDate) <= new Date(startDate))
      throw { status: 400, message: "endDate must be after startDate" };

    await connection.beginTransaction();

    // Category validation
    if (categoryId) {
      const [rows] = await connection.execute(
        courseModel.findCategoryById,
        [categoryId]
      );
      if (rows.length === 0)
        throw { status: 400, message: "Category does not exist" };
    }

    // Free course → force price = 0
    const basePrice = isFree ? 0 : Number(price);

    // OPTIONAL: Fetch plan prices (for response purpose only)
    const [plans] = await connection.execute(
      `SELECT plan_id, plan_name, price FROM plans`
    );

    // Calculate pro prices
    const pricing = plans.map(plan => ({
      planId: plan.plan_id,
      planName: plan.plan_name,
      finalPrice: basePrice + Number(plan.price)
    }));

    // Insert course (NO plan_id anymore)
    const [result] = await connection.execute(
      courseModel.insertCourse,
      [
        cleanCourseName,
        cleanCourseCode,
        description,
        categoryId,
        isFree,
        medium.toLowerCase(),
        details,
        thumbnailUrl,
        difficultyLevel.toLowerCase(),
        basePrice,
        prerequisites,
        learningOutcomes,
        isPublished,
        startDate,
        endDate
      ]
    );

    await connection.commit();

    return {
      courseId: result.insertId,
      basePrice,
      pricing // return calculated plan-based prices
    };

  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw {
        status: 400,
        message: "Course name or Course code already exists"
      };
    }

    throw error;
  } finally {
    connection.release();
  }
};


/**
 * GET ALL COURSES
 */
export const getAllCourses = async (query = {}) => {
  let {
    page = 1,
    limit = 10,
    search,
    categoryId,
    difficulty,
    minPrice,
    maxPrice,
    type
  } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page <= 0)
    throw { status: 400, message: "Invalid page number" };

  if (isNaN(limit) || limit <= 0)
    throw { status: 400, message: "Invalid limit" };

  const offset = (page - 1) * limit;

  let conditions = [];
  let values = [];

  if (search) {
    conditions.push("c.course_name LIKE ?");
    values.push(`%${search}%`);
  }

  if (categoryId) {
    conditions.push("c.category_id = ?");
    values.push(categoryId);
  }

  if (difficulty) {
    const allowed = ["beginner", "intermediate", "advanced"];
    if (!allowed.includes(difficulty)) {
      throw { status: 400, message: "Invalid difficulty filter" };
    }
    conditions.push("c.difficulty_level = ?");
    values.push(difficulty);
  }

  if (minPrice !== undefined) {
    conditions.push("c.price >= ?");
    values.push(minPrice);
  }

  if (maxPrice !== undefined) {
    conditions.push("c.price <= ?");
    values.push(maxPrice);
  }

  if (type === "free") conditions.push("c.is_free = 1");
  if (type === "paid") conditions.push("c.is_free = 0");

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const dataQuery = `
    ${courseModel.browseCoursesSelect}
    ${courseModel.browseCoursesBase}
    ${whereClause}
    ORDER BY c.created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countQuery = `
    ${courseModel.browseCoursesCount}
    ${courseModel.browseCoursesBase}
    ${whereClause}
  `;

  const [courses] = await pool.execute(dataQuery, values);
  const [countResult] = await pool.execute(countQuery, values);

  const total = countResult[0].total;

  // Fetch only required plans
  const [plans] = await pool.execute(`
    SELECT plan_code, price FROM plans
    WHERE LOWER(plan_code) IN ('basic', 'pro')
  `);

  let basicPlanPrice = 0;
  let proPlanPrice = 0;

  plans.forEach(plan => {
    if (plan.plan_code === "basic") basicPlanPrice = Number(plan.price);
    if (plan.plan_code === "pro") proPlanPrice = Number(plan.price);
  });

  // Attach pricing
  const updatedCourses = courses.map(course => {
    const basePrice = Number(course.price);

    return {
      ...course,
      basicPrice: course.is_free ? 0 : basePrice + basicPlanPrice,
      proPrice: course.is_free ? 0 : basePrice + proPlanPrice
    };
  });

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    courses: updatedCourses
  };
};

/**
 * GET COURSE BY ID
 */
export const getCourseById = async (courseId) => {
  if (!Number.isInteger(courseId) || courseId <= 0)
    throw { status: 400, message: "Invalid Course ID" };

  // Fetch course
  const [rows] = await pool.execute(courseModel.findCourseById, [courseId]);

  if (rows.length === 0)
    throw { status: 404, message: "No course found" };

  const course = rows[0];

  // Fetch teachers
  const [teachers] = await pool.execute(
    courseModel.findCourseTeachers,
    [courseId]
  );

  // Fetch BASIC & PRO plans
  const [plans] = await pool.execute(`
    SELECT plan_code, price 
    FROM plans 
    WHERE LOWER(plan_code) IN ('basic', 'pro')
  `);

  let basicPlanPrice = 0;
  let proPlanPrice = 0;

  plans.forEach(plan => {
    if (plan.plan_code === "basic") basicPlanPrice = Number(plan.price);
    if (plan.plan_code === "pro") proPlanPrice = Number(plan.price);
  });

  const basePrice = Number(course.price);

  return {
    ...course,

    basicPrice: course.is_free ? 0 : basePrice + basicPlanPrice,
    proPrice: course.is_free ? 0 : basePrice + proPlanPrice,

    teachers
  };
};


/**
 * UPDATE COURSE
 */
export const updateCourseById = async (courseId, updateData) => {
  if (!Number.isInteger(courseId) || courseId <= 0)
    throw { status: 400, message: "Invalid course Id" };

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Fetch current course (NO plan_id anymore)
    const [rows] = await connection.execute(
      "SELECT is_free, price, start_date, end_date FROM courses WHERE course_id = ?",
      [courseId]
    );

    if (rows.length === 0)
      throw { status: 404, message: "Course not found" };

    const currentCourse = rows[0];

    const updates = [];
    const values = [];

    const {
      courseName,
      description,
      categoryId,
      medium,
      difficultyLevel,
      price,
      prerequisites,
      learningOutcomes,
      isPublished,
      courseCode,
      isFree,
      startDate,
      endDate
    } = updateData || {};

    const allowedLevels = ["beginner", "intermediate", "advanced"];
    const allowedMediums = ["english", "telugu", "hindi"];

    let isPriceUpdated = false;

    // Course Name
    if (courseName !== undefined) {
      if (!courseName.trim())
        throw { status: 400, message: "Invalid courseName" };

      updates.push("course_name = ?");
      values.push(courseName.trim());
    }

    // Description
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description?.trim() || null);
    }

    // Category
    if (categoryId !== undefined) {
      if (categoryId === null) {
        updates.push("category_id = ?");
        values.push(null);
      } else {
        if (!Number.isInteger(categoryId) || categoryId <= 0)
          throw { status: 400, message: "Invalid categoryId" };

        const [category] = await connection.execute(
          courseModel.findCategoryById,
          [categoryId]
        );

        if (category.length === 0)
          throw { status: 400, message: "Category does not exist" };

        updates.push("category_id = ?");
        values.push(categoryId);
      }
    }

    // Medium
    if (medium !== undefined) {
      if (!allowedMediums.includes(medium.toLowerCase()))
        throw { status: 400, message: "Invalid medium" };

      updates.push("medium = ?");
      values.push(medium.toLowerCase());
    }

    // Difficulty
    if (difficultyLevel !== undefined) {
      if (!allowedLevels.includes(difficultyLevel.toLowerCase()))
        throw { status: 400, message: "Invalid difficultyLevel" };

      updates.push("difficulty_level = ?");
      values.push(difficultyLevel.toLowerCase());
    }

    // Price (base price only)
    if (price !== undefined) {
      if (!Number.isFinite(Number(price)) || Number(price) < 0)
        throw { status: 400, message: "Price cannot be negative" };

      updates.push("price = ?");
      values.push(Number(price));
      isPriceUpdated = true;
    }

    if (prerequisites !== undefined) {
      updates.push("prerequisites = ?");
      values.push(prerequisites);
    }

    if (learningOutcomes !== undefined) {
      updates.push("learning_outcomes = ?");
      values.push(learningOutcomes);
    }

    if (isPublished !== undefined) {
      if (typeof isPublished !== "boolean")
        throw { status: 400, message: "isPublished must be boolean" };

      updates.push("is_published = ?");
      values.push(isPublished);
    }

    if (courseCode !== undefined) {
      updates.push("course_code = ?");
      values.push(courseCode?.trim());
    }

    // Final values (NO plan logic)
    const finalIsFree =
      isFree !== undefined ? isFree : currentCourse.is_free;

    const finalPrice =
      price !== undefined ? Number(price) : currentCourse.price;

    const finalStartDate =
      startDate !== undefined ? startDate : currentCourse.start_date;

    const finalEndDate =
      endDate !== undefined ? endDate : currentCourse.end_date;

    // isFree
    if (isFree !== undefined) {
      if (typeof isFree !== "boolean")
        throw { status: 400, message: "isFree must be boolean" };

      updates.push("is_free = ?");
      values.push(isFree);
    }

    // FREE COURSE RULES
    if (finalIsFree) {
      if (finalPrice > 0)
        throw { status: 400, message: "Free course price must be 0" };

      if (!isPriceUpdated) {
        updates.push("price = ?");
        values.push(0);
      }
    }

    // Date rules
    const now = new Date();
    const courseStart = new Date(currentCourse.start_date);
    const courseEnd = new Date(currentCourse.end_date);

    if ((startDate !== undefined || endDate !== undefined) && now > courseEnd) {
      throw { status: 400, message: "Course already ended, cannot modify dates" };
    }

    if (courseStart <= now && startDate !== undefined) {
      throw { status: 400, message: "Cannot modify startDate after course has started" };
    }

    if (
      (startDate && isNaN(new Date(startDate))) ||
      (endDate && isNaN(new Date(endDate)))
    ) {
      throw { status: 400, message: "Invalid date format" };
    }

    if (new Date(finalEndDate) <= new Date(finalStartDate)) {
      throw { status: 400, message: "endDate must be after startDate" };
    }

    if (startDate !== undefined) {
      updates.push("start_date = ?");
      values.push(startDate);
    }

    if (endDate !== undefined) {
      updates.push("end_date = ?");
      values.push(endDate);
    }

    if (updates.length === 0)
      throw { status: 400, message: "No fields provided to update" };

    // Execute update
    const [result] = await connection.execute(
      courseModel.updateCourse(updates),
      [...values, courseId]
    );

    if (result.affectedRows === 0)
      throw { status: 404, message: "Course not found" };

    await connection.commit();

    return { message: "Course updated successfully" };

  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      if (error.sqlMessage.includes("course_name")) {
        throw { status: 400, message: "Course name already exists" };
      }
      if (error.sqlMessage.includes("course_code")) {
        throw { status: 400, message: "Course code already exists" };
      }
      throw { status: 400, message: "Duplicate entry" };
    }

    throw error;
  } finally {
    connection.release();
  }
};


/**
 * DELETE COURSE
 */
export const deleteCourse = async (courseId) => {
    if (!Number.isInteger(courseId) || courseId <= 0)
        throw { status: 400, message: "Invalid course Id" };

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(courseModel.deleteCourseById, [courseId]);

        if (result.affectedRows === 0)
            throw { status: 404, message: "Course not found" };

        await connection.commit();
        return { message: "Successfully deleted a course" };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * ENROLL TO A COURSE
 */
export const enrollCourseService = async (user, courseId) => {
  const parsedCourseId = Number(courseId);

  if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
    throw { status: 400, message: "Invalid courseId" };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ── Role check ─────────────────────────────
    if (user.role !== "student") {
      throw {
        status: 400,
        message: "Only students can enroll in courses",
      };
    }

    // ── Get student_id ─────────────────────────
    const [studentRows] = await connection.query(
      courseModel.getStudentByUserIdQuery,
      [user.id]
    );

    if (studentRows.length === 0) {
      throw { status: 404, message: "Student profile not found" };
    }

    const studentId = studentRows[0].student_id;

    // ── Check course exists ────────────────────
    const [courseRows] = await connection.query(
      courseModel.findCourseById,
      [parsedCourseId]
    );

    if (courseRows.length === 0) {
      throw { status: 404, message: "Course not found" };
    }

    const course = courseRows[0];

    // ── Validations ────────────────────────────
    if (!course.is_published) {
      throw {
        status: 400,
        message: "Cannot enroll in unpublished course",
      };
    }

    if (!course.is_free) {
      throw {
        status: 400,
        message: "Use purchase API to enroll in paid courses",
      };
    }

    const now = new Date();
    const endDate = new Date(course.end_date);

    if (now > endDate) {
      throw {
        status: 400,
        message: "Course already ended",
      };
    }

    // ── Already enrolled check ─────────────────
    const [enrollmentRows] = await connection.query(
      courseModel.checkAlreadyEnrolledQuery,
      [studentId, parsedCourseId]
    );

    if (enrollmentRows.length > 0) {
      throw {
        status: 400,
        message: "Already enrolled in this course",
      };
    }

    // ── Insert enrollment + get ID ─────────────
    const [result] = await connection.query(
      courseModel.insertEnrollmentQuery,
      [studentId, parsedCourseId]
    );

    let enrollmentId = result.insertId;

    // Fallback safety (rare but production-safe)
    if (!enrollmentId) {
      const [rows] = await connection.query(
        `SELECT enrollment_id FROM enrollments WHERE student_id = ? AND course_id = ?`,
        [studentId, parsedCourseId]
      );
      enrollmentId = rows[0]?.enrollment_id;
    }

    await connection.commit();

    // ── Emit analytics (AFTER commit) ──────────
    await emitAnalyticsEvent(ANALYTICS_EVENTS.COURSE_ENROLLED, {
      userId: user.id,
      courseId: parsedCourseId,
      enrollmentId,
    });

    return {
      success: true,
      message: "Successfully enrolled in course",
    };

  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw {
        status: 400,
        message: "Already enrolled in this course",
      };
    }

    throw error;
  } finally {
    connection.release();
  }
};

/**
 * GET ALL ENROLLED STUDENTS
 */
export const getEnrolledStudentsService = async ({
  course_id,
  page = 1,
  limit = 10
}) => {
  const offset = (page - 1) * limit;

  // Proper validation
  const hasCourseFilter =
    course_id !== undefined &&
    course_id !== null &&
    course_id !== "" &&
    !isNaN(course_id);

  // If invalid course_id passed
  if (
    course_id !== undefined &&
    (course_id === "" || isNaN(course_id))
  ) {
    throw new Error("Invalid Course ID");
  }

  const dataQuery = courseModel.getEnrolledStudentsQuery({
    courseIdFilter: hasCourseFilter,
    limit,
    offset
  });

  const countQuery = courseModel.countEnrolledStudentsQuery({
    courseIdFilter: hasCourseFilter
  });

  const params = [];
  const countParams = [];

  if (hasCourseFilter) {
    params.push(Number(course_id));
    countParams.push(Number(course_id));
  }

  params.push(Number(limit), Number(offset));

  const [data] = await pool.query(dataQuery, params);
  const [countResult] = await pool.query(countQuery, countParams);

  return {
    students: data,
    pagination: {
      total: countResult[0]?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
    }
  };
};