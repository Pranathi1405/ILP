// Author: Poojitha
// Schedule-Class Page Main Component

import { Component } from '@angular/core';
import { SessionSummary } from '../../components/session-summary/session-summary';
import { ChecklistCard } from '../../components/checklist-card/checklist-card';
import { SessionDetails } from '../../components/session-details/session-details';
import { ActivatedRoute, Router } from '@angular/router';
import { LiveClassStateService } from '../../services/live-class-state.service';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';

@Component({
  selector: 'app-schedule-class',
  imports: [
    SessionSummary,
    ChecklistCard,
    SessionDetails
  ],
  templateUrl: './schedule-class.html',
  styleUrl: './schedule-class.css',
})
export class ScheduleClass {

  editId: string | null = null;
  selectedSession: any;

  constructor(
    private state: LiveClassStateService,
    private router: Router,
    private route: ActivatedRoute,
    private liveClassService: LiveClassService
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    // Reset state for create mode
    this.state.updateSession({
      title: '',
      course: '',
      course_name: '',
      subject: '',
      subject_name: '',
      module: '',
      module_name: '',
      date: '',
      time: '',
      duration: '',
      settings: {
        chat: true,
        record: true,
        handRaise: false,
        polls: false
      }
    });

    // EDIT MODE
    if (id) {
      this.editId = id;

      this.liveClassService.getLiveClassById(id).subscribe((res: any) => {
        const data = res.data;

        if (!data) return;

        const start = new Date(data.scheduled_start_time);
        
        // Extract date (YYYY-MM-DD) and time (HH:mm) from Date object with leading zeros
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, '0');
        const dd = String(start.getDate()).padStart(2, '0');

        const hours = String(start.getHours()).padStart(2, '0');
        const minutes = String(start.getMinutes()).padStart(2, '0');

        this.selectedSession = {
          title: data.title,
          course: data.course_name,
          subject: data.subject_name,
          module: data.module_name,
          date: `${yyyy}-${mm}-${dd}`,
          time: `${hours}:${minutes}`,
          duration: data.duration_minutes,
        };
      });
    }
  }

  goBack() {
    this.router.navigate(['/teacher/live-studio']);
  }
}
