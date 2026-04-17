// Author: Poojitha
// Live-Studio-Page - Session Card Component

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LiveClass } from '../../models/live-class.model';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-session-card',
  imports: [CommonModule],
  templateUrl: './session-card.html',
  styleUrl: './session-card.css',
})
export class SessionCard {
  @Input() session!: LiveClass;
   @Output() onDelete = new EventEmitter<string>();
  @Output() onStart = new EventEmitter<string>(); 
  @Output() resume = new EventEmitter<string>();

  // sessionId: number = 0;
  constructor(
    // private state: LiveClassStateService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }
  startBroadcast() {
    console.log('Start broadcast clicked', this.session);
    // this.state.startBroadcast(this.session.id);
    this.onStart.emit(this.session.id); // send to parent
  }
  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  editSession() {
    this.router.navigate(['schedule-class', this.session.id], {
      relativeTo: this.route,
    });
  }

  deleteSession() {
    const confirmDelete = confirm('Are you sure you want to delete this session?');
    if (!confirmDelete) return;
    // this.state.deleteSession(this.session.id);
    this.onDelete.emit(this.session.id);
  }
}
