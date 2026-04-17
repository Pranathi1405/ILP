/**
 * AUTHORS: Harshitha Ravuri,
 * src/jobs/teacherNotification.job.js
 * ======================================
 * Background job for sending scheduled teacher notifications.
 *
 * When a teacher schedules a notification with a future scheduled_at datetime,
 * it is stored in the notifications table with status = 'pending'.
 * This job finds those rows and sends them when the time arrives.
 */

import * as NotificationModel from '../models/notification.model.js';
import { emitNotificationToMany } from '../websockets/handlers/notification.handler.js';

/**
 * Find all pending notifications whose scheduled_at <= NOW().
 * Emit them via WebSocket and mark them as sent.
 *
 * Called by the scheduler every minute.
 */
export const sendPendingTeacherNotifications = async () => {
  // Find notifications that are pending and their time has come
  const pendingNotifications = await NotificationModel.findPendingScheduledNotifications();

  if (pendingNotifications.length === 0) {
    return; // Nothing to send this minute
  }

  console.log(`[Job] Found ${pendingNotifications.length} pending teacher notification(s) to send`);

  // Group by user_id so we can emit per-user WebSocket events
  // { userId: [notification, notification, ...] }
  const byUser = {};
  for (const notif of pendingNotifications) {
    if (!byUser[notif.user_id]) {
      byUser[notif.user_id] = [];
    }
    byUser[notif.user_id].push(notif);
  }

  // Emit WebSocket event for each user
  const allUserIds = Object.keys(byUser).map(Number);

  // We emit the most recent pending notification per user
  // (In practice, there's usually just one per user per scheduled batch)
  for (const userId of allUserIds) {
    const userNotifications = byUser[userId];

    for (const notif of userNotifications) {
      emitNotificationToMany([userId], {
        notification_id:   notif.notification_id,
        title:             notif.title,
        message:           notif.message,
        notification_type: notif.notification_type,
        related_id:        notif.related_id,
        related_type:      notif.related_type,
        is_read:           false,
        created_at:        notif.created_at,
      });
    }
  }

  // Mark all of them as sent in one DB query
  const notificationIds = pendingNotifications.map((n) => n.notification_id);
  await NotificationModel.markNotificationsAsSent(notificationIds);

  console.log(`[Job] Sent ${notificationIds.length} scheduled teacher notification(s)`);
};