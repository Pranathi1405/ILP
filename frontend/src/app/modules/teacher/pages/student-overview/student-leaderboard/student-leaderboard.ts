import { Component, OnInit, Input } from '@angular/core';
import { TeacherStudentsService } from '../../../../../core/services/teacher/teacher-students.service';
import { LeaderboardEntry } from '../../../../../core/services/teacher/teacher-students.data';

interface LeaderboardRow {
  rank: number;
  student_id: number;
  name: string;
  initials: string;
  score: string;
  color: string;
}

@Component({
  selector: 'app-student-leaderboard',
  templateUrl: './student-leaderboard.html',
})
export class StudentLeaderboardComponent implements OnInit {
  @Input() courseId: number = 5;
  @Input() limit: number = 3;

  leaderboard: LeaderboardRow[] = [];
  isLoading = false;
  error: string | null = null;

  private AVATAR_COLORS = ['#6d28d9', '#0891b2', '#d97706', '#059669', '#dc2626', '#7c3aed'];

  constructor(private studentsService: TeacherStudentsService) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.isLoading = true;
    this.studentsService.getLeaderboard(this.courseId, this.limit).subscribe({
      next: (res) => {
        this.leaderboard = res.data.map((e) => ({
          rank: e.rank,
          student_id: e.student_id,
          name: e.name,
          initials: e.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          score: e.total_score,
          color: this.AVATAR_COLORS[(e.rank - 1) % this.AVATAR_COLORS.length],
        }));
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load leaderboard.';
        this.isLoading = false;
      },
    });
  }

  getRankLabel(rank: number): string {
    return String(rank).padStart(2, '0');
  }
}
