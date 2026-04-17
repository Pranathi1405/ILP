// student-performance.data.ts

// Interfaces + Mock data for Student Performance page

// ── API Response Interfaces ───────────────────────────────────────

export interface StudentOverview {
  enrolled_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  tests_attempted: number;
  tests_passed: number;
  average_test_score: string;
  current_streak_days: number;
  total_points: number;
  current_rank: number;
  watch_time_formatted: string;
  pass_rate: string;
  last_activity_date: string;
}

export interface TopicMasteryGroup {
  module_id: number;
  subject_id: number;
  course_id: number;
  avg_score: number;
  mastery_level: string;
  correct_answers: number;
  wrong_answers: number;
  topic_name: string;
}

export interface TestPerformanceItem {
  test_analytics_id: number;
  subject_id: number;
  subject_title: string;
  test_type: string;
  total_tests: number;
  completed_tests: number;
  average_score: string;
  highest_score: string;
  lowest_score: string;
  improvement_trend: string;
  trend_label: string;
  strong_topics: any[];
  weak_topics: any[];
}

export interface ScoreTrendAttempt {
  attempt_id: number;
  test_name: string;
  score: number;
  score_percent: number;
  attempted_at: string;
  score_diff: number | null;
  trend_direction: string;
}

export interface LeaderboardEntry {
  rank_position: number;
  points_earned: number;
  average_score: string;
  first_name: string;
  last_name: string;
  is_current_student: number;
}

export interface CourseProgressItem {
  course_id: number;
  course_title: string;
  progress_percentage: number;
  total_tests: number;
  completed_tests: number;
  total_videos: number;
  completed_videos: number;
  average_test_score: string;
  status: string;
}

export interface StudentPerformanceSummary {
  totalTests: number;
  notAttempted: number;
  totalMarks: string;
  percentage: number;
  rank: string;
  accuracy: number;
  practiceCompletion: number;
  attendance: number;
}

export interface TopicMasteryDisplay {
  strong: TopicMasteryGroup[];
  weak: TopicMasteryGroup[];
}

export interface ChartBarItem {
  label: string;
  value: number;
}

// ── MOCK: Individual test row ─────────────────────────────────────
// No API exists for individual test rows with name/date/status.
// /analytics/student/tests only returns subject-level summaries.
export interface RecentTestRow {
  sno: string;
  test_name: string;
  status: 'ATTEMPTED' | 'NOT ATTEMPTED';
  subject: string;
  score: string;
  date: string;
  attempt_id: number | null;
}

export const recentTestsMock: RecentTestRow[] = [
  {
    sno: '01',
    test_name: 'Quantum Mechanics Intro',
    status: 'ATTEMPTED',
    subject: 'Physics',
    score: '92/100',
    date: 'Oct 12, 2023',
    attempt_id: 1,
  },
  {
    sno: '02',
    test_name: 'Organic Synthesis II',
    status: 'NOT ATTEMPTED',
    subject: 'Chemistry',
    score: '–',
    date: 'Oct 10, 2023',
    attempt_id: null,
  },
  {
    sno: '03',
    test_name: 'Calculus & Limits',
    status: 'ATTEMPTED',
    subject: 'Mathematics',
    score: '84/100',
    date: 'Oct 08, 2023',
    attempt_id: 3,
  },
];
export interface PieChart {
  correct: number;
  wrong: number;
  notAttempted: number;
}

export interface QuestionItem {
  sNo: number;
  questionId: number;
  topic: string;
  questionText: string;
  markedAnswer: string;
  correctAnswer: string;
  status: 'correct' | 'wrong' | 'not_attempted';
  marksAwarded: number;
  marksDeducted: number;
  timeTaken: number;
}

export interface TestDetailResponse {
  testId: number;
  testName: string;
  subject: string;
  unit?: string;
  date?: string;
  totalQuestions: number;
  attemptedQuestions: number;
  score: number;
  totalMarks: number;
  timeAllotted: number;
  timeSpent: number;
  pieChart: PieChart;
  questions: QuestionItem[];
  avgComparison?: number;
}
