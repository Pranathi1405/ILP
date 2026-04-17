/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/modules/admin/pages/admin-announcements/create-announcement/create-announcement.ts – Create/Edit Announcement
 * =====================================================================================================================
 * Smart form component responsible for creating, scheduling, and editing announcements.
 *
 * Responsibilities:
 * 1. Manage reactive form state and validations for announcement creation
 * 2. Support both Create and Edit modes based on route parameters
 * 3. Prefill existing announcement data when editing
 * 4. Validate scheduling rules (future start date, valid end date)
 * 5. Build API payloads (Draft / Scheduled / Edit) from form data
 * 6. Handle API interactions via AnnouncementsService
 * 7. Control loading and error UI states
 * 8. Navigate back to announcements list after successful actions
 *
 * Pattern:
 * Reactive Form → Signals/Computed Validation → Payload Builder → Service Call → Navigation
 *
 * Notes:
 * - Uses Angular signals + computed for derived UI logic
 * - Converts form valueChanges to signals using toSignal()
 * - Scheduling fields are locked in edit mode to preserve timeline integrity
 * - Component acts as a container; template handles presentation only
 */

import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AnnouncementsService,
  TargetAudience,
  DraftPayload,
  SchedulePayload,
  Announcement,
} from '../../../../../core/services/admin/announcements/announcements.service';

@Component({
  selector: 'app-create-announcement',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-announcement.html',
})
export class CreateAnnouncement implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private announcementsService = inject(AnnouncementsService);

  isEditMode = signal(false);
  editAnnouncementId = signal<number | null>(null);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  createForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    content: [''],
    target_audience: ['all_users' as TargetAudience],
    course_id: [null as number | null],
    start_date: [''],
    start_time: [''],
    end_date: [''],
    end_time: [''],
  });

  private formValues = toSignal(this.createForm.valueChanges, {
    initialValue: this.createForm.getRawValue(),
  });

  isStartDateFuture = computed(() => {
    const v = this.formValues();
    if (!v?.start_date) return false;
    return new Date(`${v.start_date}T${v.start_time || '23:59'}`) > new Date();
  });

  isEndAfterStart = computed(() => {
    const v = this.formValues();
    if (!v?.end_date || !v?.start_date) return true;
    const start = new Date(`${v.start_date}T${v.start_time || '00:00'}`);
    const end = new Date(`${v.end_date}T${v.end_time || '23:59'}`);
    return end > start;
  });

  showCourseId = computed(() => this.formValues()?.target_audience === 'course_students');

  scheduleHovered = signal(false);
  showScheduleWarning = computed(() => this.scheduleHovered() && !this.isStartDateFuture());
  onScheduleHover(entering: boolean): void {
    this.scheduleHovered.set(entering);
  }

  targetAudienceOptions: { label: string; value: TargetAudience }[] = [
    { label: 'All Users', value: 'all_users' },
    { label: 'All Students', value: 'all_students' },
    { label: 'Teachers', value: 'teachers' },
    { label: 'Parents', value: 'parents' },
    { label: 'Course Students', value: 'course_students' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editAnnouncementId.set(Number(id));
      this.prefillForm(Number(id));
      this.createForm.get('start_date')?.disable();
      this.createForm.get('start_time')?.disable();
      this.createForm.get('end_date')?.disable();
      this.createForm.get('end_time')?.disable();
    }
  }

  private prefillForm(id: number): void {
    const a = this.announcementsService.announcements().find((a) => a.announcement_id === id);
    if (!a) return;

    const parseDateTime = (dt: string | null) => {
      if (!dt) return { date: '', time: '' };
      const [datePart, timePart = ''] = dt.replace('T', ' ').split(' ');
      return { date: datePart, time: timePart.slice(0, 5) };
    };

    const start = parseDateTime(a.start_date);
    const end = parseDateTime(a.end_date);

    this.createForm.patchValue({
      title: a.title,
      content: a.content,
      target_audience: a.target_audience,
      course_id: a.course_id ?? null,
      start_date: start.date,
      start_time: start.time,
      end_date: end.date,
      end_time: end.time,
    });
  }

  hasError(field: string, error: string): boolean {
    const c = this.createForm.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  private toMySQLDateTime(date?: string | null, time?: string | null): string | null {
    if (!date) return null;
    const t = time || '00:00';
    return `${date} ${t}:00`;
  }

  private buildDraftPayload(): DraftPayload {
    const v = this.createForm.getRawValue();
    return {
      title: v.title!,
      content: v.content || undefined,
      target_audience: v.target_audience as TargetAudience,
      course_id: v.target_audience === 'course_students' ? (v.course_id ?? undefined) : undefined,
      priority: 'high',
      end_date: this.toMySQLDateTime(v.end_date, v.end_time) ?? undefined,
    };
  }

  private buildSchedulePayload(): SchedulePayload {
    const v = this.createForm.getRawValue();
    return {
      ...this.buildDraftPayload(),
      start_date: this.toMySQLDateTime(v.start_date, v.start_time)!,
    };
  }

  saveAnnouncement(): void {
    if (!this.createForm.get('title')?.value) {
      this.createForm.get('title')?.markAsTouched();
      return;
    }
    if (!this.isEndAfterStart()) {
      this.errorMessage.set('Expiration date must be after the start date.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.announcementsService.createDraft(this.buildDraftPayload()).subscribe({
      next: () => {
        this.isLoading.set(false);
        // fetchAll() removed — init() on the parent reloads the list on return
        this.router.navigate(['/admin/announcements']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to save announcement.');
      },
    });
  }

  scheduleAnnouncement(): void {
    if (!this.isStartDateFuture()) return;
    if (!this.createForm.get('title')?.value) {
      this.createForm.get('title')?.markAsTouched();
      return;
    }
    if (!this.isEndAfterStart()) {
      this.errorMessage.set('Expiration date must be after the start date.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.announcementsService.schedule(this.buildSchedulePayload()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/announcements']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to schedule announcement.');
      },
    });
  }

  saveEdit(): void {
    if (!this.createForm.get('title')?.value) {
      this.createForm.get('title')?.markAsTouched();
      return;
    }
    const id = this.editAnnouncementId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const v = this.createForm.getRawValue();
    const payload: Partial<Announcement> = {
      title: v.title ?? undefined,
      content: v.content ?? undefined,
      target_audience: v.target_audience as TargetAudience,
      course_id: v.target_audience === 'course_students' ? (v.course_id ?? undefined) : undefined,
      end_date: this.toMySQLDateTime(v.end_date, v.end_time) ?? undefined,
    };

    this.announcementsService.edit(id, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/announcements']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to save changes.');
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/announcements']);
  }
}
