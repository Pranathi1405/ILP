/**
 * AUTHORS: Harshitha Ravuri
 * socketAuth.middleware.js – Socket.IO Authentication Middleware
 * ================================================================
 *
 * PURPOSE:
 * --------
 * Authenticates users connecting via WebSocket (Socket.IO)
 * using JWT stored in HttpOnly cookies.
 *
 * IMPORTANT:
 * ----------
 * - Socket.IO does NOT support Express middleware (req, res).
 * - Cookies are NOT automatically parsed like in Express.
 * - We must manually extract cookies from:
 *   socket.handshake.headers.cookie
 *
 * AUTH FLOW:
 * ----------
 * 1. Client connects → browser automatically sends cookies
 * 2. Middleware extracts cookies from handshake headers
 * 3. Parse cookies → extract accessToken
 * 4. Verify JWT using JWT_SECRET
 * 5. Attach decoded user to socket.user
 * 6. Allow or reject connection
 *
 * FRONTEND REQUIREMENT:
 * ---------------------
 * const socket = io(BACKEND_URL, {
 *   withCredentials: true // REQUIRED for cookies
 * });
 */

import jwt from "jsonwebtoken";
import cookie from "cookie";

// ── SOCKET AUTHENTICATION MIDDLEWARE ─────────────────────────────────────────

export const authenticateSocket = (socket, next) => {
  try {

    /**
     * STEP 1: Extract raw cookies from handshake headers
     * ---------------------------------------------------
     * Example header:
     * "accessToken=abc123; refreshToken=xyz456"
     */
    const rawCookies = socket.handshake.headers.cookie;

    if (!rawCookies) {
      return next(new Error("Authentication error: No cookies found"));
    }

    /**
     * STEP 2: Parse cookies into key-value object
     * --------------------------------------------
     * Result:
     * { accessToken: "...", refreshToken: "..." }
     */
    const parsedCookies = cookie.parse(rawCookies);

    const token = parsedCookies.accessToken; // 👈 MUST match cookie name

    if (!token) {
      return next(new Error("Authentication error: Access token missing"));
    }

    /**
     * STEP 3: Verify JWT
     * -------------------
     * Validates:
     * - Signature
     * - Expiry
     * - Integrity
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * STEP 4: Attach user info to socket
     * -----------------------------------
     * Makes user available in:
     * socket.user inside all event handlers
     */
    socket.user = {
      id: decoded.id,
      role: decoded.role,
    };

    console.log(`✅ Socket authenticated: User ${decoded.id} (${decoded.role})`);

    /**
     * STEP 5: Allow connection
     */
    next();

  } catch (error) {

    /**
     * FAILURE CASES:
     * --------------
     * - Token expired
     * - Invalid signature
     * - Malformed token
     */
    console.error("❌ Socket authentication failed:", error.message);

    next(new Error("Authentication error: Invalid or expired token"));
  }
};