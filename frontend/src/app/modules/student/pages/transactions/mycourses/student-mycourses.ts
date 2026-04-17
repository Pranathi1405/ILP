/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/student/pages/transactions/my-courses/my-courses.ts
 * ==========================================================================================
 * My Courses (Purchases) page component — child route 'mycourses' of /student/transactions.
 *
 * Responsibilities:
 * 1. Fetch student purchases via PaymentService.getMyPurchases()
 * 2. Separate purchases into active and expired groups via computed()
 * 3. Display course cards with thumbnail, plan badge, purchase date
 * 4. Navigate to course curriculum on "View Curriculum" click
 *
 * Data Flow:
 * PaymentService.getMyPurchases() → signal → computed active/expired → template
 *
 * State Management:
 * - signal() for raw purchases list and loading
 * - computed() for active/expired grouping using purchase.status from API
 *
 * Notes:
 * - status field ("active" | "expired") comes directly from backend
 * - thumbnail_url, purchase_date, plan_name are all present in API response
 * - Teacher names are not returned by /me/purchases — shown as "Teacher" placeholder
 */

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PaymentService, Purchase } from '../../../../../core/services/payments/payments.service';

@Component({
  selector: 'app-my-courses',
  imports: [DatePipe],
  templateUrl: './student-mycourses.html',
})
export class MyCourses implements OnInit {
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  purchases = signal<Purchase[]>([]);
  isLoading = signal(false);

  // status field returned directly from API — no date comparison needed
  activePurchases = computed(() => this.purchases().filter((p) => p.status === 'active'));

  expiredPurchases = computed(() => this.purchases().filter((p) => p.status !== 'active'));

  ngOnInit(): void {
    this.isLoading.set(true);
    this.paymentService.getMyPurchases().subscribe({
      next: (res) => {
        this.purchases.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  viewCurriculum(courseId: number): void {
    this.router.navigate(['/student/my-courses/course-player']);
  }

  browseCourses(): void {
    this.router.navigate(['/student/browse']);
  }
}
