import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  notificationsService = inject(NotificationsService);

  ngOnInit(): void {
    this.notificationsService.fetchUnreadCount().subscribe();
  }

  openNotifications(): void {
    const role = this.router.url.split('/')[1];
    this.router.navigate([`/${role}/notifications`]);
  }

  // ← Reused from admin exactly
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  });
}
