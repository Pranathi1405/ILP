import { Component, OnInit, Input } from '@angular/core';
import { TeacherStudentsService } from '../../../../../core/services/teacher/teacher-students.service';
import { StudentRosterItem } from '../../../../../core/services/teacher/teacher-students.data';

interface StudentRow {
  sno: number;
  student_id: string;
  initials: string;
  name: string;
  course: string; // NOTE: Not returned by API — injected from @Input() courseTitle
  average_test_score: string;
  progress_percentage: string;
  status: string;
}

@Component({
  selector: 'app-student-list',
  templateUrl: './student-list.html',
})
export class StudentListComponent implements OnInit {
  @Input() courseId: number = 5;
  @Input() courseTitle: string = 'All Active Courses'; // used to fill missing course_name

  students: StudentRow[] = [];
  filteredStudents: StudentRow[] = [];
  currentPage = 1;
  pageSize = 4;
  isLoading = false;
  error: string | null = null;

  constructor(private studentsService: TeacherStudentsService) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.studentsService.getStudentsByCourse(this.courseId).subscribe({
      next: (res) => {
        this.students = res.data.students.map((s: any, i: number) => ({
          sno: i + 1,
          student_id: `STU${String(s.student_id).padStart(3, '0')}`,
          initials: s.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),

          name: s.name,
          course: res.data.course_name,
          average_test_score: s.average_test_score,
          progress_percentage: s.progress_percentage,
          status: s.status,
        }));

        this.filteredStudents = [...this.students];
        this.isLoading = false;
      },
    });
  }

  get pagedStudents(): StudentRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredStudents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.pageSize);
  }

  get shownCount(): number {
    const start = (this.currentPage - 1) * this.pageSize;
    return Math.min(this.pageSize, this.filteredStudents.length - start);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getInitialsColor(initials: string): string {
    const colors = ['#6d28d9', '#0891b2', '#d97706', '#059669', '#dc2626'];
    let hash = 0;
    for (const c of initials) hash = c.charCodeAt(0) + hash;
    return colors[hash % colors.length];
  }

  getScoreWidth(score: string): number {
    return Math.min(100, parseFloat(score));
  }

  viewStudent(studentId: string): void {
    // Navigate to student detail page
    console.log('View student:', studentId);
  }
}
