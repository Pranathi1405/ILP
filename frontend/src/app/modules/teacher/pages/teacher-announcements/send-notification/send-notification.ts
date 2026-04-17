import { Component, inject, signal, computed, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  FormGroup,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  TeacherAnnouncementsService,
  NotificationTarget,
} from '../../../../../core/services/teacher/teacher-announcement.service';

/* ────────────────────────────────────────────────────────────────────────── */
/* Notification Types                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export const NOTIFICATION_TYPES = [
  { label: 'Teacher Notification', value: 'teacher_notification' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Course', value: 'course' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Test', value: 'test' },
  { label: 'Live Class', value: 'live_class' },
  { label: 'Doubt', value: 'doubt' },
  { label: 'System', value: 'system' },
];

@Component({
  selector: 'app-send-notification',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './send-notification.html',
})
export class SendNotification implements OnInit {
  /* ──────────────────────────────────────────────────────────────────────── */
  /* Dependencies                                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(TeacherAnnouncementsService);

  notificationTypes = NOTIFICATION_TYPES;

  /* ──────────────────────────────────────────────────────────────────────── */
  /* UI State                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successBanner = signal<string | null>(null);

  activeTarget = signal<NotificationTarget>('course');

  tabs = [
    {
      label: 'Send to Course',
      key: 'course' as NotificationTarget,
      description: 'Notify all enrolled students of a course you own.',
    },
    {
      label: 'Send to Student',
      key: 'student' as NotificationTarget,
      description: 'Notify one specific student in your course.',
    },
    {
      label: 'Schedule',
      key: 'schedule' as NotificationTarget,
      description: 'Queue a notification to be sent later.',
    },
  ];

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Forms                                                                    */
  /* ──────────────────────────────────────────────────────────────────────── */

  private baseNotificationFields = {
    title: ['', [Validators.required, Validators.maxLength(255)]],
    message: ['', Validators.required],
    notification_type: ['teacher_notification'],
    include_parents: [false],
  };

  courseForm = this.fb.group({
    course_id: [null as number | null, [Validators.required, Validators.min(1)]],
    ...this.baseNotificationFields,
  });

  studentForm = this.fb.group({
    student_id: [null as number | null, [Validators.required, Validators.min(1)]],
    ...this.baseNotificationFields,
  });

  scheduleForm = this.fb.group({
    course_id: [null as number | null, [Validators.required, Validators.min(1)]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    message: ['', Validators.required],
    schedule_date: ['', Validators.required],
    schedule_time: ['', Validators.required],
  });

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Schedule Reactive Logic                                                  */
  /* ──────────────────────────────────────────────────────────────────────── */

  private scheduleValues = toSignal(this.scheduleForm.valueChanges, {
    initialValue: this.scheduleForm.getRawValue(),
  });

  isScheduleFuture = computed(() => {
    const v = this.scheduleValues();
    if (!v.schedule_date || !v.schedule_time) return false;

    const selected = new Date(`${v.schedule_date}T${v.schedule_time}:00`);
    return selected > new Date();
  });

  scheduleHovered = signal(false);
  showScheduleWarning = computed(() => this.scheduleHovered() && !this.isScheduleFuture());

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Lifecycle                                                                */
  /* ──────────────────────────────────────────────────────────────────────── */

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode') as NotificationTarget;
    if (['course', 'student', 'schedule'].includes(mode)) {
      this.activeTarget.set(mode);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Helpers                                                                  */
  /* ──────────────────────────────────────────────────────────────────────── */

  private resetMessages(): void {
    this.errorMessage.set(null);
    this.successBanner.set(null);
  }

  private handleSuccess(message: string): void {
    this.isLoading.set(false);
    this.successBanner.set(message);

    setTimeout(() => {
      this.router.navigate(['/teacher/announcements'], {
        queryParams: { refresh: Date.now() },
      });
    }, 1200);
  }

  private submitRequest(
    form: FormGroup,
    request$: ReturnType<typeof this.service.sendToCourse>,
    successMessage: string,
  ): void {
    form.markAllAsTouched();
    if (form.invalid) return;

    this.isLoading.set(true);
    this.resetMessages();

    request$.subscribe({
      next: (res: any) =>
        res.success ? this.handleSuccess(successMessage) : this.handleError(res.message),
      error: (err) => this.handleError(err?.error?.message),
    });
  }

  private handleError(message?: string): void {
    this.isLoading.set(false);
    this.errorMessage.set(message ?? 'Operation failed.');
  }

  private hasError(form: AbstractControl | null, field: string, error: string) {
    const control = (form as any)?.get(field);
    return !!(control?.hasError(error) && control?.touched);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Tab Switch                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  selectTarget(key: NotificationTarget): void {
    this.activeTarget.set(key);
    this.resetMessages();

    this.router.navigate([], {
      queryParams: { mode: key },
      replaceUrl: true,
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Submit Actions                                                           */
  /* ──────────────────────────────────────────────────────────────────────── */

  sendToCourse(): void {
    const v = this.courseForm.getRawValue();

    this.submitRequest(
      this.courseForm,
      this.service.sendToCourse({
        course_id: v.course_id!,
        title: v.title!,
        message: v.message!,
        notification_type: v.notification_type || undefined,
        include_parents: v.include_parents ?? false,
      }),
      'Notification sent successfully!',
    );
  }

  sendToStudent(): void {
    const v = this.studentForm.getRawValue();

    this.submitRequest(
      this.studentForm,
      this.service.sendToStudent({
        student_id: v.student_id!,
        title: v.title!,
        message: v.message!,
        notification_type: v.notification_type || undefined,
        include_parents: v.include_parents ?? false,
      }),
      'Notification sent successfully!',
    );
  }

  scheduleNotification(): void {
    if (!this.isScheduleFuture()) return;

    const v = this.scheduleForm.getRawValue();

    this.submitRequest(
      this.scheduleForm,
      this.service.scheduleNotification({
        course_id: v.course_id!,
        title: v.title!,
        message: v.message!,
        scheduled_at: `${v.schedule_date} ${v.schedule_time}:00`,
      }),
      'Notification scheduled successfully!',
    );
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* UI Actions                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  onCancel(): void {
    this.router.navigate(['/teacher/announcements']);
  }

  onScheduleHover(entering: boolean): void {
    this.scheduleHovered.set(entering);
  }

  /* Validation proxies (template safe) */

  courseHasError(f: string, e: string) {
    return this.hasError(this.courseForm, f, e);
  }

  studentHasError(f: string, e: string) {
    return this.hasError(this.studentForm, f, e);
  }

  scheduleHasError(f: string, e: string) {
    return this.hasError(this.scheduleForm, f, e);
  }
}
