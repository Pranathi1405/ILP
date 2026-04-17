/**
 * AUTHORS: Preethi Deevanapelli,
 * Category Routes
 * ====================
 * Maps all API endpoints to their controllers.
 * Authorization is enforced here via middleware.
 */

import express from "express";
import { 
    createCategory, 
    deleteCategory, 
    getAllCategories, 
    getCategoryById, 
    updateCategory 
} from "../controllers/categories.controller.js";

import { 
    adminOnly,
    authenticate,
    teacherOrAdmin 
} from "../middleware/auth.middleware.js";



const router = express.Router();

//create category || POST
router.post('/', authenticate, adminOnly, createCategory);

//get all categories || GET
router.get('/', getAllCategories);

//get category by id || GET
router.get('/:id', getCategoryById);

//update category || PATCH
router.patch('/:id', authenticate, adminOnly, updateCategory);

//delete category || DELETE
router.delete('/:id',authenticate, adminOnly, deleteCategory);

export default router;