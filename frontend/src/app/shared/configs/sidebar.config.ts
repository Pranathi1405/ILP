export interface SidebarItem {
  label: string;
  key: string;
  route: string;
  childRoutes?: string[];
}

export const STUDENT_SIDEBAR: SidebarItem[] = [
  { label: 'Dashboard', key: 'dashboard', route: '/student/dashboard' },
  { label: 'My Courses', key: 'my-courses', route: '/student/my-courses' },
  { label: 'Test Lab', key: 'test-lab', route: '/student/test-home' },
  { label: 'Practice Lab', key: 'practice-lab', route: '/student/practice-home' },
  { label: 'Browse', key: 'browse', route: '/student/browse' },
  { label: 'Performance', key: 'performance', route: '/student/performance' },
  { label: 'Doubt Corner', key: 'doubt-corner', route: '/student/doubt-corner' },
  { label: 'Settings', key: 'settings', route: '/student/settings' },
];

export const TEACHER_SIDEBAR: SidebarItem[] = [
  { label: 'Dashboard', key: 'dashboard', route: '/teacher/dashboard' },
  { label: 'My Courses', key: 'my-courses', route: '/teacher/my-courses' },
  { label: 'Live Studio', key: 'live-studio', route: '/teacher/live-studio' },
  { label: 'Students', key: 'students', route: '/teacher/students' },
  { label: 'SME Test', key: 'sme-test', route: '/teacher/sme-test' },
  { label: 'Doubt Corner', key: 'doubt-corner', route: '/teacher/doubt-corner' },
  { label: 'Add Questions', key: 'question-bank', route: '/teacher/question-bank' },
  { label: 'Announcements', key: 'announcements', route: '/teacher/announcements' },
  { label: 'Settings', key: 'settings', route: '/teacher/settings' },
];

export const PARENT_SIDEBAR: SidebarItem[] = [
  { label: 'Child Overview', key: 'dashboard', route: '/parent/dashboard' },
  { label: 'Performance', key: 'performance', route: '/parent/performance' },
  { label: 'Attendance', key: 'attendance', route: '/parent/attendance' },
  { label: 'Fee Payment', key: 'fee-payment', route: '/parent/fee-payment' },
  { label: 'Settings', key: 'settings', route: '/parent/settings' },
];
