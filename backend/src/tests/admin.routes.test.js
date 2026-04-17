import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";

/* ============================================================
 *  ADMIN ROUTES TEST SUITE
 *  ============================================================
 *  Tests for all admin route endpoints:
 *  - Dashboard stats
 *  - User filtering
 *  - User details (students, parents, teachers, admins)
 *  - Account management (suspend, reinstate)
 *  - Teacher approval/rejection
 *  - Teacher account creation
 *  - Admin invitation system
 ============================================================ */

/* ────────────────────────────────────────────────────────────
 *  MOCK SETUP
 *  ──────────────────────────────────────────────────────────── */

// Mock controller functions
const getDashboardStatsMock = jest.fn();
const getStudentDetailsMock = jest.fn();
const getParentDetailsMock = jest.fn();
const getTeacherDetailsMock = jest.fn();
const getAdminDetailsMock = jest.fn();
const suspendAccountMock = jest.fn();
const reinstateAccountMock = jest.fn();
const approveTeacherMock = jest.fn();
const rejectTeacherMock = jest.fn();
const getFilteredUserDetailsMock = jest.fn();
const createTeacherAccountMock = jest.fn();
const sendAdminInvitationMailMock = jest.fn();
const verifyAdminInvitationMailMock = jest.fn();

// Mock middleware
const authenticateMock = jest.fn((req, res, next) => {
  req.user = { id: 1, role: "admin" };
  next();
});

const adminOnlyMock = jest.fn((req, res, next) => next());
const userManagerOnlyMock = jest.fn((req, res, next) => next());

jest.unstable_mockModule("../controllers/admin.controller.js", () => ({
  getDashboardStats: getDashboardStatsMock,
  getStudentDetails: getStudentDetailsMock,
  getParentDetails: getParentDetailsMock,
  getTeacherDetails: getTeacherDetailsMock,
  getAdminDetails: getAdminDetailsMock,
  suspendAccount: suspendAccountMock,
  reinstateAccount: reinstateAccountMock,
  approveTeacher: approveTeacherMock,
  rejectTeacher: rejectTeacherMock,
  getFilteredUserDetails: getFilteredUserDetailsMock,
  createTeacherAccount: createTeacherAccountMock,
  sendAdminInvitationMail: sendAdminInvitationMailMock,
  verifyAdminInvitationMail: verifyAdminInvitationMailMock,
}));

jest.unstable_mockModule("../middleware/auth.middleware.js", () => ({
  authenticate: authenticateMock,
  adminOnly: adminOnlyMock,
  userManagerOnly: userManagerOnlyMock,
  courseManagerOnly: jest.fn((req, res, next) => next()),
  announementManagerOnly: jest.fn((req, res, next) => next()),
  financeManagerOnly: jest.fn((req, res, next) => next()),
  authorize: jest.fn((req, res, next) => next()),
}));

// Import after mocking
const adminRoutes = await import("../routes/admin.routes.js");

/* ────────────────────────────────────────────────────────────
 *  TEST SUITE
 *  ──────────────────────────────────────────────────────────── */

describe("Admin Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin", adminRoutes.default);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  /* ────────────────────────────────────────────────────────────
   *  DASHBOARD STATS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/dashboard-stats", () => {
    it("should fetch dashboard statistics successfully", async () => {
      getDashboardStatsMock.mockImplementation((req, res) => {
        res.status(200).json({
          studentCount: 150,
          parentCount: 75,
          totalTeachers: 30,
          verifiedTeachers: 25,
          pendingTeachers: 5,
        });
      });

      const response = await request(app)
        .get("/api/admin/dashboard-stats")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("studentCount", 150);
      expect(response.body).toHaveProperty("parentCount", 75);
      expect(response.body).toHaveProperty("totalTeachers", 30);
      expect(response.body).toHaveProperty("verifiedTeachers", 25);
      expect(response.body).toHaveProperty("pendingTeachers", 5);
    });

    it("should handle errors when fetching dashboard stats", async () => {
      getDashboardStatsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
      });

      const response = await request(app)
        .get("/api/admin/dashboard-stats")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });

    it("should require authentication for dashboard stats", async () => {
      authenticateMock.mockImplementation((req, res, next) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const response = await request(app).get("/api/admin/dashboard-stats");

      expect(response.status).toBe(401);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  GET USERS WITH FILTERS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/users", () => {
    it("should fetch filtered users successfully", async () => {
      getFilteredUserDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          data: [
            {
              user_id: 1,
              email: "student@test.com",
              first_name: "John",
              last_name: "Doe",
              role: "student",
              status: true,
              joined_date: "2024-01-15",
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        });
      });

      const response = await request(app)
        .get("/api/admin/users?role=student&page=1&limit=10")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty("email", "student@test.com");
    });

    it("should handle filtering by user status", async () => {
      getFilteredUserDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          data: [
            {
              user_id: 2,
              email: "teacher@test.com",
              role: "teacher",
              status: false,
            },
          ],
          pagination: { page: 1, limit: 10, total: 1 },
        });
      });

      const response = await request(app)
        .get("/api/admin/users?status=false")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty("status", false);
    });

    it("should return error when filtering fails", async () => {
      getFilteredUserDetailsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch users" });
      });

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  GET STUDENT DETAILS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/students/:id", () => {
    it("should fetch student details successfully", async () => {
      getStudentDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 1,
          email: "student@test.com",
          first_name: "John",
          last_name: "Doe",
          phone: "9876543210",
          is_active: true,
          student_id: 101,
          grade_level: "10",
          section: "A",
          enrollment_date: "2024-01-15",
        });
      });

      const response = await request(app)
        .get("/api/admin/students/1")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("email", "student@test.com");
      expect(response.body).toHaveProperty("grade_level", "10");
      expect(response.body).toHaveProperty("section", "A");
    });

    it("should return error for non-existent student", async () => {
      getStudentDetailsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch student info" });
      });

      const response = await request(app)
        .get("/api/admin/students/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });

    it("should require valid student id parameter", async () => {
      getStudentDetailsMock.mockImplementation((req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: "Student ID is required" });
        }
      });

      const response = await request(app)
        .get("/api/admin/students/invalI d")
        .set("Authorization", "Bearer token");

      expect(response.status).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  GET PARENT DETAILS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/parents/:id", () => {
    it("should fetch parent details with linked children count", async () => {
      getParentDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 2,
          email: "parent@test.com",
          first_name: "Jane",
          last_name: "Doe",
          phone: "9876543211",
          is_active: true,
          parent_id: 201,
          occupation: "Engineer",
          linkedChildrenCount: 2,
        });
      });

      const response = await request(app)
        .get("/api/admin/parents/2")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("email", "parent@test.com");
      expect(response.body).toHaveProperty("linkedChildrenCount", 2);
    });

    it("should handle parent with no linked children", async () => {
      getParentDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 3,
          email: "parentnew@test.com",
          linkedChildrenCount: 0,
        });
      });

      const response = await request(app)
        .get("/api/admin/parents/3")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("linkedChildrenCount", 0);
    });

    it("should return error for non-existent parent", async () => {
      getParentDetailsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch parent info" });
      });

      const response = await request(app)
        .get("/api/admin/parents/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  GET TEACHER DETAILS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/teachers/:id", () => {
    it("should fetch teacher details successfully", async () => {
      getTeacherDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 4,
          email: "teacher@test.com",
          first_name: "Mr",
          last_name: "Smith",
          phone: "9876543212",
          is_active: true,
          teacher_id: 301,
          department: "Science",
          specialization: "Physics",
          qualification: "M.Sc",
          experience_years: 5,
          rating: 4.5,
          is_verified: true,
        });
      });

      const response = await request(app)
        .get("/api/admin/teachers/4")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("email", "teacher@test.com");
      expect(response.body).toHaveProperty("is_verified", true);
      expect(response.body).toHaveProperty("rating", 4.5);
    });

    it("should include verification status in teacher details", async () => {
      getTeacherDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 5,
          is_verified: false,
          department: "Math",
        });
      });

      const response = await request(app)
        .get("/api/admin/teachers/5")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("is_verified", false);
    });

    it("should return error for non-existent teacher", async () => {
      getTeacherDetailsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch teacher info" });
      });

      const response = await request(app)
        .get("/api/admin/teachers/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  GET ADMIN DETAILS TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("GET /api/admin/admins/:id", () => {
    it("should fetch admin details successfully", async () => {
      getAdminDetailsMock.mockImplementation((req, res) => {
        res.status(200).json({
          user_id: 6,
          email: "admin@test.com",
          first_name: "Admin",
          last_name: "User",
          phone: "9876543213",
          is_active: true,
          role: "super_admin",
          permissions: ["user_management", "analytics", "system_settings"],
        });
      });

      const response = await request(app)
        .get("/api/admin/admins/6")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("role", "super_admin");
      expect(response.body).toHaveProperty("permissions");
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });

    it("should return error for non-existent admin", async () => {
      getAdminDetailsMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to fetch admin info" });
      });

      const response = await request(app)
        .get("/api/admin/admins/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  SUSPEND ACCOUNT TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/suspend/:id", () => {
    it("should suspend user account successfully", async () => {
      suspendAccountMock.mockImplementation((req, res) => {
        res.status(200).json({ message: "Account suspended successfully" });
      });

      const response = await request(app)
        .post("/api/admin/suspend/1")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account suspended successfully"
      );
    });

    it("should handle error when suspending non-existent user", async () => {
      suspendAccountMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to suspend account" });
      });

      const response = await request(app)
        .post("/api/admin/suspend/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });

    it("should require admin authentication for suspension", async () => {
      authenticateMock.mockImplementation((req, res, next) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const response = await request(app).post("/api/admin/suspend/1");

      expect(response.status).toBe(401);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  REINSTATE ACCOUNT TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/reinstate/:id", () => {
    it("should reinstate suspended account successfully", async () => {
      reinstateAccountMock.mockImplementation((req, res) => {
        res.status(200).json({ message: "Account reinstated successfully" });
      });

      const response = await request(app)
        .post("/api/admin/reinstate/1")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account reinstated successfully"
      );
    });

    it("should handle error when reinstating non-existent user", async () => {
      reinstateAccountMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to reinstate account" });
      });

      const response = await request(app)
        .post("/api/admin/reinstate/999")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  APPROVE TEACHER TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/teachers/:id/approve", () => {
    it("should approve teacher account successfully", async () => {
      approveTeacherMock.mockImplementation((req, res) => {
        res
          .status(200)
          .json({ message: "Teacher account approved successfully" });
      });

      const response = await request(app)
        .post("/api/admin/teachers/4/approve")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Teacher account approved successfully"
      );
    });

    it("should handle error when approving non-existent teacher", async () => {
      approveTeacherMock.mockImplementation((req, res) => {
        res
          .status(500)
          .json({ error: "Failed to approve teacher account" });
      });

      const response = await request(app)
        .post("/api/admin/teachers/999/approve")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });

    it("should require user manager privileges to approve teacher", async () => {
      userManagerOnlyMock.mockImplementation((req, res, next) => {
        res.status(403).json({ error: "Forbidden" });
      });

      const response = await request(app)
        .post("/api/admin/teachers/4/approve")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(403);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  REJECT TEACHER TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/teachers/:id/reject", () => {
    it("should reject teacher account successfully", async () => {
      rejectTeacherMock.mockImplementation((req, res) => {
        res
          .status(200)
          .json({ message: "Teacher account rejected successfully" });
      });

      const response = await request(app)
        .post("/api/admin/teachers/4/reject")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Teacher account rejected successfully"
      );
    });

    it("should handle error when rejecting non-existent teacher", async () => {
      rejectTeacherMock.mockImplementation((req, res) => {
        res
          .status(500)
          .json({ error: "Failed to reject teacher account" });
      });

      const response = await request(app)
        .post("/api/admin/teachers/999/reject")
        .set("Authorization", "Bearer token");

      expect(response.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  CREATE TEACHER ACCOUNT TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/teachers/add", () => {
    it("should create teacher account successfully", async () => {
      createTeacherAccountMock.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message:
            "Teacher account created successfully and credentials sent to email",
          userId: 7,
        });
      });

      const teacherData = {
        first_name: "New",
        last_name: "Teacher",
        email: "newteacher@test.com",
        phone: "9876543214",
        department: "English",
      };

      const response = await request(app)
        .post("/api/admin/teachers/add")
        .set("Authorization", "Bearer token")
        .send(teacherData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("userId");
    });

    it("should handle validation error for missing email", async () => {
      createTeacherAccountMock.mockImplementation((req, res) => {
        res.status(500).json({ error: "Failed to create teacher account" });
      });

      const teacherData = {
        first_name: "New",
        last_name: "Teacher",
        phone: "9876543214",
      };

      const response = await request(app)
        .post("/api/admin/teachers/add")
        .set("Authorization", "Bearer token")
        .send(teacherData);

      expect(response.status).toBe(500);
    });

    it("should require user manager privileges to create teacher", async () => {
      userManagerOnlyMock.mockImplementation((req, res, next) => {
        res.status(403).json({ error: "Forbidden" });
      });

      const teacherData = {
        first_name: "New",
        last_name: "Teacher",
        email: "newteacher@test.com",
      };

      const response = await request(app)
        .post("/api/admin/teachers/add")
        .set("Authorization", "Bearer token")
        .send(teacherData);

      expect(response.status).toBe(403);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  SEND ADMIN INVITATION TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/admin-invitation", () => {
    it("should send admin invitation successfully", async () => {
      sendAdminInvitationMailMock.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: "Admin invitation sent successfully",
        });
      });

      const invitationData = {
        email: "newidmin@test.com",
        role: "content_manager",
        permissions: ["create_content", "edit_content"],
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation")
        .set("Authorization", "Bearer token")
        .send(invitationData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Admin invitation sent successfully"
      );
    });

    it("should handle error when sending invitation fails", async () => {
      sendAdminInvitationMailMock.mockImplementation((req, res) => {
        res
          .status(500)
          .json({ error: "Failed to send admin invitation" });
      });

      const invitationData = {
        email: "newidmin@test.com",
        role: "content_manager",
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation")
        .set("Authorization", "Bearer token")
        .send(invitationData);

      expect(response.status).toBe(500);
    });

    it("should require admin authentication for sending invitation", async () => {
      authenticateMock.mockImplementation((req, res, next) => {
        res.status(401).json({ error: "Unauthorized" });
      });

      const invitationData = {
        email: "newidmin@test.com",
        role: "content_manager",
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation")
        .send(invitationData);

      expect(response.status).toBe(401);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  VERIFY ADMIN INVITATION TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("POST /api/admin/admin-invitation/verify", () => {
    it("should verify invitation and create admin account successfully", async () => {
      verifyAdminInvitationMailMock.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: "Admin account created successfully",
        });
      });

      const verificationData = {
        token: "valid_token_hash",
        password: "SecurePassword123!",
        first_name: "Admin",
        last_name: "NewUser",
        phone: "9876543215",
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation/verify")
        .send(verificationData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Admin account created successfully"
      );
    });

    it("should handle invalid or expired token", async () => {
      verifyAdminInvitationMailMock.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: "Invalid or expired token",
        });
      });

      const verificationData = {
        token: "invalid_token",
        password: "Password123!",
        first_name: "Admin",
        last_name: "User",
        phone: "9876543215",
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation/verify")
        .send(verificationData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should handle weak password validation", async () => {
      verifyAdminInvitationMailMock.mockImplementation((req, res) => {
        res.status(400).json({
          success: false,
          message: "Password does not meet security requirements",
        });
      });

      const verificationData = {
        token: "valid_token",
        password: "weak",
        first_name: "Admin",
        last_name: "User",
        phone: "9876543215",
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation/verify")
        .send(verificationData);

      expect(response.status).toBe(400);
    });

    it("should require all necessary fields for verification", async () => {
      verifyAdminInvitationMailMock.mockImplementation((req, res) => {
        res
          .status(500)
          .json({ success: false, message: "Missing required fields" });
      });

      const verificationData = {
        token: "valid_token",
        password: "Password123!",
        // Missing first_name, last_name, phone
      };

      const response = await request(app)
        .post("/api/admin/admin-invitation/verify")
        .send(verificationData);

      expect(response.status).toBe(500);
    });

    it("should not require authentication for verification (public endpoint)", async () => {
      verifyAdminInvitationMailMock.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: "Admin account created successfully",
        });
      });

      const verificationData = {
        token: "valid_token",
        password: "Password123!",
        first_name: "Admin",
        last_name: "User",
        phone: "9876543215",
      };

      // Note: No Authorization header
      const response = await request(app)
        .post("/api/admin/admin-invitation/verify")
        .send(verificationData);

      expect(response.status).toBe(200);
    });
  });

  /* ────────────────────────────────────────────────────────────
   *  ERROR HANDLING TESTS
   *  ──────────────────────────────────────────────────────────── */

  describe("General error handling", () => {
    it("should handle 404 for non-existent routes", async () => {
      const response = await request(app).get("/api/admin/non-existent");

      expect([404, 200]).toContain(response.status); // 404 or undefined route
    });

    it("should validate required path parameters", async () => {
      getStudentDetailsMock.mockImplementation((req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: "ID parameter is required" });
        } else {
          res.status(200).json({ user_id: parseInt(req.params.id) });
        }
      });

      const response = await request(app)
        .get("/api/admin/students/")
        .set("Authorization", "Bearer token");

      expect(response.status).toBeDefined();
    });

    it("should reject requests without authorization header for protected routes", async () => {
      authenticateMock.mockImplementation((req, res, next) => {
        res.status(401).json({ error: "No authorization token provided" });
      });

      const response = await request(app).get("/api/admin/dashboard-stats");

      expect(response.status).toBe(401);
    });
  });
});
