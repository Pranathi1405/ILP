import * as PerformanceModel from '../models/smePerformance.model.js';

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const formatAttemptQuestions = (questions) =>
  questions.map((question, index) => {
    const selectedIds = parseJsonArray(question.selectedOptionIds);
    const options = parseJsonArray(question.allOptions);

    const selectedMultiText = selectedIds.length
      ? options
          .filter((option) => selectedIds.includes(option.option_id))
          .map((option) => option.option_text)
          .join(', ')
      : null;

    const markedAnswer =
      question.selectedOptionText ||
      selectedMultiText ||
      question.numericalAnswer ||
      null;

    const correctAnswer = question.correctOptionText || question.correctNumerical || null;
    const status =
      question.answerStatus === 'not_answered'
        ? 'not_attempted'
        : Number(question.isCorrect) === 1
          ? 'correct'
          : 'wrong';

    const marks = Number(question.marksObtained || 0);

    return {
      sNo: index + 1,
      questionId: question.questionId,
      questionText: question.questionText,
      topic: question.topic,
      markedAnswer,
      correctAnswer,
      status,
      marksAwarded: marks > 0 ? marks : 0,
      marksDeducted: marks < 0 ? Math.abs(marks) : 0,
      timeTaken: 0,
    };
  });

const buildStudentOverviewPayload = async (studentId) => {
  const overview = await PerformanceModel.getStudentOverviewForContext({ studentId });
  const history = await PerformanceModel.getStudentTestHistoryForContext({ studentId });
  const weakTopics = await PerformanceModel.getWeakTopicsForContext({ studentId });

  return {
    cards: {
      testsAttempted: Number(overview.testsAttempted || 0),
      avgScore: Number(overview.avgScore || 0),
      accuracy: Number(overview.accuracy || 0),
      weakTopics: weakTopics.map((topic) => topic.topic),
    },
    testHistory: history.map((test, index) => ({
      sNo: index + 1,
      testName: test.testName,
      date: test.date,
      score: Number(test.score || 0),
      totalMarks: Number(test.totalMarks || 0),
      accuracy: Number(test.accuracy || 0),
    })),
    scoreGraph: {
      last7Tests: history
        .slice(0, 7)
        .reverse()
        .map((test) => ({
          testName: test.testName,
          score: Number(test.score || 0),
          date: test.date,
        })),
    },
  };
};

const buildStudentPerformanceGraphPayload = async (studentId, subject = 'all') => {
  if (!subject || subject === 'all') {
    const rows = await PerformanceModel.getStudentSubjectAverages(studentId);
    return {
      graphType: 'bar',
      data: rows.map((row) => ({
        subject: row.subject,
        avgScore: Number(row.avgScore || 0),
      })),
    };
  }

  const rows = await PerformanceModel.getStudentSubjectTrend(studentId, subject);
  return {
    graphType: 'line',
    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
    data: rows.reverse().map((row) => ({
      testName: row.testName,
      score: Number(row.score || 0),
      date: row.date,
    })),
  };
};

const buildStudentTestsPayload = async (studentId, query) => {
  const page = toInt(query.page) || 1;
  const limit = toInt(query.limit) || 10;
  const filters = {
    studentId,
    subject: query.subject,
    month: query.month,
    startDate: query.startDate,
    endDate: query.endDate,
    page,
    limit,
  };

  const [total, tests] = await Promise.all([
    PerformanceModel.countStudentTests(filters),
    PerformanceModel.getStudentTests(filters),
  ]);

  return {
    total,
    page,
    limit,
    tests: tests.map((test, index) => ({
      sNo: (page - 1) * limit + index + 1,
      testId: test.testId,
      testName: test.testName,
      status: test.status,
      subject: test.subject,
      score: Number(test.score || 0),
      totalMarks: Number(test.totalMarks || 0),
      date: test.date,
    })),
  };
};

const buildStudentTestDetailPayload = async (studentId, testId) => {
  const attempt = await PerformanceModel.getStudentLatestSubmittedAttemptForTest(studentId, testId);

  if (!attempt) {
    throw { status: 404, message: 'No submitted SME attempt found for this test.' };
  }

  const questions = formatAttemptQuestions(
    await PerformanceModel.getAttemptQuestionBreakdown(attempt.attempt_id, testId)
  );

  const attemptedQuestions = questions.filter((question) => question.status !== 'not_attempted').length;
  const correct = questions.filter((question) => question.status === 'correct').length;
  const wrong = questions.filter((question) => question.status === 'wrong').length;
  const notAttempted = questions.length - attemptedQuestions;

  return {
    testId: attempt.test_id,
    testName: attempt.testName,
    subject: attempt.subject,
    totalQuestions: Number(attempt.totalQuestions || questions.length),
    attemptedQuestions,
    score: Number(attempt.score || 0),
    totalMarks: Number(attempt.totalMarks || 0),
    timeAllotted: Number(attempt.duration_minutes || 0) * 60,
    timeSpent: Number(attempt.timeSpent || 0),
    pieChart: {
      correct,
      wrong,
      notAttempted,
    },
    questions,
  };
};

const requireStudentAccess = async (userId, studentId) => {
  const resolvedStudentId = await PerformanceModel.getStudentIdByUserId(userId);
  if (!resolvedStudentId || resolvedStudentId !== toInt(studentId)) {
    throw { status: 403, message: 'You are not allowed to access this student resource.' };
  }
};

const requireTeacherAccess = async (userId, teacherId) => {
  const resolvedTeacherId = await PerformanceModel.getTeacherIdByUserId(userId);
  if (!resolvedTeacherId || resolvedTeacherId !== toInt(teacherId)) {
    throw { status: 403, message: 'You are not allowed to access this teacher resource.' };
  }
};

const requireParentContext = async (userId, parentId, requestedStudentId = null) => {
  const resolvedParentId = await PerformanceModel.getParentIdByUserId(userId);
  if (!resolvedParentId || resolvedParentId !== toInt(parentId)) {
    throw { status: 403, message: 'You are not allowed to access this parent resource.' };
  }

  const linkedStudent = await PerformanceModel.getParentLinkedStudent(resolvedParentId, requestedStudentId);
  if (!linkedStudent) {
    throw { status: 404, message: 'No linked student found for this parent.' };
  }

  return linkedStudent;
};

const ensureTeacherStudentAccess = async (teacherUserId, studentId) => {
  const isMapped = await PerformanceModel.isStudentMappedToTeacher(teacherUserId, studentId);
  if (!isMapped) {
    throw { status: 403, message: 'This student is not mapped to the authenticated teacher.' };
  }
};

export const getStudentStats = async (userId, studentId) => {
  await requireStudentAccess(userId, studentId);
  const stats = await PerformanceModel.getStudentStats(studentId);

  return {
    totalTestsAttempted: Number(stats.totalTestsAttempted || 0),
    accuracy: Number(stats.accuracy || 0),
  };
};

export const getStudentPerformanceGraph = async (userId, studentId, subject = 'all') => {
  await requireStudentAccess(userId, studentId);
  return buildStudentPerformanceGraphPayload(studentId, subject);
};

export const getStudentTests = async (userId, studentId, query) => {
  await requireStudentAccess(userId, studentId);
  return buildStudentTestsPayload(studentId, query);
};

export const getStudentTestDetail = async (userId, studentId, testId) => {
  await requireStudentAccess(userId, studentId);
  return buildStudentTestDetailPayload(studentId, testId);
};

export const getTeacherStats = async (userId, teacherId) => {
  await requireTeacherAccess(userId, teacherId);
  const totalAssignedStudents = await PerformanceModel.getTeacherAssignedStudentsCount(userId);
  return { totalAssignedStudents };
};

export const getTeacherLeaderboard = async (userId, teacherId, { limit = 5, course }) => {
  await requireTeacherAccess(userId, teacherId);
  const rows = await PerformanceModel.getTeacherLeaderboard(userId, course, toInt(limit) || 5);

  return {
    leaderboard: rows.map((row, index) => ({
      rank: index + 1,
      studentId: row.studentId,
      studentName: row.studentName,
      avgScore: Number(row.avgScore || 0),
    })),
  };
};

export const getTeacherStudents = async (userId, teacherId, { page = 1, limit = 10, course }) => {
  await requireTeacherAccess(userId, teacherId);
  const currentPage = toInt(page) || 1;
  const pageSize = toInt(limit) || 10;

  const [total, rows] = await Promise.all([
    PerformanceModel.countTeacherStudents(userId, course),
    PerformanceModel.getTeacherStudents(userId, course, currentPage, pageSize),
  ]);

  return {
    total,
    page: currentPage,
    limit: pageSize,
    students: rows.map((row, index) => ({
      sNo: (currentPage - 1) * pageSize + index + 1,
      studentId: row.studentId,
      studentName: row.studentName,
      course: row.course,
      avgScore: Number(row.avgScore || 0),
    })),
  };
};

export const getTeacherStudentDetail = async (userId, teacherId, studentId) => {
  await requireTeacherAccess(userId, teacherId);
  await ensureTeacherStudentAccess(userId, studentId);

  const student = await PerformanceModel.getStudentProfile(studentId);
  if (!student) {
    throw { status: 404, message: 'Student not found.' };
  }

  const [overview, history, weakTopics] = await Promise.all([
    PerformanceModel.getStudentOverviewForContext({ studentId, teacherUserId: userId }),
    PerformanceModel.getStudentTestHistoryForContext({ studentId, teacherUserId: userId }),
    PerformanceModel.getWeakTopicsForContext({ studentId, teacherUserId: userId }),
  ]);

  return {
    studentId: student.student_id,
    studentName: `${student.first_name} ${student.last_name}`,
    cards: {
      testsAttempted: Number(overview.testsAttempted || 0),
      avgScore: Number(overview.avgScore || 0),
      accuracy: Number(overview.accuracy || 0),
      weakTopics: weakTopics.map((topic) => topic.topic),
    },
    testHistory: history.map((test, index) => ({
      sNo: index + 1,
      testName: test.testName,
      date: test.date,
      score: Number(test.score || 0),
      totalMarks: Number(test.totalMarks || 0),
      accuracy: Number(test.accuracy || 0),
    })),
    scoreGraph: {
      last7Tests: history
        .slice(0, 7)
        .reverse()
        .map((test) => ({
          testName: test.testName,
          score: Number(test.score || 0),
          date: test.date,
        })),
    },
  };
};

export const getParentStats = async (userId, parentId) => {
  const linkedStudent = await requireParentContext(userId, parentId);
  const stats = await PerformanceModel.getStudentStats(linkedStudent.student_id);

  return {
    studentName: `${linkedStudent.first_name} ${linkedStudent.last_name}`,
    totalTestsAttempted: Number(stats.totalTestsAttempted || 0),
    accuracy: Number(stats.accuracy || 0),
  };
};

export const getParentPerformanceGraph = async (userId, parentId, { subject = 'all' }) => {
  const linkedStudent = await requireParentContext(userId, parentId);
  return buildStudentPerformanceGraphPayload(linkedStudent.student_id, subject);
};

export const getParentTests = async (userId, parentId, query) => {
  const linkedStudent = await requireParentContext(userId, parentId);
  return buildStudentTestsPayload(linkedStudent.student_id, query);
};

export const getParentTestDetail = async (userId, parentId, testId) => {
  const linkedStudent = await requireParentContext(userId, parentId);
  return buildStudentTestDetailPayload(linkedStudent.student_id, testId);
};

export const getParentChildOverview = async (userId, parentId, requestedStudentId = null) => {
  const linkedStudent = await requireParentContext(userId, parentId, requestedStudentId);
  const payload = await buildStudentOverviewPayload(linkedStudent.student_id);

  return {
    studentId: linkedStudent.student_id,
    studentName: `${linkedStudent.first_name} ${linkedStudent.last_name}`,
    ...payload,
  };
};

export const getSubjectFilters = async () => {
  const subjects = await PerformanceModel.getSubjectFilterOptions();
  return {
    subjects: [{ value: 'all', label: 'All' }, ...subjects],
  };
};

export const getCourseFilters = async () => {
  const courses = await PerformanceModel.getCourseFilterOptions();
  return { courses };
};
