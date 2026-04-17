/**
 * AUTHORS: Preethi Deevanapelli,
 * Subjects Controller
 * ========================
 * Handles HTTP requests and responses for all subjects endpoints.
 *
 * This layer ONLY:
 * - Reads from req (body, params, query, user)
 * - Calls the service layer
 * - Sends back the response
 *
 * NO business logic here. NO direct DB calls. Keep it thin.
 */

import { 
  createSubjectService, 
  deleteSubjectByIdService, 
  getAllSubjectsService, 
  getSubjectByIdService, 
  updateSubjectByIdService 
} from "../services/subjects.service.js";




/**
 * POST /api/subjects
 * create subjects
 */
export const createSubjectController = async (req, res) => {
    try {
        const result = await createSubjectService(req.body);
        return res.status(201).json({
            success: true,
            message: result.message,
            data: {
                subjectId: result.subjectId
            }
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error" 
        });
    }
};

/**
 * GET /api/subjects
 * GET /api/v1/subjects?search=math
 * GET /api/v1/subjects?page=2&limit=5
 * GET /subjects?sortBy=subject_name&order=ASC
 * GET /api/v1/subjects?sortBy=created_at
 * GET /api/v1/subjects?teacher_id=7
 * GET /api/v1/subjects?course_id=3
 */
export const getAllSubjectsController = async (req, res) => {
  try {
    const result = await getAllSubjectsService(req.query);

    if (!result.subjects || result.subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subjects found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subjects fetched successfully",
      pagination: result.pagination,
      data: result.subjects
    });

  } catch (error) {

    if (error.message === "Invalid page number" || error.message === "Invalid limit value") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
};

/**
 * GET /api/subjects/:id
 * get subject by Id
 */
export const getSubjectByIdController = async (req, res) => {
  try {

    const { id } = req.params;

    const subject = await getSubjectByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Subject fetched successfully",
      data: subject
    });

  } catch (error) {

    if (error.message === "Subject ID is required" ||
        error.message === "Invalid subject ID") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === "Subject not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * PATCH /api/subjects/:id
 * update subject by Id
 */
export const updateSubjectByIdController = async (req, res) => {
  try {

    const  subjectId  = req.params.id;
    const updatedSubject = await updateSubjectByIdService(subjectId, req.body);

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: updatedSubject
    });

  } catch (error) {

    if (
      error.message === "Subject ID is required" ||
      error.message === "Invalid subject ID" ||
      error.message === "Invalid subject name" ||
      error.message === "Invalid course ID" ||
      error.message === "Invalid teacher ID" ||
      error.message === "Invalid display order" ||
      error.message === "At least one field is required to update"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === "Subject not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/subjects/:id
 * delete subject by Id
 */
export const deleteSubjectByIdController = async (req, res) => {
  try {

    const subjectId = req.params.id;

    const deletedSubject = await deleteSubjectByIdService(subjectId);

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
      data: deletedSubject
    });

  } catch (error) {

    if (
      error.message === "Subject ID is required" ||
      error.message === "Invalid subject ID"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === "Subject not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};