import * as SmePerformanceService from '../services/smePerformance.service.js';

const sendError = (res, error) => {
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
  });
};

export const getStudentStats = async (req, res) => {
  try {
    const data = await SmePerformanceService.getStudentStats(req.user.id, req.params.studentId);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getStudentPerformanceGraph = async (req, res) => {
  try {
    const data = await SmePerformanceService.getStudentPerformanceGraph(
      req.user.id,
      req.params.studentId,
      req.query.subject || 'all'
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getStudentTests = async (req, res) => {
  try {
    const data = await SmePerformanceService.getStudentTests(
      req.user.id,
      req.params.studentId,
      req.query
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getStudentTestDetail = async (req, res) => {
  try {
    const data = await SmePerformanceService.getStudentTestDetail(
      req.user.id,
      req.params.studentId,
      req.params.testId
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getTeacherStats = async (req, res) => {
  try {
    const data = await SmePerformanceService.getTeacherStats(req.user.id, req.params.teacherId);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getTeacherLeaderboard = async (req, res) => {
  try {
    const data = await SmePerformanceService.getTeacherLeaderboard(
      req.user.id,
      req.params.teacherId,
      req.query
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getTeacherStudents = async (req, res) => {
  try {
    const data = await SmePerformanceService.getTeacherStudents(
      req.user.id,
      req.params.teacherId,
      req.query
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getTeacherStudentDetail = async (req, res) => {
  try {
    const data = await SmePerformanceService.getTeacherStudentDetail(
      req.user.id,
      req.params.teacherId,
      req.params.studentId
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getParentStats = async (req, res) => {
  try {
    const data = await SmePerformanceService.getParentStats(req.user.id, req.params.parentId);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getParentPerformanceGraph = async (req, res) => {
  try {
    const data = await SmePerformanceService.getParentPerformanceGraph(
      req.user.id,
      req.params.parentId,
      req.query
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getParentTests = async (req, res) => {
  try {
    const data = await SmePerformanceService.getParentTests(
      req.user.id,
      req.params.parentId,
      req.query
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getParentTestDetail = async (req, res) => {
  try {
    const data = await SmePerformanceService.getParentTestDetail(
      req.user.id,
      req.params.parentId,
      req.params.testId
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getParentChildOverview = async (req, res) => {
  try {
    const data = await SmePerformanceService.getParentChildOverview(
      req.user.id,
      req.params.parentId,
      req.query.studentId || null
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getSubjectFilters = async (_req, res) => {
  try {
    const data = await SmePerformanceService.getSubjectFilters();
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getCourseFilters = async (_req, res) => {
  try {
    const data = await SmePerformanceService.getCourseFilters();
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
};
