// Settings Service Layer
// Handles business logic related to user profile, password, and parent-child linking

import * as settingsModel from '../models/settings.model.js';
import pool from '../config/database.config.js';
import bcrypt from 'bcryptjs';

/**
 * Update user profile
 * - Updates first name, last name, and phone
 * - userId is injected from controller (trusted source)
 */
export const updateProfile = async (data) => {
    const { first_name, last_name, phone, userId } = data;

    // Execute update query
    await pool.query(
        settingsModel.UPDATE_MY_PROFILE,
        [first_name, last_name, phone, userId]
    );

    return true;
};

/**
 * Change user password
 * Flow:
 * 1. Check old vs new password (prevent reuse)
 * 2. Validate old password from DB
 * 3. Hash new password
 * 4. Update in DB
 */
export const changePassword = async (data) => {
    const { oldpassword, newpassword, userId } = data;

    // Prevent same password reuse
    if (oldpassword === newpassword) {
        throw new Error("Old and New Password cannot be same");
    }

    // Fetch current password hash
    const [res] = await pool.query(
        settingsModel.CHECK_CURRENT_PASSWORD,
        [userId]
    );

    // Compare old password with stored hash
    const isMatch = await bcrypt.compare(oldpassword, res[0].password_hash);

    if (!isMatch) {
        throw new Error('Old password does not match');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newpassword, salt);

    // Update password in DB
    await pool.query(
        settingsModel.CHANGE_PASSWORD,
        [password_hash, userId]
    );

    return true;
};

/**
 * Link a new child to parent account
 * Flow:
 * 1. Validate student link code
 * 2. Get parent ID from userId
 * 3. Insert parent-student relationship
 */
export const addNewChild = async (data) => {
    const { relationship_type, parent_link_code, userId } = data;

    // Validate student link code
    const [res1] = await pool.query(
        settingsModel.GET_STUDENTID_BY_LINKCODE,
        [parent_link_code]
    );

    if (res1.length === 0) {
        throw new Error("No student exists with that code");
    }

    const studentId = res1[0].student_id;

    // Get parentId from userId
    const [res] = await pool.query(
        settingsModel.GET_PARENTID,
        [userId]
    );

    const parentId = res[0].parent_id;

    // Create relationship entry
    const [result] = await pool.query(
        settingsModel.ADD_NEW_CHILD,
        [parentId, studentId, relationship_type]
    );

    return result.insertId;
};

/**
 * Fetch current user's profile
 */
export const myProfile = async (userId) => {

    const [rows] = await pool.query(
        settingsModel.GET_MY_PROFILE,
        [userId]
    );

    return rows[0];
};