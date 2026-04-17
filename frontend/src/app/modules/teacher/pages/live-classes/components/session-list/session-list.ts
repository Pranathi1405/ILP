// Author: Poojitha
// Live-Studio-Page - Session List Component

import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { SessionCard } from '../session-card/session-card';
import { LiveClass } from '../../models/live-class.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [SessionCard, CommonModule, FormsModule],
  templateUrl: './session-list.html',
})
export class SessionList implements OnInit {

  allSessions = signal<LiveClass[]>([]);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('All');
  selectedTab = signal<'upcoming' | 'past'>('upcoming');
  sortBy = signal<'date' | 'title'>('date');
  isSearching = signal(false);

  constructor(private liveClassService: LiveClassService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.fetchSessions();
  }

  // Map backend response to UI model
  mapSession(item: any): LiveClass {
    const start = new Date(item.scheduled_start_time);

    return {
      id: item.class_id,
      title: item.title,
      subject: item.subject_name,
      course: item.course_name,
      module: item.module_name,
      status: item.status?.toLowerCase() || 'scheduled',
      date: start.toISOString().split('T')[0],
      time: start.toTimeString().slice(0, 5),
    };
  }

  filteredSessions = computed(() => {
    let sessions = this.allSessions();

    // Status filter
    if (this.selectedStatus() !== 'All') {
      sessions = sessions.filter(
        (s) => s.status === this.selectedStatus().toLowerCase()
      );
    }

    // Sorting 
    sessions = [...sessions].sort((a, b) => {
      if (this.sortBy() === 'date') {
        return new Date(`${a.date}T${a.time}`).getTime() -
          new Date(`${b.date}T${b.time}`).getTime();
      }
      return a.title.localeCompare(b.title);
    });

    return sessions;
  });

  // Delete session
  handleDelete(id: string) {
    this.liveClassService.deleteClass(id).subscribe(() => {
      this.fetchSessions();
    });
  }
  //start session
  handleStart(id: string) {
    console.log('Starting class with id:', id);

    this.liveClassService.startClass(id).subscribe({
      next: () => {
        console.log('Class started');

        //  Update UI
        this.allSessions.update(sessions =>
          sessions.map(s =>
            s.id === id ? { ...s, status: 'live' } : s
          )
        );

        //  Navigate to ZEGO page (NEW FLOW)
        this.router.navigate(['/live-session', id], {
          queryParams: { role: 'teacher' }
        });

      },

      error: (err) => {
        console.error('Start class error:', err);
      }
    });
  }

  //resume session
  handleResume(id: string) {
    // console.log('Resuming class with id:', id);

    this.liveClassService.resumeClass(id).subscribe({
      next: () => {
        console.log('Class resumed');

        // Update UI (optional but good)
        this.allSessions.update(sessions =>
          sessions.map(s =>
            s.id === id ? { ...s, status: 'live' } : s
          )
        );

        // Navigate to ZEGO page (same as start)
        this.router.navigate(['/live-session', id], {
          queryParams: { role: 'teacher' }
        });
      },

      error: (err) => {
        console.error('Resume class error:', err);
      }
    });
  }


  // Fetch sessions (upcoming/past)
  fetchSessions() {
    this.liveClassService.getClasses(this.selectedTab()).subscribe({
      next: (res) => {
        const mapped = res.data.map((item: any) => this.mapSession(item));
        this.allSessions.set(mapped);
      },
      error: (err) => {
        console.error('Failed to fetch classes', err);
      }
    });
  }

  // Tab change
  changeTab(tab: 'upcoming' | 'past') {
    this.selectedTab.set(tab);
    this.fetchSessions();
  }

  // Search
  onSearchChange(value: string) {
    this.searchTerm.set(value);

    if (!value.trim()) {
      this.isSearching.set(false);
      this.fetchSessions();
      return;
    }

    this.isSearching.set(true);

    this.liveClassService.searchClasses(value, this.selectedTab()).subscribe({
      next: (res) => {
        //console.log('Search result:', res);
        const mapped = res.map((item: any) => this.mapSession(item));
        this.allSessions.set(mapped);
      }
    });
  }
}

