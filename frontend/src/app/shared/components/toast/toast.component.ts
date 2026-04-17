/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/core/shared/components/toast/toast.component.ts
 *
 * Renders the global toast stack in the top-right corner.
 * Add <app-toast /> once inside admin.page.html.
 */

import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../core/services/notifications/toast.service';
import { Router } from '@angular/router';

// Reuse the same icon map from notifications.ts
const TYPE_ICONS: Record<string, string> = {
  payment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M21 12h-3M6 12H3M12 3V0M12 24v-3"/></svg>`,
  announcement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  enrollment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
  teacher_notification: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  course: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  achievement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
};

const TYPE_ICON_STYLES: Record<string, string> = {
  payment: 'bg-orange-50 text-orange-500',
  system: 'bg-slate-100 text-slate-500',
  announcement: 'bg-blue-50 text-blue-600',
  enrollment: 'bg-green-50 text-green-500',
  teacher_notification: 'bg-cyan-50 text-cyan-500',
  course: 'bg-blue-50 text-blue-500',
  achievement: 'bg-amber-50 text-amber-500',
};

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  toastService = inject(ToastService);
  router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  goToNotifications() {
    const role = this.router.url.split('/')[1];
    this.router.navigate([`${role}/notifications`]);
  }

  getIcon(type: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(TYPE_ICONS[type] ?? TYPE_ICONS['system']);
  }

  getIconStyle(type: string): string {
    return TYPE_ICON_STYLES[type] ?? 'bg-slate-100 text-slate-500';
  }
}
