/**
 * AUTHOR: Umesh Teja Peddi
 * Processing Component
 * --------------------
 * Shown after Razorpay handler fires (user submitted payment).
 * Polls GET /payments/orders/:orderId until status is resolved.
 * Redirects to /payments/result when done.
 * Guards against direct navigation (no session → back to checkout).
 */

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payments/payments.service';

@Component({
  selector: 'app-processing',
  standalone: true,
  imports: [],
  templateUrl: './processing.html',
})
export class ProcessingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);

  progress = signal(0);
  statusLabel = signal('CONNECTING TO GATEWAY');

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private pollCount = 0;
  private readonly MAX_POLLS = 20; // ~40s total

  private readonly stages = [
    { threshold: 20, label: 'VERIFYING GATEWAY' },
    { threshold: 45, label: 'CONFIRMING PAYMENT' },
    { threshold: 70, label: 'SECURING ENROLLMENT' },
    { threshold: 90, label: 'FINALIZING ORDER' },
  ];

  ngOnInit(): void {
    const session = this.paymentService.checkoutSession();
    const routeOrderId = parseInt(this.route.snapshot.paramMap.get('orderId') ?? '0', 10);
    const orderId = routeOrderId || session?.orderId;

    if (!orderId) {
      this.router.navigate(['/student/browse']);
      return;
    }

    this.startProgressAnimation();
    this.startPolling(orderId);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private startProgressAnimation(): void {
    // Animate from 0 → 90 slowly (final 100 only on resolve)
    this.progressInterval = setInterval(() => {
      this.progress.update((p) => {
        const next = p + 0.8;
        if (next >= 90) {
          clearInterval(this.progressInterval!);
          return 90;
        }
        const stage = [...this.stages].reverse().find((s) => next >= s.threshold);
        if (stage) this.statusLabel.set(stage.label);
        return Math.round(next);
      });
    }, 300);
  }

  private startPolling(orderId: number): void {
    // First poll after 3s (give webhook time to process)
    setTimeout(() => {
      this.poll(orderId);
      this.pollInterval = setInterval(() => {
        this.poll(orderId);
      }, 2000);
    }, 3000);
  }

  private poll(orderId: number): void {
    this.pollCount++;

    this.paymentService.getOrderStatus(orderId).subscribe({
      next: ({ data }) => {
        // Backend returns lowercase statuses
        if (data.status === 'paid') {
          this.resolve('success', orderId);
        } else if (
          data.status === 'failed' ||
          data.status === 'expired' ||
          data.status === 'cancelled'
        ) {
          this.resolve('failed', orderId);
        } else if (this.pollCount >= this.MAX_POLLS) {
          this.resolve('pending', orderId);
        }
        // 'pending' → keep polling
      },
      error: () => {
        if (this.pollCount >= this.MAX_POLLS) {
          this.resolve('pending', orderId);
        }
      },
    });
  }

  private resolve(result: 'success' | 'failed' | 'pending', orderId: number): void {
    this.clearTimers();
    this.paymentService.setResult(result, orderId);
    this.progress.set(100);
    this.statusLabel.set(result === 'success' ? 'ENROLLMENT CONFIRMED' : 'PROCESSING COMPLETE');

    setTimeout(() => {
      this.router.navigate(['/student/payments/result', orderId]);
    }, 600);
  }

  private clearTimers(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
  }
}
