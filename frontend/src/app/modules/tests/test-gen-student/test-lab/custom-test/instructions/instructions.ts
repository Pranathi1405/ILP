// Author: E.Kaeith Emmanuel
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../../../core/states/appstate';
import {
  selectQuestions,
  selectTestMeta,
  selectTestId,
} from '../../../../../../core/states/custom-test/test.selectors';
import { setAttemptId } from '../../../../../../core/states/custom-test/test.actions';
import { UgTestService } from '../../../../../../core/services/tests/custom-tests/custom-test';

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructions.html',
})
export class Instructions implements OnInit {
  private router = inject(Router);
  private store = inject(Store<AppState>);
  private ugTestService = inject(UgTestService);

  private questions = this.store.selectSignal(selectQuestions);
  private meta = this.store.selectSignal(selectTestMeta);
  private testId = this.store.selectSignal(selectTestId);

  // ── Derived from store ──
  // questions[] already contains only the generated questions for selected subjects
  totalQuestions = computed(() => this.questions()?.length ?? 0);
  subjects = computed<string[]>(() => this.meta()?.subjects ?? []);
  subjectIds = computed<number[]>(() => this.meta()?.subjectIds ?? []);
  difficulty = computed(() => this.meta()?.difficulty ?? '—');
  chapters = computed<string[]>(() => this.meta()?.chapters ?? []);
  examCode = computed(() => this.meta()?.exam ?? '');
  testType = computed(() => this.meta()?.testType ?? '');
  examTitle = computed(() => this.meta()?.examTitle ?? this.meta()?.exam ?? 'Exam');

  // ── Pattern state ──
  // FIX: backend now returns duration_mins already adjusted for selected subjects.
  // No manual per-subject calculation needed here anymore.
  isLoadingPattern = signal(true);

  // adjustedDuration reads directly from the filtered pattern API response.
  // Falls back to meta.timeLimit while pattern is loading.
  adjustedDuration = signal<number>(0);
  totalSubjectsInExam = signal<number>(0);
  selectedSubjectsCount = signal<number>(0);

  // ── UI state ──
  instructionsAccepted = signal(false);
  isStarting = signal(false);

  ngOnInit(): void {
    if (!this.questions()?.length) {
      this.router.navigate(['/student/builder']);
      return;
    }

    const code = this.examCode();
    if (!code) {
      // No exam code — fall back to stored timeLimit
      this.adjustedDuration.set(this.meta()?.timeLimit ?? 0);
      this.isLoadingPattern.set(false);
      return;
    }

    // Pass subjects[] and difficulty; recompute duration locally for parity with pattern page.
    this.ugTestService
      .getExamPattern(code, this.subjects(), this.difficulty() === '—' ? '' : this.difficulty())
      .subscribe({
        next: (res) => {
          this.totalSubjectsInExam.set(res.data?.total_subjects_in_exam ?? 0);
          this.selectedSubjectsCount.set(
            res.data?.selected_subjects ?? this.subjects().length ?? 0,
          );
          const base = this.meta()?.timeLimit ?? res.data?.duration_mins ?? 0;
          const total = this.totalSubjectsInExam() || 1;
          const selected = this.selectedSubjectsCount() || this.subjects().length || total;
          const mins = Math.floor((base / total) * selected);
          this.adjustedDuration.set(mins);
          this.isLoadingPattern.set(false);
        },
        error: () => {
          // Non-fatal — fall back to stored timeLimit from builder
          this.adjustedDuration.set(this.meta()?.timeLimit ?? 0);
          this.isLoadingPattern.set(false);
        },
      });
  }

  startExam(): void {
    if (!this.instructionsAccepted() || this.isStarting()) return;

    const testId = this.testId();
    if (!testId) {
      this.router.navigate(['/student-test/test-interface']);
      return;
    }

    this.isStarting.set(true);

    // startAttempt called ONCE here — stores attemptId in NgRx.
    // interface.ts reads it via selectAttemptId; submitTest() never calls startAttempt.
    this.ugTestService.startAttempt(testId).subscribe({
      next: (res) => {
        this.store.dispatch(setAttemptId({ attemptId: res.data.attempt_id }));
        this.isStarting.set(false);
        this.router.navigate(['/student-test/test-interface']);
      },
      error: (err) => {
        console.error('Failed to start attempt:', err);
        this.isStarting.set(false);
      },
    });
  }
}
