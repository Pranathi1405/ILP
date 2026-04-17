/**
 * AUTHORS: Preethi Deevanapelli,
 * Study Material Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */

import express from "express";
import { 
    createAnnotationController,
    createStudyMaterialController, 
    deleteAnnotationController, 
    deleteStudyMaterialController, 
    getAllStudyMaterialsController, 
    getAnnotationsController, 
    getStudentMaterialWithAnnotationsController, 
    getStudyMaterialByIdController, 
    updateStudymaterialController
} from "../controllers/studyMaterial.controller.js";
import { authenticate, studentOnly, teacherOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, teacherOnly, createStudyMaterialController);

router.get("/", authenticate, getAllStudyMaterialsController);

router.get("/:id", authenticate, getStudyMaterialByIdController);

router.patch("/:id", authenticate, teacherOnly, updateStudymaterialController);

router.delete("/:id", authenticate, teacherOnly, deleteStudyMaterialController);

router.post("/annotations", authenticate, studentOnly, createAnnotationController);

router.get("/annotations/:materialId", authenticate, studentOnly, getAnnotationsController);

router.delete("/annotations/:id", authenticate, studentOnly, deleteAnnotationController);

router.get("/students/:id", authenticate, studentOnly, getStudentMaterialWithAnnotationsController);

export default router;
