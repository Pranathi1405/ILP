/* 
  Author: Pranathi
  Description:
  Teacher Dashboard component. Fetches real data from:
    
    - GET /analytics/teacher/courses    → My Courses table
    - GET /live-classes?type=upcoming   → Incoming stream banner
  Falls back to mock data if any API fails.
*/

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  TeacherDashboardService,
  TeacherDashboardViewModel,
} from '../../../../core/services/teacher/teacher-dashboard.service';
import {
  TeacherDashboardStats,
  TeacherCourse,
  UpcomingLiveClass,
} from '../../../../core/services/teacher/teacher-dashboard.data';
import { LiveClassService } from '../../../../core/services/liveClasses/live-class.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class TeacherDashboardComponent implements OnInit {
  // inject() pattern — no constructor injection per project rules
  private service = inject(TeacherDashboardService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private liveClassService = inject(LiveClassService);

  // --- State flags ---
  isLoading = true;
  hasError = false;

  // --- Data properties bound in template ---
  stats: TeacherDashboardStats | null = null;
  courses: TeacherCourse[] = [];
  nextClass: UpcomingLiveClass | null = null;
  classTimeLabel = ''; // formatted time string for the banner
  // can_go_live: boolean = false; // flag to control "Go Live Now" button visibility
  can_go_live?: boolean;


  ngOnInit(): void {
    this.loadDashboard();
  }

  /** Calls the service which fires all 3 APIs in parallel */
  loadDashboard(): void {
    this.isLoading = true;
    this.hasError = false;

    this.service.getDashboardViewModel().subscribe({
      next: (vm: TeacherDashboardViewModel) => {
        this.stats = vm.stats;
        this.courses = vm.courses;
        this.nextClass = vm.nextClass;

        // Format the time label for "Incoming stream" banner
        if (vm.nextClass?.scheduled_start_time) {
          this.classTimeLabel = this.service.formatClassTime(vm.nextClass.scheduled_start_time);
        }

        //  Fetch reminder API (for Incoming Stream Banner)
        this.liveClassService.getTeacherReminder().subscribe({
          next: (res) => {
            console.log('Reminder API response:', res);
            if (res?.success && res?.data?.has_reminder) {
              this.nextClass = res.data.next_class;

              if (this.nextClass?.scheduled_start_time) {
                this.classTimeLabel = this.service.formatClassTime(
                  this.nextClass.scheduled_start_time
                );
              }
            }
          },
          error: () => {
            console.warn('Reminder API failed, keeping fallback data');
          },
        });


        this.isLoading = false;
        this.cdr.detectChanges(); // trigger change detection after API response
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Retry button handler — re-fires all API calls */
  retry(): void {
    this.loadDashboard();
  }

  goLiveNow(): void {
    console.log('Go Live Clicked');
    this.router.navigate(['/teacher/live-studio']);
  }

 
}
