/**
 * AUTHOR: Umesh Teja Peddi
 * Result Component
 * ----------------
 * Shows payment success / failure / pending based on signal from PaymentService.
 * Guards against direct navigation.
 * On retry (failure): navigates back to checkout (same courseId/planId).
 * On success: can start learning or view receipt.
 * Clears session on leave.
 */

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payments/payments.service';
import { CheckoutSessionData, PaymentResult } from '../payments.types';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [],
  templateUrl: './result.html',
})
export class ResultComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);

  result = signal<PaymentResult | null>(null);
  session = signal<CheckoutSessionData | null>(null);
  orderId = signal<number | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);
  receiptLoading = signal(false);
  receiptError = signal<string | null>(null);

  isSuccess = computed(() => this.result() === 'success');
  isFailed = computed(() => this.result() === 'failed');
  isPending = computed(() => this.result() === 'pending');

  ngOnInit(): void {
    const routeOrderIdParam = this.route.snapshot.paramMap.get('orderId');
    const routeOrderId = routeOrderIdParam ? parseInt(routeOrderIdParam, 10) : null;
    const result = this.paymentService.paymentResult();
    const session = this.paymentService.checkoutSession();
    const storedOrderId = this.paymentService.resultOrderId();
    const orderId = routeOrderId || storedOrderId || session?.orderId;

    if (!orderId) {
      this.router.navigate(['/student/browse']);
      return;
    }

    this.orderId.set(orderId);

    if (session && session.orderId === orderId) {
      this.session.set(session);
    }

    const useCachedResult =
      result != null &&
      storedOrderId === orderId &&
      session?.orderId === orderId &&
      routeOrderId == null;

    if (useCachedResult) {
      this.result.set(result);
    }

    this.loadOrderStatus(orderId);
  }

  private loadOrderStatus(orderId: number): void {
    this.error.set(null);

    this.paymentService.getOrderStatus(orderId).subscribe({
      next: ({ data }) => {
        const status =
          data.status === 'paid'
            ? 'success'
            : data.status === 'failed' || data.status === 'expired' || data.status === 'cancelled'
              ? 'failed'
              : 'pending';

        this.result.set(status);
        this.paymentService.setResult(status, orderId);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not load payment status.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    // Don't clear here — goToLearning() and backToCourses() clear explicitly.
    // Failure keeps session alive so retry() can reuse courseId/planId.
  }

  goToLearning(): void {
    const courseId = this.session()?.courseId;
    this.paymentService.clearSession();
    this.router.navigate(['/student/my-courses']);
  }

  backToCourses(): void {
    this.paymentService.clearSession();
    this.router.navigate(['/student/browse']);
  }

  retry(): void {
    const session = this.session();
    if (!session) return;
    this.paymentService.paymentResult.set(null);
    this.paymentService.resultOrderId.set(null);
    this.router.navigate(['/student/payments/checkout', session.courseId], {
      queryParams: { planId: session.planId },
    });
  }

  checkStatus(): void {
    const orderId = this.orderId();
    if (!orderId) return;

    this.paymentService.getOrderStatus(orderId).subscribe({
      next: ({ data }) => {
        if (data.status === 'paid') {
          this.result.set('success');
          this.paymentService.setResult('success', orderId);
        } else if (
          data.status === 'failed' ||
          data.status === 'expired' ||
          data.status === 'cancelled'
        ) {
          this.result.set('failed');
          this.paymentService.setResult('failed', orderId);
        }
        // still pending → show same page, user can retry later
      },
      error: (err) => {
        this.receiptError.set(err?.error?.message ?? 'Could not fetch order status.');
      },
    });
  }

  viewReceipt(): void {
    const orderId = this.orderId();

    if (!orderId) {
      this.router.navigate(['/student/payments']);
      return;
    }

    this.receiptLoading.set(true);
    this.receiptError.set(null);

    // Look up the payment_id from payment history using orderId,
    // then fetch the receipt using the internal payment_id.
    this.paymentService.getPaymentHistory().subscribe({
      next: ({ data }) => {
        const payment = data.find((p: any) => p.order_id === orderId);

        if (!payment) {
          this.receiptLoading.set(false);
          this.receiptError.set('Receipt not ready yet. Please check Payment History shortly.');
          return;
        }

        this.paymentService.getReceipt(payment.payment_id).subscribe({
          next: ({ data: receipt }) => {
            this.receiptLoading.set(false);
            window.open(receipt.receipt_url, '_blank');
          },
          error: (err) => {
            this.receiptLoading.set(false);
            this.receiptError.set(
              err?.error?.message ?? 'Receipt not ready yet. Please check Payment History shortly.',
            );
          },
        });
      },
      error: () => {
        this.receiptLoading.set(false);
        this.receiptError.set('Could not load payment details. Please try again.');
      },
    });
  }
}
