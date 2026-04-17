/* 
  Author: Pranathi
  Description: Data interfaces and mock fallbacks for Teacher Dashboard
*/

// Interface for GET /analytics/teacher/dashboard response
export interface TeacherDashboardStats {
  doubts_pending: number;
  assignments_to_grade: number;
  average_class_rating: number;
}

// Interface for each course in GET /analytics/teacher/courses
export interface TeacherCourse {
  course_id: number;
  course_name: string;
  category: string; // e.g. "JEE Mains"
  enrolled_students: number;
  status: string; // e.g. "active" | "inactive"
}

// Interface for GET /live-classes?type=upcoming (single class)
export interface UpcomingLiveClass {
  class_id: number;
  title: string; // e.g. "Physics - Rotational Motion"
  status: string; // "live" | "scheduled"
  scheduled_start_time: string;
  duration_minutes: number;
  subject_name: string;
  course_name: string;
   can_go_live?: boolean;
  is_live?: boolean;
  is_overdue?: boolean;
  starts_in_minutes?: number;
  starts_in_label?: string;
}

// MOCK: fallback if API fails
export const teacherStatsMock: TeacherDashboardStats = {
  doubts_pending: 12,
  assignments_to_grade: 5,
  average_class_rating: 4.8,
};

// MOCK: fallback courses if API fails
export const teacherCoursesMock: TeacherCourse[] = [
  {
    course_id: 1,
    course_name: 'Complete JEE Physics',
    category: 'JEE Mains',
    enrolled_students: 21,
    status: 'active',
  },
  {
    course_id: 2,
    course_name: 'Mathematics:Calculus Mastery',
    category: 'JEE Advanced',
    enrolled_students: 192,
    status: 'active',
  },
];

// MOCK: fallback upcoming class if API fails
export const upcomingClassMock: UpcomingLiveClass = {
  class_id: 10,
  title: 'Physics - Rotational Motion',
  status: 'live',
  scheduled_start_time: new Date().toISOString(),
  duration_minutes: 60,
  subject_name: 'Physics',
  course_name: '11th Grade',
};
