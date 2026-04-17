/**
 * Authors: Harshitha Ravuri
 * WebSocket Notification Handler
 * ==============================
 *
 * PURPOSE:
 * --------
 * Manages real-time notification delivery using Socket.IO.
 *
 * HOW IT WORKS:
 * -------------
 * 1. On connection → user joins:
 *    - Personal room → user_<userId>
 *    - Role room     → role_<role>
 *
 * 2. Notifications are emitted to user rooms:
 *    io.to("user_42").emit(...)
 *
 * 3. Frontend receives full payload → no API refetch needed
 *
 * IMPORTANT:
 * ----------
 * - Authentication is handled via socketAuth.middleware.js
 * - socket.user is trusted (derived from JWT, NOT frontend)
 * - WebSocket delivery is NOT critical path (DB is source of truth)
 */

let io = null; // Holds Socket.IO instance

// ─────────────────────────────────────────────────────────────────────────────
// SET SOCKET INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

export const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
  console.log('✅ Socket.IO instance registered in notification handler');
};

// ─────────────────────────────────────────────────────────────────────────────
// EMIT SINGLE USER NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const emitNotification = (userId, notification) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized. Skipping delivery for user:', userId);
    return;
  }

  const roomName = `user_${userId}`;

  io.to(roomName).emit('new_notification', notification);
};

// ─────────────────────────────────────────────────────────────────────────────
// EMIT MULTIPLE USERS
// ─────────────────────────────────────────────────────────────────────────────

export const emitNotificationToMany = (userIds, notificationData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized. Skipping bulk delivery.');
    return;
  }

  userIds.forEach((userId) => {
    const roomName = `user_${userId}`;

    io.to(roomName).emit('new_notification', {
      ...notificationData,
      user_id: userId, // personalize payload
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET CONNECTION HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const registerSocketHandlers = (io) => {

  io.on("connection", (socket) => {
    try {
      // ── 1. AUTHENTICATED USER ────────────────────────────────────────────
      const { id: userId, role } = socket.user;

      console.log(`User connected → ID: ${userId}, Role: ${role}`);

      // ── 2. JOIN PERSONAL ROOM ────────────────────────────────────────────
      const userRoom = `user_${userId}`;
      socket.join(userRoom);

      console.log(`User ${userId} joined room: ${userRoom}`);

      // ── 3. JOIN ROLE ROOM (OPTIONAL) ─────────────────────────────────────
      const roleRoom = `role_${role}`;
      socket.join(roleRoom);

      // ── 4. TOKEN EXPIRY HANDLING ─────────────────────────────────────────
      /**
       * WHY:
       * ----
       * JWT expiry does NOT auto-disconnect sockets.
       *
       * WHAT:
       * -----
       * - After token TTL → force disconnect
       * - Client must refresh token & reconnect
       *
       * NOTE:
       * -----
       * Keep this in sync with JWT expiry time
       */
      const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

      const expiryTimer = setTimeout(() => {
        console.log(`Token expired → User ${userId}. Disconnecting.`);

        socket.emit("auth:error", "Token expired");
        socket.disconnect();

      }, TOKEN_TTL_MS);

      // ── 5. CLIENT EVENTS ─────────────────────────────────────────────────

      socket.on("notification:ack", (data) => {
        console.log(`Notification acknowledged by User ${userId}`, data);
      });

      socket.on("notification:markRead", async (notificationId) => {
        console.log(`User ${userId} marked notification ${notificationId} as read`);

        // Optional DB update
        // await markNotificationAsRead(notificationId, userId);
      });

      socket.on("join:room", (roomName) => {
        socket.join(roomName);
        console.log(`User ${userId} joined custom room: ${roomName}`);
      });

      socket.on("leave:room", (roomName) => {
        socket.leave(roomName);
        console.log(`User ${userId} left room: ${roomName}`);
      });

      // ── 6. DISCONNECT HANDLER ────────────────────────────────────────────
      /**
       * Single unified disconnect handler:
       * - Clears expiry timer (prevents memory leaks)
       * - Logs disconnect reason
       */
      socket.on("disconnect", (reason) => {
        clearTimeout(expiryTimer);

        console.log(`User disconnected → ID: ${userId}, Reason: ${reason}`);
      });

    } catch (error) {
      console.error("Socket handler error:", error.message);
      socket.disconnect();
    }
  });
};