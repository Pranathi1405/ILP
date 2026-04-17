// Author: Poojitha
// Schedule Class Page - Session Summary Component

import { Component, Input } from '@angular/core';
import { LiveClassStateService } from '../../services/live-class-state.service';
import { Router } from '@angular/router';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';

@Component({
  selector: 'app-session-summary',
  imports: [],
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.css',
})
export class SessionSummary {
  @Input() editId: string | null = null;

  summaryItems = [
    { label: 'Session Title', value: 'Not selected' },
    { label: 'course', value: 'Not selected' },
    { label: 'Subject', value: 'Not selected' },
    { label: 'Module', value: 'Not selected' },
    { label: 'Date', value: 'Not selected' },
    { label: 'Start Time', value: 'Not selected' },
    { label: 'Duration', value: 'Not selected' },
  ];

  isFormValid = false;
  session: any = {};

  constructor(
    private state: LiveClassStateService,
    private liveClassService: LiveClassService,
    private router: Router
  ) {

    this.state.sessionData$.subscribe((data) => {
      this.session = data; // used for API payload

      this.summaryItems[0].value = data.title || 'Not selected';
      this.summaryItems[1].value = data.course_name || 'Not selected';
      this.summaryItems[2].value = data.subject_name || 'Not selected';
      this.summaryItems[3].value = data.module_name || 'Not selected';
      this.summaryItems[4].value = data.date || 'Not selected';
      this.summaryItems[5].value = data.time || 'Not selected';
      this.summaryItems[6].value = data.duration || 'Not selected';

      this.isFormValid =
        data.title &&
        Number(data.course) &&
        Number(data.subject) &&
        Number(data.module) &&
        data.date &&
        data.time &&
        data.duration;
    });
  }

  confirmSchedule() {
    const start = new Date(`${this.session.date}T${this.session.time}`);

    const payload: any = {
      title: this.session.title,
      course_id: Number(this.session.course),
      subject_id: Number(this.session.subject),
      module_id: Number(this.session.module),
      scheduled_start_time: start.toISOString(),
      scheduled_end_time: new Date(
        start.getTime() + Number(this.session.duration) * 60000
      ).toISOString(),
      duration_minutes: Number(this.session.duration),
    };

    // console.log('FINAL PAYLOAD:', payload);

    // EDIT MODE
    if (this.editId) {
      this.liveClassService.updateLiveClass(this.editId, payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.router.navigate(['/teacher/live-studio']);
          }
        },
        error: (err) => {
          alert(err?.error?.message || 'Update failed');
        },
      });
    }

    // CREATE MODE
    else {
      this.liveClassService.scheduleLiveClass(payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.router.navigate(['/teacher/live-studio']);
          }
        },
        error: (err) => {
          alert(err?.error?.message || 'Create failed');
        },
      });
    }
  }
}
