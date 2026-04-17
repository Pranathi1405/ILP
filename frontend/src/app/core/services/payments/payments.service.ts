/**
 * AUTHOR: Umesh Teja Peddi
 * Payment Service
 * ---------------
 * Handles all payment API calls.
 * Also manages in-memory checkout session and result state
 * so Processing and Result components can read them without route params.
 *
 * FIXES:
 *  - Issue #2: CreateOrderResponse now reflects actual backend response shape:
 *              `gateway_order_id` (not `razorpay_order_id`), `razorpay_key_id` (not `key`).
 *              Removed phantom fields that don't exist in the response.
 */

import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CheckoutSessionData, PaymentResult } from '../../../modules/payments/payments.types';
import { ApiService } from '../api.service';

// ── API response shapes ────────────────────────────────────────────────────────

export interface Plan {
  plan_id: number;
  plan_code: string;
  plan_name: string;
  price: string;
  duration_days: number;
}

export interface CourseTeacher {
  teacher_name: string;
  subject_name: string;
}

export interface CourseDetails {
  course_id: number;
  course_name: string;
  price: number | string;
  thumbnail_url?: string | null;
  start_date: string;
  end_date: string;
  teachers?: CourseTeacher[];
  difficulty_level?: string;
  medium?: string;
  description?: string;
  prerequisites?: string;
  learning_outcomes?: string;
  is_free?: number | boolean;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

/**
 * FIX #2: Matches the actual backend create-order response:
 * {
 *   order_id, gateway_order_id, amount, currency,
 *   razorpay_key_id, expires_at, is_upgrade,
 *   pricing: { course_price, plan_addon, discount, total }
 * }
 *
 * Removed `razorpay_order_id` and `key` — those fields do NOT exist in the response.
 * Removed `base_price` and `plan_price` top-level fields — pricing is nested under `pricing`.
 */
export interface CreateOrderResponse {
  order_id: number;
  gateway_order_id: string; // this is the Razorpay order ID — pass as `order_id` to SDK
  amount: number; // in RUPEES (backend converts; multiply ×100 for Razorpay SDK)
  currency: string;
  razorpay_key_id: string; // publishable key — pass as `key` to Razorpay SDK
  expires_at: string;
  is_upgrade: boolean;
  pricing: {
    course_price: number;
    plan_addon: number; // 0 for basic plan, plan.price for pro/others
    discount: number;
    total: number;
  };
}

export interface OrderStatus {
  order_id: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  gateway_order_id: string;
  created_at: string;
  expires_at: string;
  is_processed: boolean;
  is_upgrade: boolean;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  payment_id: number;
  order_id: number;
  is_upgrade: boolean;
  already_processed: boolean;
}

export interface Payment {
  payment_id: number;
  order_id: string; // comes as string e.g. "54"
  amount: string; // comes as string e.g. "3998.00"
  currency: string;
  payment_method: string | null;
  payment_status: string; // "completed" | "pending" | "failed"
  transaction_id: string;
  payment_date: string; // ISO date — was `created_at` in old interface
  course_id: number;
  course_name: string; // new — returned by API
  receipt_number: string; // new — returned directly on payment
  receipt_url: string; // new — returned directly on payment
}

export interface Receipt {
  receipt_url: string;
  receipt_number: string;
}

export interface Purchase {
  purchase_id: number;
  student_id: number;
  course_id: number;
  payment_id: number;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  purchase_date: string;
  valid_until: string;
  status: string;
  course_name: string;
  thumbnail_url: string;
}

export interface UpgradeOptions {
  current_plan: {
    plan_id: number;
    plan_code: string;
    plan_price: number;
    valid_until: string;
  };
  eligible_upgrades: Plan[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);

  // ApiService already adds baseUrl
  private readonly base = 'payments';
  private readonly coursesBase = 'courses';
  private readonly meBase = 'settings/me';

  private static readonly STORAGE_KEYS = {
    checkoutSession: 'payments.checkoutSession',
    paymentResult: 'payments.paymentResult',
    resultOrderId: 'payments.resultOrderId',
  } as const;

  // ── In-memory + persisted session state (survives refresh within the same tab) ──

  checkoutSession = signal<CheckoutSessionData | null>(null);
  paymentResult = signal<PaymentResult | null>(null);
  resultOrderId = signal<number | null>(null);

  constructor() {
    this.loadStoredState();
  }

  private loadStoredState(): void {
    try {
      const sessionRaw = sessionStorage.getItem(PaymentService.STORAGE_KEYS.checkoutSession);
      const resultRaw = sessionStorage.getItem(PaymentService.STORAGE_KEYS.paymentResult);
      const orderIdRaw = sessionStorage.getItem(PaymentService.STORAGE_KEYS.resultOrderId);

      if (sessionRaw) {
        const session = JSON.parse(sessionRaw) as CheckoutSessionData;
        this.checkoutSession.set(session);
      }

      if (resultRaw) {
        const result = JSON.parse(resultRaw) as PaymentResult;
        this.paymentResult.set(result);
      }

      if (orderIdRaw) {
        const orderId = Number(orderIdRaw);
        if (!Number.isNaN(orderId)) {
          this.resultOrderId.set(orderId);
        }
      }
    } catch {
      // Ignore storage read errors and keep the default in-memory state.
    }
  }

  private persistSession(session: CheckoutSessionData | null): void {
    if (session) {
      sessionStorage.setItem(PaymentService.STORAGE_KEYS.checkoutSession, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(PaymentService.STORAGE_KEYS.checkoutSession);
    }
  }

  private persistResult(result: PaymentResult | null): void {
    if (result) {
      sessionStorage.setItem(PaymentService.STORAGE_KEYS.paymentResult, JSON.stringify(result));
    } else {
      sessionStorage.removeItem(PaymentService.STORAGE_KEYS.paymentResult);
    }
  }

  private persistOrderId(orderId: number | null): void {
    if (orderId !== null) {
      sessionStorage.setItem(PaymentService.STORAGE_KEYS.resultOrderId, String(orderId));
    } else {
      sessionStorage.removeItem(PaymentService.STORAGE_KEYS.resultOrderId);
    }
  }

  setSession(session: CheckoutSessionData): void {
    this.checkoutSession.set(session);
    this.persistSession(session);
  }

  setResult(result: PaymentResult, orderId: number): void {
    this.paymentResult.set(result);
    this.resultOrderId.set(orderId);
    this.persistResult(result);
    this.persistOrderId(orderId);
  }

  clearSession(): void {
    this.checkoutSession.set(null);
    this.paymentResult.set(null);
    this.resultOrderId.set(null);
    this.persistSession(null);
    this.persistResult(null);
    this.persistOrderId(null);
  }

  // ── Course ─────────────────────────────────────────────────────────────────

  getCourse(courseId: number): Observable<ApiResponse<CourseDetails>> {
    return this.api.get<ApiResponse<CourseDetails>>(`${this.coursesBase}/${courseId}`);
  }

  // ── User profile ───────────────────────────────────────────────────────────

  getMe(): Observable<UserProfile> {
    return this.api.get<UserProfile>(this.meBase);
  }

  // ── Plans ──────────────────────────────────────────────────────────────────

  getPlans(): Observable<ApiResponse<Plan[]>> {
    return this.api.get<ApiResponse<Plan[]>>(`${this.base}/plans`);
  }

  // ── Purchases (for already-bought guard on checkout load) ─────────────────

  getPurchases(): Observable<PaginatedResponse<Purchase>> {
    return this.api.get<PaginatedResponse<Purchase>>(`${this.base}/me/purchases`);
  }

  // ── Order lifecycle ────────────────────────────────────────────────────────

  createOrder(courseId: number, planId: number): Observable<ApiResponse<CreateOrderResponse>> {
    return this.api.post<ApiResponse<CreateOrderResponse>>(`${this.base}/create-order`, {
      course_id: courseId,
      plan_id: planId,
    });
  }

  verifyPayment(payload: VerifyPaymentPayload): Observable<ApiResponse<VerifyPaymentResponse>> {
    return this.api.post<ApiResponse<VerifyPaymentResponse>>(
      `${this.base}/verify-payment`,
      payload,
    );
  }

  getOrderStatus(orderId: number): Observable<ApiResponse<OrderStatus>> {
    return this.api.get<ApiResponse<OrderStatus>>(`${this.base}/orders/${orderId}`);
  }

  cancelOrder(orderId: number): Observable<ApiResponse<null>> {
    return this.api.post<ApiResponse<null>>(`${this.base}/orders/${orderId}/cancel`, {});
  }

  // ── Upgrade ────────────────────────────────────────────────────────────────

  getUpgradeOptions(courseId: number): Observable<ApiResponse<UpgradeOptions>> {
    return this.api.get<ApiResponse<UpgradeOptions>>(`${this.base}/upgrade-options/${courseId}`);
  }

  // ── Payment history & details ──────────────────────────────────────────────

  getPaymentHistory(page = 1, limit = 20) {
    return this.api.get<PaginatedResponse<Payment>>(
      `${this.base}/me/payments?page=${page}&limit=${limit}`,
    );
  }

  getPaymentDetails(paymentId: number): Observable<ApiResponse<Payment>> {
    return this.api.get<ApiResponse<Payment>>(`${this.base}/${paymentId}`);
  }

  // ── Receipts ───────────────────────────────────────────────────────────────

  getReceipt(paymentId: number): Observable<ApiResponse<Receipt>> {
    return this.api.get<ApiResponse<Receipt>>(`${this.base}/${paymentId}/receipt`);
  }

  // ── All purchases (paginated) ─────────────────────────────────────────────

  getMyPurchases(page = 1, limit = 20) {
    return this.api.get<PaginatedResponse<Purchase>>(
      `${this.base}/me/purchases?page=${page}&limit=${limit}`,
    );
  }
}
