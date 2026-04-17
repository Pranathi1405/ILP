import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SmeTestService } from '../../../../../../core/services/tests/sme-tests/sme-test';

@Component({
  selector: 'app-sme-test-instructions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructions.html',
})
export class Instructions implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private smeTestService = inject(SmeTestService);

  testId = signal<number>(0);
  test = signal<any>(null);
  loading = signal(true);
  error = signal('');

  // Mirror the same computed shape the instructions template expects
  totalQuestions = computed(
    () => this.test()?.total_questions ?? this.test()?.questions?.length ?? 0,
  );
  adjustedDuration = computed(() => this.test()?.duration_minutes ?? 0);
  isLoadingPattern = computed(() => this.loading());
  subjects = computed<string[]>(() => {
    const t = this.test();
    if (!t) return [];
    // ✅ Case 1: already array
    if (Array.isArray(t.subject)) return t.subject;
    // ✅ Case 2: string → convert to array
    if (typeof t.subject === 'string') {
      return t.subject
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    // ✅ Case 3: fallback from questions
    const names = [...new Set((t.questions ?? []).map((q: any) => q.subject_name).filter(Boolean))];

    return names;
  });
  chapters = computed<string[]>(() => []);
  difficulty = computed(() => this.test()?.difficulty ?? '—');
  examTitle = computed(() => this.test()?.title ?? 'SME Test');

  instructionsAccepted = signal(false);
  isStarting = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('testId'));
    this.testId.set(id);
    this.loadTest(id);
  }

  private loadTest(id: number): void {
    this.loading.set(true);
    this.smeTestService.getTestById(id).subscribe({
      next: (res) => {
        this.test.set(res?.data ?? res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load test details');
        this.loading.set(false);
      },
    });
  }
  startExam(): void {
    if (!this.instructionsAccepted() || this.isStarting()) return;
    this.isStarting.set(true);
    this.smeTestService.startAttempt(this.testId()).subscribe({
      next: (res) => {
        const attemptId = res?.data?.attempt_id ?? res?.attempt_id;
        this.isStarting.set(false);
        this.router.navigate(['/student-test/sme-test-interface', this.testId()], {
          state: { attemptId, test: this.test() },
        });
      },
      error: () => {
        this.error.set('Could not start the test. Please try again.');
        this.isStarting.set(false);
      },
    });
  }
  // Add inside the class
  readonly rules: string[] = [
    'Ensure a stable internet connection before beginning the session. Once started, the timer cannot be paused.',
    'The test contains a mix of Single Choice and Multiple Choice questions.',
    'You can navigate between questions using the question palette on the right side of the exam screen.',
    'Your responses are auto-saved each time you move to the next question. You may change your answer at any time before final submission.',
    'The exam will auto-submit when the timer reaches zero. Do not refresh or close the browser tab during the session.',
    'Exiting fullscreen more than <strong>3 times</strong> will trigger an automatic submission. Stay in fullscreen throughout the test.',
  ];
  goBack(): void {
    this.router.navigate(['/student/test-home']);
  }
}
