/**
 * AUTHORS: Preethi Deevanapelli,
 * Subjects Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */


import express from "express";
import {  
    createSubjectController, 
    deleteSubjectByIdController, 
    getAllSubjectsController, 
    getSubjectByIdController, 
    updateSubjectByIdController 
} from "../controllers/subjects.controller.js";
import { adminOnly, authenticate } from "../middleware/auth.middleware.js";

const router =  express.Router();

//create subject || POST
router.post('/', authenticate, adminOnly, createSubjectController);

//get all subjects || GET
router.get('/', getAllSubjectsController);

//get subject by Id || GET
router.get('/:id', getSubjectByIdController);

//update a subject || PATCH
router.patch('/:id', authenticate, adminOnly, updateSubjectByIdController);

//delete a subject || DELETE
router.delete('/:id', authenticate, adminOnly, deleteSubjectByIdController);

export default router;