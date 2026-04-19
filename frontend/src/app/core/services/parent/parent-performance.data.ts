// =============================================
// PARENT PERFORMANCE - DATA MODELS
// =============================================

// --- /analytics/parent/students ---
export interface LinkedStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  email: string;
  relationship_type: string;
  is_primary: boolean;
  enrolled_courses: number;
  current_test_score: number;
  average_test_score: number;
  current_rank: number;
  last_activity_date: string;
  watch_time_formatted: string;
}

export interface LinkedStudentsResponse {
  success: boolean;
  message: string;
  data: {
    students: LinkedStudent[];
  };
}

// --- /analytics/parent/dashboard ---
export interface SubjectProficiency {
  subject: string;
  average_score: number; // 0-100
}

export interface TopicMastery {
  strong: string[];
  weak: string[];
}

export interface RecentAssessment {
  sno: number;
  test_name: string;
  status: 'attempted' | 'not_attempted';
  subject: string;
  score: string | null;       // e.g. "88/100"
  total_marks: number;
  obtained_marks: number | null;
  date: string;
  test_id: number;
}

export interface ParentDashboardData {
  student_id: number;
  analytics: {
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
    performance_trend: string;
    updated_at: string;
    _is_default: boolean;
  };
  test_analytics: {
    total_tests: number;
    avg_score: number;
    highest_score: number;
    weakest_subject: {
      subject_id: number;
      subject_title: string;
      avgScore: number;
    } | null;
  };
  score_trend: {
    total_attempts: number;
    attempts: ScoreTrendAttempt[];
  };
  topic_mastery: {
    strong: TopicMasteryItem[];
    weak: TopicMasteryItem[];
  };
  // NOTE: Subject proficiency is NOT directly in this API response.
  // It needs to come from /v1/parent/{parentId}/performance-graph
  subject_proficiency?: SubjectProficiency[];
  recent_assessments?: RecentAssessment[];
}

export interface ScoreTrendAttempt {
  attempt_id: number;
  test_name: string;
  score: number;
  max_score: number;
  attempted_at: string;
  score_percent: number;
  score_diff: number | null;
  trend_direction: string;
}

export interface TopicMasteryItem {
  topic_id?: number;
  topic_name?: string;
  subject_title?: string;
  name?: string; // fallback
}

export interface ParentDashboardResponse {
  success: boolean;
  message: string;
  data: ParentDashboardData;
}

// --- /v1/parent/{parentId}/performance-graph ---
export interface PerformanceGraphResponse {
  graphType: 'bar' | 'line';
  data: {
    subject: string;
    avgScore: number;
  }[];
}

// --- /v1/parent/{parentId}/tests ---
export interface ParentTestsResponse {
  total: number;
  page: number;
  limit: number;
  tests: ParentTestItem[];
}

export interface ParentTestItem {
  sno: number;
  testId: number;
  testName: string;
  status: 'attempted' | 'not_attempted';
  subject: string;
  score: number | null;
  totalMarks: number;
  date: string;
}

// --- /v1/parent/{parentId}/tests/{testId} (Page 2 detail) ---
export interface TestDetailResponse {
  testId: number;
  testName: string;
  subject: string;
  totalQuestions: number;
  attemptedQuestions: number;
  score: number;
  totalMarks: number;
  timeAllotted: number; // seconds
  timeSpent: number;   // seconds
  pieChart: {
    correct: number;
    wrong: number;
    notAttempted: number;
  };
  questions: TestQuestion[];
}

export interface TestQuestion {
  sNo: number;
  questionId: number;
  questionText: string;
  topic: string;
  marksPerAnswer: number;
  correctAnswer: string;
  markedAnswer: string;
  status: 'correct' | 'wrong' | 'not_attempted';
  marksAwarded: number;
  marksDeducted: number;
  timeTaken: number;
}

// --- /v1/parent/{parentId}/child-overview ---
export interface ChildOverviewResponse {
  studentId: number;
  studentName: string;
  cards: {
    testsAttempted: number;
    avgScore: number;
    accuracy: number;
    weakTopics: string[];
  };
  testHistory: {
    sNo: number;
    testName: string;
    date: string;
    score: number;
    totalMarks: number;
    accuracy: number;
  }[];
  scoreGraph: {
    last7Tests: {
      testName: string;
      score: number;
      date: string;
    }[];
  };
}

// --- /v1/parent/{parentId}/stats ---
export interface ParentStatsResponse {
  studentName: string;
  totalTestsAttempted: number;
  accuracy: number;
}

// UI helper models
export interface SubjectProficiencyUI {
  name: string;
  score: number;
  color: string;
}

export const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#4CAF50',
  Chemistry: '#FF9800',
  Mathematics: '#F44336',
  Biology: '#2196F3',
  Math: '#F44336',
  default: '#9E9E9E',
};

export type DateFilterOption = 'Last 30 Days' | 'Last 7 Days' | 'Last 3 Months' | 'All Time';