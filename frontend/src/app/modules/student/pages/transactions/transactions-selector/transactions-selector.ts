/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/student/pages/transactions/transactions-selector/transactions-selector.ts
 * ==========================================================================================
 * Tab selector component for the Transactions page.
 *
 * Responsibilities:
 * 1. Render two tab options: Transaction History and My Courses
 * 2. Emit activeTabChange when user switches tabs
 * 3. Pure presentational component — no routing or API logic
 *
 * Communication Pattern:
 * - Receives activeTab via input()
 * - Emits activeTabChange on tab click
 */

import { Component, input, output } from '@angular/core';

export type TransactionTab = 'history' | 'mycourses';

@Component({
  selector: 'app-transactions-selector',
  templateUrl: './transactions-selector.html',
})
export class TransactionsSelector {
  activeTab = input<TransactionTab>('history');
  activeTabChange = output<TransactionTab>();

  tabs: { label: string; value: TransactionTab }[] = [
    { label: 'Transaction History', value: 'history' },
    { label: 'My Courses', value: 'mycourses' },
  ];

  onTabClick(tab: TransactionTab): void {
    this.activeTabChange.emit(tab);
  }
}
