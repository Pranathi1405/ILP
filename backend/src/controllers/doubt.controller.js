//Author -> vamshi - Doubt Clarification
import * as doubtService from "../services/doubt.service.js";
import pool from "../config/database.config.js";

//creation of doubt by student
export const createDoubt = async (req, res) => {
  try {
    const userId=req.user.id;
    const {courseId, subjectId, teacherId, questionText } = req.body;

    const files = req.files || [];   //pass real files

    const result = await doubtService.createDoubt(
      userId,
      courseId,
      subjectId,
      teacherId,
      questionText,
      files    
    );

    res.status(201).json({
      success: true,
      message: "Doubt created successfully",
      data: result
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};
//Student my-doubts section displays all doubts
export const getMyDoubts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const doubts = await doubtService.getMyDoubts(userId, role, req.query);

    res.status(200).json({
      success: true,
      message: 'Doubts fetched successfully',
      data: doubts.data,
      pagination: doubts.pagination
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// //Teacher - get doubts in doubt corner
// export const getTeacherDoubts = async (req, res) => {
//   try {

//     const  userId  = req.user.id;

//     if (!userId) {
//       return res.status(400).json({
//         message: "userId is required"
//       });
//     }

//     const doubts = await doubtService.getTeacherDoubts(userId);

//     res.status(200).json({
//       success: true,
//       message: "Doubts fetched successfully",
//       data: doubts
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

//Teacher reply to doubt
export const replyToDoubt = async (req, res) => {
  try {
    const userId=req.user.id;
    const { doubtId, replyText} = req.body;
    const files = req.files || [];

    // derive responderType from DB using userId
    const [[student]] = await pool.execute(
      'SELECT student_id FROM students WHERE user_id = ?', [userId]
    );
    const responderType = student ? 'student' : 'teacher';

    const result = await doubtService.replyToDoubt(
      doubtId,
      userId,
      replyText,
      responderType,
      files
    );

    res.status(201).json({
      success: true,
      message: "Reply posted successfully",
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

//getting doubt details on student dashboard with all replies and attachments
export const getDoubtDetail = async (req, res) => {
  try {
    const { doubtId } = req.params;

    const result = await doubtService.getDoubtDetail(doubtId);

    res.status(200).json({
      success: true,
      message: "Doubt details fetched successfully",
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// GET /doubts/enrolled-courses
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await doubtService.getEnrolledCourses(userId);

    res.status(200).json({
      success: true,
      message: 'Courses fetched successfully',
      data: result
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /doubts/subjects?courseId=2
export const getSubjectsByCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId is required'
      });
    }

    const result = await doubtService.getSubjectsByCourse(userId, courseId);

    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      data: result
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoubtsByFilter = async (req, res) => {
  try {

    const userId = req.user.id;
    const {subjectId, courseId } = req.query;

    const result = await doubtService.getDoubtsByFilter(
      userId,
      subjectId,
      courseId
    );

    res.status(200).json({
      success: true,
      message: "Doubts fetched successfully",
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


export const updateDoubtStatus = async (req, res) => {
  try {
    const { doubtId } = req.params;
    const userId = req.user.id;

    const result = await doubtService.updateDoubtStatus(doubtId, userId);

    res.status(200).json({
      success: true,
      message: "Marked as resolved successfully",
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// GET /doubts/search?keyword=maths
export const searchDoubts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'keyword is required'
      });
    }

    const result = await doubtService.searchDoubts(userId, keyword);

    res.status(200).json({
      success: true,
      message: 'Search results fetched successfully',
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


export const getTeacherPendingCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await doubtService.getTeacherPendingCount(userId);

    res.status(200).json({
      success: true,
      message: 'Pending count fetched successfully',
      data,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET /doubts/admin/analytics
export const getAdminTeacherDoubtAnalytics = async (req, res) => {
  try {

    const result = await doubtService.getAdminTeacherDoubtAnalytics();

    res.status(200).json({
      success: true,
      message: 'Teacher doubt analytics fetched successfully',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};