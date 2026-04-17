/**
 *  AUTHORS: Harshitha Ravuri,
 * Notification Preferences Model
 * ================================
 * Database queries for the `notification_preferences` table.
 *
 * If no preference row exists for a user+type combination,
 * the default behaviour (handled in service layer) is:
 *   in_app_enabled = TRUE
 *   push_enabled   = TRUE
 */

import pool from '../config/database.config.js';

/**
 * Get all notification preferences for a user.
 * Returns one row per notification type that the user has customized.
 *
 * @param {number} userId
 * @returns {Array} List of preference rows
 */
export const findPreferencesByUser = async (userId) => {
  const sql = `
    SELECT
      preference_id,
      notification_type,
      in_app_enabled,
      push_enabled,
      email_enabled,
      sms_enabled,
      updated_at
    FROM notification_preferences
    WHERE user_id = ?
    ORDER BY notification_type ASC
  `;
  const [rows] = await pool.query(sql, [userId]);
    return rows.map((row) => ({
    ...row,
    in_app_enabled: Boolean(row.in_app_enabled),
    push_enabled: Boolean(row.push_enabled),
    email_enabled: Boolean(row.email_enabled),
    sms_enabled: Boolean(row.sms_enabled),
  }));
};

/**
 * Get preference for a specific user + notification type.
 *
 * @param {number} userId
 * @param {string} notificationType - e.g. 'payment', 'live_class'
 * @returns {Object|null} The preference row or null if not set (use defaults)
 */
export const findPreferenceByUserAndType = async (userId, notificationType) => {
  const sql = `
    SELECT * FROM notification_preferences
    WHERE user_id = ? AND notification_type = ?
  `;
  const [rows] = await pool.query(sql, [userId, notificationType]);

  if (!rows[0]) return null;

  const row = rows[0];

  return {
    ...row,
    in_app_enabled: Boolean(row.in_app_enabled),
    push_enabled: Boolean(row.push_enabled),
    email_enabled: Boolean(row.email_enabled),
    sms_enabled: Boolean(row.sms_enabled),
  };
};

/**
 * Upsert (Insert or Update) notification preferences for a user.
 * Uses MySQL's ON DUPLICATE KEY UPDATE to handle both insert and update in one query.
 *
 * @param {number} userId
 * @param {string} notificationType
 * @param {Object} prefs - Preference flags to set
 * @param {boolean} prefs.in_app_enabled
 * @param {boolean} prefs.push_enabled
 * @returns {Object} MySQL result
 */
export const upsertPreference = async (userId, notificationType, prefs) => {
  const sql = `
    INSERT INTO notification_preferences
      (user_id, notification_type, in_app_enabled, push_enabled, email_enabled, sms_enabled)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      in_app_enabled = VALUES(in_app_enabled),
      push_enabled   = VALUES(push_enabled),
      email_enabled  = VALUES(email_enabled),
      sms_enabled    = VALUES(sms_enabled),
      updated_at     = NOW()
  `;

  const params = [
    userId,
    notificationType,
    prefs.in_app_enabled !== undefined ? prefs.in_app_enabled : true,
    prefs.push_enabled !== undefined ? prefs.push_enabled : true,
    prefs.email_enabled !== undefined ? prefs.email_enabled : true,
    prefs.sms_enabled !== undefined ? prefs.sms_enabled : false,
  ];

  const [result] = await pool.query(sql, params);
  return result;
};

/**
 * Bulk upsert preferences — used when PUT /preferences sends all types at once.
 *
 * @param {number} userId
 * @param {Array} prefsArray - Array of { notification_type, in_app_enabled, push_enabled }
 */
export const upsertPreferencesBulk = async (userId, prefsArray) => {
  // Run all upserts in parallel for speed
  const promises = prefsArray.map((pref) =>
    upsertPreference(userId, pref.notification_type, pref)
  );
  return Promise.all(promises);
};

/**
 * Disable ALL notifications for a user.
 * Sets both in_app_enabled and push_enabled to FALSE for every existing type.
 * Also inserts rows for types that don't have preferences yet.
 *
 * Strategy: We use a transaction to update existing rows,
 * then let the service handle the response.
 *
 * @param {number} userId
 * @param {Array<string>} allTypes - Array of all valid notification types
 * @returns {Object} MySQL result
 */
export const disableAllPreferences = async (userId, allTypes) => {
  // Upsert "disabled" preference for every notification type
  const promises = allTypes.map((type) =>
    upsertPreference(userId, type, {
      in_app_enabled: false,
      push_enabled: false,
      email_enabled: false,
      sms_enabled: false,
    })
  );
  return Promise.all(promises);
};
