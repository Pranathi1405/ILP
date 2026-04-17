//Author : Sathvik Goli
// Setting Routes - For changing/modifying users information
import {
    updateProfile,
    changePassword,
    addNewChild,
    myProfile
} from '../controllers/settings.controller.js';
import { authorize, authenticate } from '../middleware/auth.middleware.js';
import express from 'express';

const router = express.Router();

router.post('/updateprofile', authenticate, updateProfile);
router.post('/changepassword', authenticate, changePassword);
router.post('/addnewchild', authenticate, addNewChild);
router.get('/me',authenticate,myProfile);

export default router;