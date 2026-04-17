export interface StudentRosterItem {
  student_id: number;
  name: string;
  progress_percentage: string;
  average_test_score: string;
  last_activity: string | null;
  course_rank: number | null;
  status: string;
  course_name?: string;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  name: string;
  total_score: string;
  completion_percent: string;
  average_test_score: string;
  tests_completed: number;
}

export interface CourseAnalyticsItem {
  course_id: number;
  course_title: string;
  total_enrollments: number;
  average_completion_rate?: string;
  dropout_rate?: string;
  average_rating?: string;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: {
    total_students: number;
  };
}
export interface StudentsResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    course_name: string;
    total_students: number;
    students: StudentRosterItem[];
  };
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: LeaderboardEntry[];
}

export interface CourseAnalyticsResponse {
  success: boolean;
  data: CourseAnalyticsItem[];
}
