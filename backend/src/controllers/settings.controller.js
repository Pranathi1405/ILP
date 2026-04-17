// Author: Sathvik Goli
// Settings Controller - Handles user profile-related operations (update profile, password, child linking, etc.)

import * as settingsService from '../services/settings.service.js';

/**
 * Update user profile details
 * - Extracts userId from authenticated request (req.user)
 * - Passes merged data to service layer
 */
export const updateProfile = async (req, res) => {
    try {
        const data = req.body;

        // Get logged-in user ID from middleware (JWT/session)
        const userId = req.user.id;

        // Attach userId to payload for service layer
        data.userId = userId;

        console.log("Data from controller ", data);

        // Call service to update profile
        const result = await settingsService.updateProfile(data);

        return res.status(200).json({
            success: true,
            message: "Profile Updated successfully",
            data: result
        });
    } catch (error) {
        // Handle validation or service-level errors
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Change user password
 * - Requires old/new password (handled in service)
 * - userId is injected from authenticated request
 */
export const changePassword = async (req, res) => {
    try {
        const data = req.body;

        const userId = req.user.id;

        // Attach userId for password update logic
        data.userId = userId;

        console.log("data from controller", data);

        // Service handles password validation & hashing
        const result = await settingsService.changePassword(data);

        console.log(result);

        return res.status(200).json({
            success: true,
            message: "Password Updated Successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Link a new child account to parent
 * - Parent userId comes from auth middleware
 * - Child details come from request body
 */
export const addNewChild = async (req, res) => {
    try {
        const data = req.body;

        const userId = req.user.id;

        // Attach parent userId to payload
        data.userId = userId;

        console.log("Data from controller is : ", data);

        // Service handles child creation/linking logic
        const result = await settingsService.addNewChild(data);

        return res.status(200).json({
            success: true,
            message: "New Child Linked Successfully",
            data: result
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Fetch current user's profile
 * - Uses userId from authentication middleware
 */
export const myProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user profile data from service
        const rows = await settingsService.myProfile(userId);

        return res.status(200).json(rows);
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
};