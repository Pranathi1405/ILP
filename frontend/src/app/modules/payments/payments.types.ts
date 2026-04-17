// ── Shared types for the payments module ──────────────────────────────────────

export type PaymentResult = 'success' | 'failed' | 'pending';

export interface CourseTeacher {
  teacher_name: string;
  subject_name: string;
}

export interface CourseDetails {
  course_id: number;
  course_name: string;
  price: number;
  thumbnail_url?: string | null;
  start_date: string;
  end_date: string;
  teachers?: CourseTeacher[];
}

export interface Plan {
  plan_id: number;
  plan_code: string;
  plan_name: string;
  price: string;
  duration_days?: number;
}

export interface CheckoutSessionData {
  courseId: number;
  planId: number;
  orderId: number;

  /**
   * The Razorpay order ID returned as `gateway_order_id` from the backend.
   * Passed as `order_id` to the Razorpay SDK.
   */
  razorpayOrderId: string;

  /**
   * Amount in RUPEES as returned by the backend.
   * Multiply × 100 when passing to the Razorpay SDK (which expects paise).
   */
  amount: number;

  currency: string;

  /**
   * Razorpay publishable key — returned as `razorpay_key_id` from the backend.
   */
  key: string;

  courseTitle: string;
  courseThumbnail?: string;
  planName?: string;

  /**
   * FIX #7: Filled in after the Razorpay handler fires with razorpay_payment_id.
   * Undefined until the user completes payment in the Razorpay modal.
   */
  paymentId?: string;
  razorpaySignature?: string;

  basePrice: number;
  planPrice: number;
  discount: number;
  isUpgrade: boolean;
}
