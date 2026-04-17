export interface ParentDashboardModel {
  studentName: string;
  attendanceText: string;
  classInfo: string;
  recentScore: number;
  totalMarks: number;
  attendancePercent: number;
  feeDue: number;
}

export const PARENT_DASHBOARD_DATA: ParentDashboardModel = {
  studentName: 'Yugandhar P.',
  attendanceText: 'Yugandhar P. is Present today.',
  classInfo: 'First Class: Physics (10:00 AM) - Attended via Live Stream.',
  recentScore: 180,
  totalMarks: 300,
  attendancePercent: 85,
  feeDue: 15000,
};
