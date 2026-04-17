/*
  Author: Pranathi
  Description: Student dashboard component.
  Loads real stats from API, uses mock for sections without API.
*/
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentDashboardService } from '../../../../core/services/student/student-dashboard.service';
import { Router } from '@angular/router';
import { interval } from 'rxjs/internal/observable/interval';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class StudentDashboardComponent implements OnInit {
  private dashboardService = inject(StudentDashboardService);
  private cdr = inject(ChangeDetectorRef);

  // ── Real API stats ────────────────────────────────────────────
  test_scores = 0;
  courses_done = 0;
  daily_streak = 0;
  attendance = 0;
  loadAttendance(): void {
    this.dashboardService.getStudentAttendance().subscribe({
      next: (data) => {
        this.attendance = data.attendance_percentage;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Attendance load failed:', err);
        this.attendance = 0;
      },
    });
  }

  // REAL: from /live-classes?type=upcoming
  liveClasses: any[] = [];

  // ── Mock data (no API available) ─────────────────────────────
  // MOCK: resume video
  video = this.dashboardService.getResumeVideo();
  // MOCK: upcoming test
  upcomingTest = this.dashboardService.getUpcomingTest();
  // MOCK: recent activity
  recentActivity = this.dashboardService.getRecentActivity();

  isLoading = true;
  private router = inject(Router);
  liveNowClasses: any[] = [];
  resumeClassIds: number[] = [];
  private refreshSub!: Subscription;

  ngOnInit(): void {
    this.loadStats(); // Load dashboard stats
    this.loadLiveNow(); // Fetch current live class
    this.loadAttendance();
    this.loadLeaderboard();

    // Auto refresh LIVE class every 5 seconds
    // this.refreshSub = interval(5000).subscribe(() => {
    //   this.loadLiveNow();
    // });
  }
  // ngOnDestroy(): void {
  //   if (this.refreshSub) {
  //     this.refreshSub.unsubscribe(); // Prevent memory leak
  //   }
  // }
  loadLeaderboard(): void {
    this.isLeaderboardLoading = true;
    this.dashboardService.getGlobalLeaderboard().subscribe({
      next: (data) => {
        this.leaderboardData = data?.student_rank && data?.leaderboard_list?.length ? data : null;
        this.isLeaderboardLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.leaderboardData = null;
        this.isLeaderboardLoading = false;
      },
    });
  }
  loadStats(): void {
    this.isLoading = true;

    // ── REAL API call ──────────────────────────────────────────
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.test_scores = stats.test_scores;
        this.courses_done = stats.courses_done;
        this.daily_streak = stats.daily_streak;

        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Dashboard stats loaded:', stats);
      },
      error: (err) => {
        console.error('Dashboard load failed:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
  // ─────────────────────────────────────────────────────────
  // FETCH CURRENT LIVE CLASS
  // ─────────────────────────────────────────────────────────
  loadLiveNow() {
    this.dashboardService.getLiveNowClass().subscribe({
      next: (cls) => {
        // If a class is LIVE
        if (cls) {
          this.liveNowClasses = [
            {
              id: cls.class_id,
              title: cls.title,
              subject_name: cls.subject_name,
              course_name: cls.module_name,
              scheduled_start_time: cls.scheduled_start_time,
              scheduled_end_time: cls.scheduled_end_time,
              duration_minutes: cls.duration_minutes,
              status: cls.status,
            },
          ];
        } else {
          // No class currently live
          this.liveNowClasses = [];
        }

        console.log('Live now class:', cls);
      },
      error: (err) => {
        console.error('Live now error:', err);

        // Fallback → show no class
        this.liveNowClasses = [];
      },
    });
  }
  // ─────────────────────────────────────────────────────────
  // JOIN / RESUME LIVE CLASS
  // ─────────────────────────────────────────────────────────
  joinLiveClass(cls: any) {
    console.log('Joining live class:', cls);

    //  Mark class as "joined" → enables Resume button
    if (!this.resumeClassIds.includes(cls.id)) {
      this.resumeClassIds.push(cls.id);
    }

    // Navigate to live class page
    this.router.navigate(['/student/live-class', cls.id]);
  }
  // Leaderboard
  leaderboardData: any = null;
  isLeaderboardLoading = false;
}
