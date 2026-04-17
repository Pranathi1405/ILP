import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const authenticateMock = jest.fn((req, _res, next) => {
  req.user = { id: 101, role: 'student' };
  next();
});

const authorizeMock = jest.fn((...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

const controllerMocks = {
  getStudentStats: jest.fn((_req, res) => res.status(200).json({ totalTestsAttempted: 24, accuracy: 72.5 })),
  getStudentPerformanceGraph: jest.fn((_req, res) => res.status(200).json({ graphType: 'bar', data: [] })),
  getStudentTests: jest.fn((_req, res) => res.status(200).json({ total: 0, page: 1, limit: 10, tests: [] })),
  getStudentTestDetail: jest.fn((_req, res) => res.status(200).json({ testId: 1, questions: [] })),
  getTeacherStats: jest.fn((_req, res) => res.status(200).json({ totalAssignedStudents: 42 })),
  getTeacherLeaderboard: jest.fn((_req, res) => res.status(200).json({ leaderboard: [] })),
  getTeacherStudents: jest.fn((_req, res) => res.status(200).json({ total: 0, page: 1, limit: 10, students: [] })),
  getTeacherStudentDetail: jest.fn((_req, res) =>
    res.status(200).json({ studentId: 1, cards: {}, testHistory: [], scoreGraph: {} })
  ),
  getParentStats: jest.fn((_req, res) =>
    res.status(200).json({ studentName: 'Child User', totalTestsAttempted: 12, accuracy: 66.5 })
  ),
  getParentPerformanceGraph: jest.fn((_req, res) => res.status(200).json({ graphType: 'line', data: [] })),
  getParentTests: jest.fn((_req, res) => res.status(200).json({ total: 0, page: 1, limit: 10, tests: [] })),
  getParentTestDetail: jest.fn((_req, res) => res.status(200).json({ testId: 2, questions: [] })),
  getParentChildOverview: jest.fn((_req, res) =>
    res.status(200).json({ studentId: 1, studentName: 'Child User', cards: {}, testHistory: [], scoreGraph: {} })
  ),
  getSubjectFilters: jest.fn((_req, res) => res.status(200).json({ subjects: [{ value: 'all', label: 'All' }] })),
  getCourseFilters: jest.fn((_req, res) =>
    res.status(200).json({ courses: [{ value: 'jee_advanced', label: 'JEE Advanced' }] })
  ),
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: authenticateMock,
  authorize: authorizeMock,
}));

jest.unstable_mockModule('../controllers/smePerformance.controller.js', () => controllerMocks);

const { default: smePerformanceRoutes } = await import('../routes/smePerformance.routes.js');

describe('SME performance routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', smePerformanceRoutes);
    jest.clearAllMocks();
    authenticateMock.mockImplementation((req, _res, next) => {
      req.user = { id: 101, role: 'student' };
      next();
    });
  });

  it('serves student stats on the exact v1 route', async () => {
    const response = await request(app)
      .get('/api/v1/student/11/stats')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(controllerMocks.getStudentStats).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({ totalTestsAttempted: 24, accuracy: 72.5 });
  });

  it('blocks teacher routes for a student token', async () => {
    const response = await request(app)
      .get('/api/v1/teacher/7/stats')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(403);
    expect(controllerMocks.getTeacherStats).not.toHaveBeenCalled();
  });

  it('serves teacher leaderboard when role is teacher', async () => {
    authenticateMock.mockImplementation((req, _res, next) => {
      req.user = { id: 202, role: 'teacher' };
      next();
    });

    const response = await request(app)
      .get('/api/v1/teacher/7/leaderboard?limit=5&course=jee_advanced')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(controllerMocks.getTeacherLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('serves parent child overview when role is parent', async () => {
    authenticateMock.mockImplementation((req, _res, next) => {
      req.user = { id: 303, role: 'parent' };
      next();
    });

    const response = await request(app)
      .get('/api/v1/parent/9/child-overview')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(controllerMocks.getParentChildOverview).toHaveBeenCalledTimes(1);
  });

  it('exposes shared filter routes behind authentication', async () => {
    const response = await request(app)
      .get('/api/v1/filters/subjects')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(controllerMocks.getSubjectFilters).toHaveBeenCalledTimes(1);
  });
});
