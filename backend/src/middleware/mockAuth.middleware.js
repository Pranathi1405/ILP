/**
 * AUTHORS: Harshitha Ravuri,
 * Mock Authentication Middleware
 * **/
const MOCK_USERS = {
  1: { user_id: 1, email: 'admin@ilp.edu', user_type: 'admin' },
  2: { user_id: 2, email: 'teacher.priya@ilp.edu', user_type: 'teacher' },
  3: { user_id: 3, email: 'teacher.arjun@ilp.edu', user_type: 'teacher' },
  4: { user_id: 4, email: 'student.aarav@ilp.edu', user_type: 'student' },
  5: { user_id: 5, email: 'student.diya@ilp.edu', user_type: 'student' },
  6: { user_id: 6, email: 'student.rahul@ilp.edu', user_type: 'student' },
  7: { user_id: 7, email: 'student.ananya@ilp.edu', user_type: 'student' },
  8: { user_id: 8, email: 'parent.suresh@ilp.edu', user_type: 'parent' },
  9: { user_id: 9, email: 'parent.meena@ilp.edu', user_type: 'parent' },
};

export function mockAuthenticate(req, res, next) {
  const mockUserId = Number(req.query.mockUser) || 3; // default student
  req.user = MOCK_USERS[mockUserId] || MOCK_USERS[3];
  next();
}