import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance-recent-transactions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="rounded-[28px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)]"
    >
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-900">
            Recent Transactions
          </p>
          <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">Latest 10 payments</p>
        </div>

        <!-- NEW BUTTON -->
        <button
          class="rounded-full bg-indigo-50 px-4 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.08em] text-indigo-600 hover:bg-indigo-100"
        >
          View All
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-sm">
          <thead>
            <tr
              class="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-widest text-slate-500"
            >
              <th class="pl-6 pb-3">Date</th>
              <th class="pb-3">Student</th>
              <th class="pb-3">Course / Plan</th>
              <th class="pb-3">Amount</th>
              <th class="pb-3">Status</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            @for (tx of transactions; track tx.paymentId || $index) {
              <tr class="hover:bg-slate-50">
                <td class="py-4 font-medium text-slate-600">
                  {{ tx.date | date: 'dd MMM yyyy' }}
                </td>
                <td class="py-4">{{ tx.studentName }}</td>
                <td class="py-4 text-slate-700">{{ tx.courseName }}</td>
                <td class="py-4 font-semibold text-emerald-600">
                  ₹{{ tx.amount.toLocaleString('en-IN') }}
                </td>

                <!-- STATUS ONLY -->
                <td class="py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    [class]="
                      tx.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : tx.status === 'failed'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    "
                  >
                    {{ tx.status | titlecase }}
                  </span>
                </td>
              </tr>
            }

            @if (transactions.length === 0) {
              <tr>
                <td colspan="5" class="py-12 text-center text-slate-400 font-medium">
                  No transactions found
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </article>
  `,
})
export class FinanceRecentTransactionsComponent {
  @Input() transactions: any[] = [];
}
