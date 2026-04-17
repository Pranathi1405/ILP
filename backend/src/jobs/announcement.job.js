/**
 * AUTHORS: Harshitha Ravuri,
 * src/jobs/announcement.job.js
 * ==============================
 * Background job functions for the announcement module.
 *
 * This file contains the LOGIC for two jobs:
 *   1. broadcastScheduledAnnouncements() — sends announcements whose time has come
 *   2. expireOldAnnouncements()          — deactivates announcements past their end_date
 *
 * These are called by scheduler.js on a timer.
 * They are NOT called directly by any HTTP request.
 *
 * Beginner note:
 *   A "job" is just a regular async function that runs on a schedule.
 *   We use setInterval() in scheduler.js to call these periodically.
 */

import * as AnnouncementModel from '../models/announcement.model.js';
import { sendToUsers } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { ANNOUNCEMENT_STATUS } from '../constants/announcementConstants.js';

// ─────────────────────────────────────────────────────────────────────────────
// JOB 1: Broadcast Scheduled Announcements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all announcements with status = 'scheduled' and start_date <= NOW().
 * For each one:
 *   1. Resolve target users
 *   2. Create notifications via sendToUsers()
 *   3. Update announcement status to 'broadcasted'
 *
 * This runs every minute via the scheduler.
 */
export const broadcastScheduledAnnouncements = async () => {
  // Step 1: Find all scheduled announcements that are ready to go
  const readyAnnouncements = await AnnouncementModel.findScheduledReadyToBroadcast();

  if (readyAnnouncements.length === 0) {
    // Nothing to do this minute
    return;
  }

  console.log(`[Job] Found ${readyAnnouncements.length} scheduled announcement(s) to broadcast`);

  // Step 2: Process each announcement one at a time
  for (const announcement of readyAnnouncements) {
    try {
      // Resolve which user_ids should receive this announcement
      const userIds = await AnnouncementModel.resolveTargetUserIds(
        announcement.target_audience,
        announcement.course_id
      );

      if (userIds.length === 0) {
        console.warn(`[Job] Announcement #${announcement.announcement_id} has no target users. Skipping.`);
        // Still mark as broadcasted so it's not retried
        await AnnouncementModel.updateAnnouncementStatus(
          announcement.announcement_id,
          ANNOUNCEMENT_STATUS.BROADCASTED
        );
        continue;
      }

      // Send notifications to all resolved users
      // sendToUsers handles batch insert + WebSocket + push
      const stats = await sendToUsers(userIds, {
        title:             announcement.title,
        message:           announcement.content,
        notification_type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        related_id:        announcement.announcement_id,
        related_type:      'announcement',
      });

      // Mark the announcement as broadcasted so the job doesn't retry it
      await AnnouncementModel.updateAnnouncementStatus(
        announcement.announcement_id,
        ANNOUNCEMENT_STATUS.BROADCASTED
      );

      console.log(
        `[Job] Announcement #${announcement.announcement_id} broadcasted. ` +
        `Users: ${stats.total}, In-app: ${stats.in_app_sent}, Push: ${stats.push_sent}`
      );

    } catch (error) {
      // Log the error but continue to the next announcement
      // We don't want one failure to stop all others from being processed
      console.error(
        `[Job] Failed to broadcast announcement #${announcement.announcement_id}:`,
        error.message
      );
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// JOB 2: Expire Old Announcements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all announcements whose end_date has passed.
 * Set them to is_active = FALSE and status = 'deactivated'.
 *
 * This prevents expired announcements from showing up in user feeds.
 */
export const expireOldAnnouncements = async () => {
  // Find all announcements where end_date < NOW() and still active
  const expiredRows = await AnnouncementModel.findExpiredAnnouncements();

  if (expiredRows.length === 0) {
    return; // Nothing expired this minute
  }

  // Extract just the IDs for bulk update
  const expiredIds = expiredRows.map((row) => row.announcement_id);

  // Bulk deactivate all expired announcements in one query
  await AnnouncementModel.bulkDeactivateAnnouncements(expiredIds);

  console.log(`[Job] Expired and deactivated ${expiredIds.length} announcement(s): [${expiredIds.join(', ')}]`);
};