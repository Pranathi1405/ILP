/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-announcements/admin-announcements.ts – Admin Announcements Container
 * =====================================================================================================
 * Container component that orchestrates the Admin Announcements module.
 *
 * Responsibilities:
 * 1. Initialize announcements data via AnnouncementsService
 * 2. Control tab-based filtering state (All / Status-based)
 * 3. Detect child routes (create/edit) to toggle layout rendering
 * 4. React to router navigation changes safely using auto-destroy subscriptions
 * 5. Provide filtered announcements data to child presentation components
 *
 * Pattern:
 * Service State → Signals/Models → Computed Filtering → Child Components
 *
 * Notes:
 * - Uses Angular signals (model + computed) for reactive UI updates
 * - takeUntilDestroyed ensures automatic cleanup (no manual unsubscribe)
 * - Acts as a smart/container component; UI handled by child components
 */

import { Component, computed, model, inject, OnInit, DestroyRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnnouncementsNavbar } from './announcements-navbar/announcements-navbar';
import { AnnouncementsTabs } from './announcements-tabs/announcements-tabs';
import { AnnouncementsTable } from './announcements-table/announcements-table';
import {
  AnnouncementsService,
  AnnouncementStatus,
} from '../../../../core/services/admin/announcements/announcements.service';

export type TabFilter = 'all' | AnnouncementStatus;

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [RouterOutlet, AnnouncementsNavbar, AnnouncementsTabs, AnnouncementsTable],
  templateUrl: './admin-announcements.html',
})
export class AdminAnnouncements implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  announcementsService = inject(AnnouncementsService);

  activeTab = model<TabFilter>('all');
  isChildRoute = false;

  ngOnInit(): void {
    this.announcementsService.init();
    this.checkRoute(this.router.url);
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => this.checkRoute(event.urlAfterRedirects));
  }

  private checkRoute(url: string): void {
    this.isChildRoute = url.includes('/create') || url.includes('/edit');
  }

  filteredAnnouncements = computed(() => {
    const all = this.announcementsService.announcements();
    if (this.activeTab() === 'all') return all;
    return all.filter((a) => a.status === this.activeTab());
  });
}
