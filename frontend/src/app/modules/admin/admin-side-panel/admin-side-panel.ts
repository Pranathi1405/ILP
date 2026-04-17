/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Admin Side Panel Component
 * --------------------------
 * Renders the persistent navigation for the Admin module and
 * keeps the selected item aligned with the current route.
 *
 * Purpose:
 * Centralizes admin navigation and exposes the logout action
 * from a single layout-level component.
 *
 * Usage:
 * Used inside the admin page shell as the left-side navigation.
 */

import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

interface NavItem {
  label: string;
  key: string;
  route: string;
}

@Component({
  selector: 'app-admin-side-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-side-panel.html',
  styleUrl: './admin-side-panel.css',
})
export class AdminSidePanel implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  activeItem = signal<string>('command-center');

  navItems: NavItem[] = [
    { label: 'Command Center', key: 'command-center', route: '/admin' },
    { label: 'User Management', key: 'user-management', route: '/admin/user-management' },
    { label: 'Course Management', key: 'course-management', route: '/admin/course-management' },
    { label: 'Financials', key: 'financials', route: '/admin/financials' },
    { label: 'Announcements', key: 'announcements', route: '/admin/announcements' },
    { label: 'Settings', key: 'settings', route: '/admin/settings' },
  ];

  ngOnInit(): void {
    this.syncActiveFromUrl(this.router.url);

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e: NavigationEnd) => this.syncActiveFromUrl(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {}

  private syncActiveFromUrl(url: string): void {
    const matched = this.navItems
      .slice()
      .reverse()
      .find((item) => url.startsWith(item.route));

    if (matched) {
      this.activeItem.set(matched.key);
    }
  }

  setActive(item: NavItem): void {
    this.activeItem.set(item.key);
  }

  logout(): void {
    this.authService.Logout().subscribe({
      next: (response) => {
        this.authService.logout();
        this.toastr.success(response.message);
      },
      error: () => {
        this.authService.logout();
      },
    });
  }
}
