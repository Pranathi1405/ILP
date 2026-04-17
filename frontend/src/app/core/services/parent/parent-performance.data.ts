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
}

// ── GET /analytics/parent/dashboard ─────────────────────
export interface ParentAnalytics {
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
  performance_trend: string; // "improving" | "declining" | "stable"
  updated_at: string;
  _is_default: boolean;
}

export interface TestAnalytics {
  total_tests: number;
  avg_score: number;
  highest_score: number;
  weakest_subject: {
    subject_id: number;
    subject_title: string;
    avg_score: string;
  };
}

export interface ScoreTrendAttempt {
  attempt_id: number;
  test_name: string;
  score: number;
  max_score: number;
  score_percent: number;
  attempted_at: string;
  score_diff: number | null;
  trend_direction: 'increase' | 'decrease' | 'stable';
}

export interface ScoreTrend {
  total_attempts: number;
  attempts: ScoreTrendAttempt[];
}

export interface TopicMasteryItem {
  module_id: number;
  topic_name: string;
  avg_score: string;
  mastery_level: 'STRONG' | 'AVERAGE' | 'WEAK';
}

export interface TopicMasteryGrouped {
  STRONG: TopicMasteryItem[];
  AVERAGE: TopicMasteryItem[];
  WEAK: TopicMasteryItem[];
}

export interface TopicMastery {
  total_topics: number;
  grouped: TopicMasteryGrouped;
  all_topics: (TopicMasteryItem & { subject_title: string })[];
}

export interface ParentDashboard {
  student_id: number;
  analytics: ParentAnalytics;
  test_analytics: TestAnalytics;
  score_trend: ScoreTrend;
  topic_mastery: TopicMastery;
}

// ── GET /analytics/student/courses ──────────────────────
export interface StudentCourse {
  course_id: number;
  course_title: string;
  total_modules: number;
  completed_modules: number;
  progress_percentage: number;
  status: string;
  total_videos: number;
  completed_videos: number;
  total_tests: number;
  completed_tests: number;
  average_test_score: number;
}

// ── GET /analytics/student/subjects?courseId=X ──────────
export interface SubjectAnalytics {
  subject_id: number;
  subject_title: string;
  total_topics: number;
  avg_score: string; // NOTE: string from API — use parseFloat()
  mastery_summary: {
    strong_count: number;
    average_count: number;
    weak_count: number;
    strong_percent: string;
  };
}

// ── UI ViewModel — built in service from API data ────────
export interface SubjectBar {
  subject_title: string;
  avg_score: number;
  bar_color_class: string; // Tailwind class
  score_color_class: string; // Tailwind class for score text
}

export interface ExamResultRow {
  date: string; // formatted display date
  test_name: string;
  score: string; // e.g. "68/100"
  score_percent: number;
  accuracy_color_class: string; // Tailwind class
  trend_direction: string;
}

export interface PerformanceTrendPoint {
  label: string; // "Test 1", "Test 2"...
  score_percent: number;
  test_name: string;
  attempted_at: string;
}

// ── Combined ViewModel for the page ─────────────────────
export interface ParentPerformanceViewModel {
  childName: string;
  studentId: number;
  performanceTrend: string; // "improving" | "declining" | "stable"
  trendBadge: string; // "+8% Increase"
  trendPositive: boolean;
  subjectBars: SubjectBar[];
  strongTopics: string[];
  weakTopics: string[];
  examResults: ExamResultRow[];
  trendPoints: PerformanceTrendPoint[];
}
