/**
 * AUTHORS: Preethi Deevanapelli,
 * Module Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */


import express from "express";
import { 
    createModuleController, 
    deleteModuleByIdController, 
    getAllModulesController, 
    getModuleByIdController, 
    updateModuleByIdController
} from "../controllers/modules.controller.js";
import { authenticate, teacherOrAdmin } from "../middleware/auth.middleware.js";

const router = express();

//create module || POST
router.post('/', authenticate, teacherOrAdmin, createModuleController);

//get all modules || GET
router.get('/', getAllModulesController);

//get module by Id || GET
router.get('/:id', getModuleByIdController);

//update module by Id || PATCH
router.patch('/:id', authenticate, teacherOrAdmin, updateModuleByIdController);

//delete module by Id || DELETE
router.delete('/:id', authenticate, teacherOrAdmin, deleteModuleByIdController);

export default router;