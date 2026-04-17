/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/student/pages/transactions/student-transactions.ts
 * ==========================================================================================
 * Student Transactions container component — parent route /student/transactions.
 *
 * Responsibilities:
 * 1. Render the transactions-selector tab switcher
 * 2. Navigate between Transaction History ('') and My Courses ('mycourses') child routes
 * 3. Keep the active tab in sync with the current URL
 *
 * Architecture Pattern:
 * Tab click → Router.navigate() → child route activated → component rendered in <router-outlet>
 *
 * State Handling:
 * - signal() for activeTab, synced from NavigationEnd router events
 */

import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import {
  TransactionsSelector,
  TransactionTab,
} from './transactions-selector/transactions-selector';

@Component({
  selector: 'app-student-transactions',
  imports: [RouterOutlet, TransactionsSelector],
  templateUrl: './student-transactions.html',
})
export class StudentTransactions implements OnInit, OnDestroy {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  activeTab = signal<TransactionTab>('history');

  ngOnInit(): void {
    this.syncTabFromUrl();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.syncTabFromUrl());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncTabFromUrl(): void {
    const url = this.router.url;
    this.activeTab.set(url.includes('mycourses') ? 'mycourses' : 'history');
  }

  onTabChange(tab: TransactionTab): void {
    this.activeTab.set(tab);
    const path = tab === 'mycourses' ? ['mycourses'] : ['.'];
    this.router.navigate(path, { relativeTo: this.activatedRoute });
  }
}
