/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-announcements/announcements-navbar/announcements-navbar.ts
 * =================================================================================================
 * Navbar component for the Admin Announcements module.
 *
 * Responsibilities:
 * 1. Provide navigation controls for announcements pages
 * 2. Handle navigation to Create Announcement screen
 *
 * Pattern:
 * UI Action → Router Navigation
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-announcements-navbar',
  standalone: true,
  imports: [],
  templateUrl: './announcements-navbar.html',
})
export class AnnouncementsNavbar {
  private readonly router = inject(Router);

  navigateToCreate(): void {
    this.router.navigate(['/admin/announcements/create']);
  }
}
