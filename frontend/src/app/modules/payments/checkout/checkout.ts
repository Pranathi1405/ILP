/**
 * AUTHOR: Umesh Teja Peddi
 * Checkout Component
 * ------------------
 * Loads course, user profile, and plans in parallel.
 * Guards against already-purchased courses.
 * On Pay — calls create-order, opens Razorpay popup,
 * then navigates to /payments/processing with session stored in PaymentService.
 */

import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PaymentService, CourseDetails } from '../../../core/services/payments/payments.service';
import { Plan, CheckoutSessionData } from '../payments.types';
import { RazorpayLoaderService } from '../../../core/services/payments/razorpay-loader.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [],
  templateUrl: './checkout.html',
})
export class CheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private destroyRef = inject(DestroyRef);
  private razorpayLoader = inject(RazorpayLoaderService);

  // ── Route params ──────────────────────────────────────────────
  courseId = signal<number>(0);

  // ── Data ──────────────────────────────────────────────────────
  course = signal<CourseDetails | null>(null);
  plans = signal<Plan[]>([]);
  userName = signal('');
  userEmail = signal('');
  userPhone = signal('');

  // ── UI state ──────────────────────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  payLoading = signal(false);
  agreedToTerms = signal(false);
  selectedPlanId = signal<number | null>(null);

  // ── Computed price breakdown ──────────────────────────────────
  selectedPlan = computed(
    () => this.plans().find((p) => p.plan_id === this.selectedPlanId()) ?? null,
  );

  basePrice = computed(() => Number(this.course()?.price ?? 0));

  // plan_addon from backend pricing: basic plan = 0, pro = plan price
  planAddOn = computed(() => Number(this.selectedPlan()?.price ?? 0));

  courseDuration = computed(() => {
    const course = this.course();
    if (!course?.start_date || !course?.end_date) return '';

    const start = new Date(course.start_date);
    const end = new Date(course.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

    const totalMonths =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const adjustedMonths = end.getDate() >= start.getDate() ? totalMonths : totalMonths - 1;

    if (adjustedMonths >= 12 && adjustedMonths % 12 === 0) {
      const years = adjustedMonths / 12;
      return `${years} year${years === 1 ? '' : 's'}`;
    }

    const months = Math.max(1, adjustedMonths || 0);
    return `${months} month${months === 1 ? '' : 's'}`;
  });

  courseTeachers = computed(() => this.course()?.teachers ?? []);

  discount = computed(() => Number(0));

  totalDisplay = computed(() => this.basePrice() + this.planAddOn() - this.discount());

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const courseId = parseInt(this.route.snapshot.paramMap.get('courseId') ?? '0', 10);
    const planId = params['planId'] ? parseInt(params['planId'], 10) : null;

    this.courseId.set(courseId);
    if (planId) this.selectedPlanId.set(planId);

    if (!courseId) {
      this.error.set('Invalid course.');
      this.loading.set(false);
      return;
    }

    this.loadData(courseId);
  }

  private loadData(courseId: number): void {
    forkJoin({
      course: this.paymentService.getCourse(courseId),
      plans: this.paymentService.getPlans(),
      me: this.paymentService.getMe(),
      purchases: this.paymentService.getPurchases(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ course, plans, me, purchases }) => {
          // Guard: already purchased
          const alreadyOwned = purchases.data?.some((p) => p.course_id === courseId);
          if (alreadyOwned) {
            this.router.navigate(['/student/my-courses']);
            return;
          }

          this.course.set(course.data);
          this.plans.set(plans.data ?? []);

          this.userName.set(`${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim());
          this.userEmail.set(me?.email ?? '');
          this.userPhone.set(me?.phone ?? '');

          // Auto-select first plan if none from route
          if (!this.selectedPlanId() && plans.data?.length) {
            this.selectedPlanId.set(plans.data[0].plan_id);
          }

          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load checkout.');
          this.loading.set(false);
        },
      });
  }

  selectPlan(planId: number): void {
    this.selectedPlanId.set(planId);
  }

  planPriceAmount(plan: Plan): number {
    return Number(plan.price ?? 0);
  }

  planDurationMonths(plan: Plan): number | null {
    if (!plan.duration_days) return null;
    return Math.max(1, Math.ceil(plan.duration_days / 30));
  }

  toggleTerms(): void {
    this.agreedToTerms.update((v) => !v);
  }

  pay(): void {
    if (!this.agreedToTerms() || !this.selectedPlanId()) return;

    this.payLoading.set(true);
    this.error.set(null);

    this.paymentService
      .createOrder(this.courseId(), this.selectedPlanId()!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          const session: CheckoutSessionData = {
            courseId: this.courseId(),
            planId: this.selectedPlanId()!,
            orderId: data.order_id,
            razorpayOrderId: data.gateway_order_id,
            amount: data.amount,
            currency: data.currency,
            key: data.razorpay_key_id,
            courseTitle: this.course()?.course_name ?? '',
            courseThumbnail: this.course()?.thumbnail_url ?? undefined,
            planName: this.selectedPlan()?.plan_name,
            basePrice: data.pricing?.course_price ?? 0,
            planPrice: data.pricing?.plan_addon ?? 0,
            discount: data.pricing?.discount ?? 0,
            isUpgrade: data.is_upgrade,
          };
          this.paymentService.setSession(session);
          this.openRazorpay(session);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to create order. Please try again.');
          this.payLoading.set(false);
        },
      });
  }

  private async openRazorpay(session: CheckoutSessionData): Promise<void> {
    const loaded = await this.razorpayLoader.load();

    if (!loaded) {
      this.error.set('Payment system failed to load. Please try again.');
      this.payLoading.set(false);
      return;
    }

    const Razorpay = (window as any).Razorpay;

    const options = {
      key: session.key,
      amount: session.amount * 100,
      currency: session.currency,
      order_id: session.razorpayOrderId,
      name: 'ILP Platform',
      description: session.courseTitle,
      prefill: {
        name: this.userName(),
        email: this.userEmail(),
        contact: this.userPhone(),
      },
      theme: { color: '#2563EB' },

      handler: (response: any) => {
        console.log(response);
        const updatedSession: CheckoutSessionData = {
          ...session,
          paymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        };
        this.paymentService.setSession(updatedSession);

        this.paymentService
          .verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.router.navigate(['/student/payments/processing', session.orderId]);
            },
            error: (err) => {
              this.error.set(
                err?.error?.message ??
                  'Payment verification failed. Please try again or contact support.',
              );
              this.payLoading.set(false);
            },
          });
      },

      modal: {
        ondismiss: () => {
          this.payLoading.set(false);
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}
