// parent-dashboard.data.ts
// Author: Pranathi
// All data types and mock data for the Parent Dashboard (Child Overview) module.

// ─── NOTE: mockCoursesData is MOCK DATA ────────────────────────────────────
// No dedicated parent/courses listing API exists yet.
// Replace with a real service call in parent-dashboard.service.ts when available.
// ───────────────────────────────────────────────────────────────────────────

// ── GET /analytics/parent/students ────────────────────────────────────────

export interface LinkedStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  email: string;
  relationship_type: string;
  is_primary: boolean;
  enrolled_courses: number;
  average_test_score: number;
  current_rank: number;
  last_activity_date: string;
  watch_time_formatted: string;
  grade?: string;
}

export interface LinkedStudentsResponse {
  success: boolean;
  message: string;
  data: {
    students: LinkedStudent[];
  };
}

// ── GET /analytics/parent/dashboard?studentId=X ───────────────────────────

export interface DashboardAnalytics {
  total_courses_enrolled: number;
  courses_in_progress: number;
  courses_completed: number;
  average_course_progress: number;
  total_tests_attempted: number;
  average_test_score: number;
  total_study_time_minutes: number;
  study_time_formatted: string;
  attendance_rate: number;
  current_rank: number;
  last_active_date: string;
}

export interface ScoreTrendItem {
  subject: string;
  avgScore: number;
}

export interface DashboardData {
  student_id: number;
  analytics: DashboardAnalytics;
  test_analytics: any;
  score_trend: ScoreTrendItem[];
  topic_mastery: any[];
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

// ── GET /v1/parent/{parentId}/tests ───────────────────────────────────────

export interface ParentTest {
  sNo: number;
  testId: number;
  testName: string;
  status: string;
  subject: string;
  score: number;
  totalMarks: number;
  date: string;
}

export interface ParentTestsResponse {
  total: number;
  page: number;
  last: number;
  tests: ParentTest[];
}

export interface LatestTest {
  testName: string;
  score: number;
  totalMarks: number;
  subject: string;
  date: string;
}

// ── My Child's Courses — MOCK DATA ─────────────────────────────────────────
export interface CourseItem {
  name: string;
  teacher: string;
  iconClass: string;
  symbol: string;
  status: 'in_progress' | 'done';
  progress: number;
}

export const mockCoursesData: CourseItem[] = [
  {
    name: 'Physics',
    teacher: 'Section 6 • Prof. Suresh Kumar',
    iconClass: 'icon-physics',
    symbol: '⚛',
    status: 'in_progress',
    progress: 45,
  },
  {
    name: 'Chemistry',
    teacher: 'Prof. Ramesh S',
    iconClass: 'icon-chemistry',
    symbol: '🧪',
    status: 'done',
    progress: 100,
  },
  {
    name: 'Mathematics',
    teacher: 'Dr. Anita Verma',
    iconClass: 'icon-mathematics',
    symbol: 'Σ',
    status: 'in_progress',
    progress: 28,
  },
];