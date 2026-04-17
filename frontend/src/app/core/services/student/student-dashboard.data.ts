/* 
  Author: Pranathi
  Description: Interface and mock data for student dashboard.
  Real API data is fetched from /analytics/student/overview
  Mock data is used for sections where no API exists yet.
*/

export interface StudentDashboardData {
  // ── From API: /analytics/student/overview ──
  test_scores: number;
  courses_done: number;
  daily_streak: number;

  // ── MOCK: No attendance API available yet ──
  attendance: number;

  // ── MOCK: No live classes API integrated yet ──
  upcoming_live_classes: {
    title: string;
    time: string;
    is_live: boolean;
  }[];

  // ── MOCK: No resume video API available yet ──
  video_chapter: string;
  video_title: string;
  completion_percentage: number;

  // ── MOCK: No scheduled test API available yet ──
  upcoming_scheduled_test: string;
  test_starts_in: string;

  // ── MOCK: No recent activity API available yet ──
  recent_activity: {
    type: 'completed' | 'test' | 'doubt' | 'enrolled';
    text: string;
    time: string;
  }[];
}

// ── MOCK data for sections without APIs ──────────────────────
export const studentDashboardMock = {
  // MOCK: Replace when attendance API is available
  attendance: 0,

  // MOCK: Replace when live classes API is integrated
  upcoming_live_classes: [
    { title: 'Physics: Rotational Motion', time: '10:00 AM - 11:30 AM', is_live: true },
    { title: 'Chemistry: Equilibrium', time: '12:00 PM - 01:30 PM', is_live: false },
  ],

  // MOCK: Replace when last-watched video API is available
  video_chapter: 'Chapter 04: Physics',
  video_title: 'Rotational Motion: Moment of Inertia',
  completion_percentage: 60,

  // MOCK: Replace when scheduled tests API is available
  upcoming_scheduled_test: 'Mid-Term Physics Exam',
  test_starts_in: '02D : 14H : 35M',

  // MOCK: Replace when activity feed API is available
  recent_activity: [
    {
      type: 'completed' as const,
      text: 'Completed Lecture 03 - Newton Laws of Motion',
      time: '2H AGO',
    },
    { type: 'test' as const, text: 'Attempted Practice Test - Kinematics', time: '3H AGO' },
    { type: 'doubt' as const, text: 'Doubt resolved - rotational dynamics', time: 'YESTERDAY' },
    { type: 'enrolled' as const, text: 'Enrolled in complete JEE Maths', time: '2 DAYS AGO' },
  ],
};
