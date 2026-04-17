import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Attempt, PracticeTest } from '../../../../../../core/models/practice-test.model';
import { PracticeService } from '../../../../../../core/services/tests/practice-tests/practiceservice';

@Component({
  selector: 'app-practice-instructions',
  templateUrl: './pinstructions.html',
})
export class Pinstructions implements OnInit {
  testId!: number;
  test = signal<PracticeTest | null>(null);
  instructionsAccepted = signal(false);
  isStarting = signal(false);
  errorMessage = signal('');

  markingScheme = {
    correct: 1,
    negative: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PracticeService,
  ) {}

  ngOnInit(): void {
    this.testId = Number(this.route.snapshot.paramMap.get('testId'));
    this.loadTest();
  }

  private loadTest(): void {
    this.service.getTest(this.testId).subscribe({
      next: (test: PracticeTest) => {
        this.test.set(test);
        this.markingScheme =
          (test?.negative_marking ?? 0) === 0
            ? { correct: 1, negative: 0 }
            : { correct: 1, negative: -0.25 };
      },
      error: () => {
        this.errorMessage.set('Failed to load test details. Please go back and try again.');
      },
    });
  }

  totalQuestions(): number {
    return this.test()?.total_questions || 0;
  }

  testConfig(): PracticeTest | null {
    return this.test();
  }

  toggleAccepted(): void {
    this.instructionsAccepted.set(!this.instructionsAccepted());
  }

  startExam(): void {
    if (!this.instructionsAccepted()) return;

    this.isStarting.set(true);
    this.errorMessage.set('');

    this.service.startTest(this.testId).subscribe({
      next: (attempt: Attempt) => {
        this.isStarting.set(false);
        this.router.navigate(['/student-test/practice-interface', this.testId, attempt.attempt_id]);
      },
      error: (err) => {
        this.isStarting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to start exam. Please try again.');
      },
    });
  }
}
