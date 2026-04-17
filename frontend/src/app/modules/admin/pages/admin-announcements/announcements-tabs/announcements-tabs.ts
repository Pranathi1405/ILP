/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-announcements/announcements-tabs/announcements-tabs.ts – Announcement Tabs Controller
 * ======================================================================================================================
 * Presentational component that manages tab selection for announcement filtering.
 *
 * Responsibilities:
 * 1. Define available announcement filter tabs
 * 2. Maintain currently selected tab using Angular model signal
 * 3. Emit tab changes through two-way binding with parent component
 * 4. Map UI labels directly to backend AnnouncementStatus ENUM values
 *
 * Pattern:
 * Tab Click → model signal update → parent binding → filtered data update
 *
 * Notes:
 * - Stateless UI controller (no service interaction)
 * - Parent component handles actual filtering logic
 * - Keys must match backend enum values exactly
 */

import { Component, model } from '@angular/core';
import { TabFilter } from '../admin-announcements';

@Component({
  selector: 'app-announcements-tabs',
  standalone: true,
  imports: [],
  templateUrl: './announcements-tabs.html',
})
export class AnnouncementsTabs {
  activeTab = model<TabFilter>('all');

  // Labels map to exact backend ENUM values
  tabs: { label: string; key: TabFilter }[] = [
    { label: 'All', key: 'all' },
    { label: 'Broadcasted', key: 'broadcasted' },
    { label: 'Scheduled', key: 'scheduled' },
    { label: 'Drafts', key: 'draft' },
    { label: 'Edited', key: 'edited' },
    { label: 'Deactivated', key: 'deactivated' },
  ];

  select(key: TabFilter): void {
    this.activeTab.set(key);
  }
}
