/* author: Pranathi
description : it is a side bar component that manages the navigation part */

import {
  Component,
  signal,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import {
  SidebarItem,
  STUDENT_SIDEBAR,
  TEACHER_SIDEBAR,
  PARENT_SIDEBAR,
} from '../../configs/sidebar.config';

import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ReactiveFormsModule } from '@angular/forms';

// ✅ FIXED: use shared service
import { SharedSettingsService } from '../settings/shared-settings.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  navItems: SidebarItem[] = [];
  @Input() role!: 'student' | 'teacher' | 'parent';
  user: any;

  private router = inject(Router);
  private routerSub!: Subscription;

  constructor(
    private authservice: AuthService,
    private toastr: ToastrService,
    private settingservice: SharedSettingsService, // ✅ FIXED
    private cdr: ChangeDetectorRef,
  ) {}

  activeItem = signal<string>('dashboard');

  ngOnInit(): void {
    if (this.role === 'student') {
      this.navItems = STUDENT_SIDEBAR;
    } else if (this.role === 'teacher') {
      this.navItems = TEACHER_SIDEBAR;
    } else if (this.role === 'parent') {
      this.navItems = PARENT_SIDEBAR;
    }

    // ✅ Load profile (works for all roles now)
    this.settingservice.getProfile().subscribe((res) => {
      this.user = res;
      this.cdr.detectChanges();
    });

    // Sync on initial load
    this.syncActiveFromUrl(this.router.url);

    // Sync on every navigation
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.syncActiveFromUrl(e.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private syncActiveFromUrl(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];

    const exactMatch = this.navItems.find(
      (item) => cleanUrl === item.route || cleanUrl === item.route + '/',
    );
    if (exactMatch) {
      this.activeItem.set(exactMatch.key);
      return;
    }

    const childMatch = this.navItems.find((item) =>
      item.childRoutes?.some((child) => cleanUrl.startsWith(child)),
    );
    if (childMatch) {
      this.activeItem.set(childMatch.key);
      return;
    }

    const prefixMatch = this.navItems
      .filter((item) => {
        const segments = item.route.replace(/^\//, '').split('/');
        return segments.length > 1;
      })
      .find((item) => cleanUrl.startsWith(item.route));

    if (prefixMatch) {
      this.activeItem.set(prefixMatch.key);
      return;
    }

    const rootItem = this.navItems.find((item) => {
      const segments = item.route.replace(/^\//, '').split('/');
      return segments.length === 1 && cleanUrl.startsWith(item.route);
    });

    if (rootItem) {
      this.activeItem.set(rootItem.key);
      return;
    }

    if (this.navItems.length > 0) {
      this.activeItem.set(this.navItems[0].key);
    }
  }

  setActive(item: SidebarItem): void {
    this.activeItem.set(item.key);
  }

  onSubmit() {
    this.authservice.Logout().subscribe({
      next: (res) => {
        console.log('Logout response:', res);
        this.authservice.logout();
        this.toastr.success(res.message);
      },
      error: () => {
        this.authservice.logout();
      },
    });
  }
}
