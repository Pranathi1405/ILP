/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/student/pages/transactions/transaction-history/transaction-history.ts
 * ==========================================================================================
 * Transaction History page component — child route '' of /student/transactions.
 *
 * Responsibilities:
 * 1. Fetch paginated payment history via PaymentService.getPaymentHistory()
 * 2. Display transactions in a table with date, transaction ID, course, amount, method, status
 * 3. Trigger receipt download directly from payment.receipt_url (no secondary API call needed)
 * 4. Handle loading and empty states gracefully
 *
 * Data Flow:
 * PaymentService.getPaymentHistory() → signal → template rendering
 *
 * State Management:
 * - signal() for payments list, pagination, loading states
 *
 * Notes:
 * - receipt_url and receipt_number are returned directly on each payment object
 * - amount comes as string from API ("3998.00") — parsed with parseFloat in template
 * - payment_date is the correct date field (not created_at)
 */

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, SlicePipe, TitleCasePipe } from '@angular/common';
import { PaymentService, Payment } from '../../../../../core/services/payments/payments.service';

@Component({
  selector: 'app-transaction-history',
  imports: [DatePipe, NgClass, SlicePipe, DecimalPipe, TitleCasePipe],
  templateUrl: './transactions-history.html',
})
export class TransactionHistory implements OnInit {
  private paymentService = inject(PaymentService);

  payments = signal<Payment[]>([]);
  pagination = signal({ total: 0, page: 1, limit: 20, total_pages: 1 });
  isLoading = signal(false);

  columns = ['DATE', 'TRANSACTION ID', 'COURSE NAME', 'AMOUNT', 'METHOD', 'STATUS', 'ACTION'];

  currentPage = computed(() => this.pagination().page);
  totalPages = computed(() => this.pagination().total_pages);

  ngOnInit(): void {
    this.loadHistory(1);
  }

  loadHistory(page: number): void {
    this.isLoading.set(true);
    this.paymentService.getPaymentHistory(page).subscribe({
      next: (res) => {
        this.payments.set(res.data);
        this.pagination.set(res.pagination);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onPageChange(page: number): void {
    this.loadHistory(page);
  }

  // receipt_url is returned directly on the payment object — no secondary API call needed
  downloadReceipt(payment: Payment): void {
    if (!payment.receipt_url) return;
    const a = document.createElement('a');
    a.href = payment.receipt_url;
    a.download = `${payment.receipt_number}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  parseAmount(amount: string): number {
    return parseFloat(amount);
  }

  getStatusStyles(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-green-50 text-green-700 border border-green-200',
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      failed: 'bg-red-50 text-red-700 border border-red-200',
      refunded: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
    return map[status?.toLowerCase()] ?? 'bg-slate-100 text-slate-500 border border-slate-200';
  }

  getMethodIcon(method: string | null): 'upi' | 'bank' | 'card' {
    if (!method) return 'card';
    const m = method.toLowerCase();
    if (m.includes('upi')) return 'upi';
    if (m.includes('net') || m.includes('bank')) return 'bank';
    return 'card';
  }
}
