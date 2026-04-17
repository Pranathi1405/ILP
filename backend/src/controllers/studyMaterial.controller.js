/**
 * AUTHORS: Preethi Deevanapelli
 * Study Material Controller
 */

import { 
    createAnnotationService,
    createStudyMaterial, 
    deleteAnnotationService, 
    deleteStudyMaterialService, 
    getAllStudyMaterialsService, 
    getAnnotationsService, 
    getStudentMaterialWithAnnotationsService, 
    getStudyMaterialByIdService,
    updateStudyMaterialService
} from "../services/studyMaterial.service.js";


export const createStudyMaterialController = async (req, res) => {
    try {
        const result = await createStudyMaterial(req.body);

        return res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Create Study Material Error:", error);

        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

export const getAllStudyMaterialsController = async (req, res) => {
    try {
        const result = await getAllStudyMaterialsService(req.query, req.user);

        return res.status(200).json({
            success: true,
            message: "Study materials fetched successfully",
            ...result
        });
    } catch (error) {
        console.error("Get all Study Material Error:", error);

        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

export const getStudyMaterialByIdController = async (req, res) => {
    try {
        const data = await getStudyMaterialByIdService(
            req.params.id,
            req.user
        );

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        if (error.message.includes("not found")) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes("Access denied")) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const updateStudymaterialController = async (req, res) => {
    try {
        const response = await updateStudyMaterialService(req.params.id, req.body);

        return res.status(200).json({
        success: true,
        message: "study material updated successfully",
        data: response
        });

    } catch (error) {
        console.error("Controller Error:", error);

        return res.status(500).json({
        success: false,
        message: "Internal Server Error"
        });
    }
};

export const deleteStudyMaterialController = async (req, res) => {
  try {

    const result = await deleteStudyMaterialService(req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error("Delete Study Material Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

// Create
export const createAnnotationController = async (req, res) => {
    try {
        const result = await createAnnotationService(req.body, req.user);

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message
        });
    }
};


// Get
export const getAnnotationsController = async (req, res) => {
    try {
        const data = await getAnnotationsService(
            req.params.materialId,
            req.user
        );

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message
        });
    }
};


// Delete
export const deleteAnnotationController = async (req, res) => {
    try {
        const result = await deleteAnnotationService(
            req.params.id,
            req.user
        );

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message
        });
    }
};

export const getStudentMaterialWithAnnotationsController = async (req, res) => {
    try {
        const result = await getStudentMaterialWithAnnotationsService(
            req.params.id,
            req.user
        );

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};