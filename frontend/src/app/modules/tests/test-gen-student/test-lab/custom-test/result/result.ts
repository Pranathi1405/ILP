import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  AttemptAnswerDetail,
  AttemptSubmitResult,
  UgTestService,
} from '../../../../../../core/services/tests/custom-tests/custom-test';

interface SubjectPerformance {
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  tone: 'strong' | 'average' | 'focus';
}

@Component({
  selector: 'app-submit-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result.html',
  styleUrls: ['./result.css'],
})
export class Result implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  result: AttemptSubmitResult | null = null;
  totalMarks = 0;
  loading = true;
  error: string | null = null;
  attemptId!: number;
  attemptedCount = 0;
  unattemptedCount = 0;
  subjectPerformance: SubjectPerformance[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ugTestService: UgTestService,
  ) {}

  ngOnInit(): void {
    const state = history.state as {
      result?: AttemptSubmitResult;
      attemptId?: number;
      attemptedCount?: number;
      unattempted?: number;
    };

    if (state?.result && state?.attemptId) {
      this.result = state.result;
      this.attemptId = state.attemptId;
      this.attemptedCount = Number(state.attemptedCount ?? state.result.totalQuestions);
      this.unattemptedCount = Number(state.unattempted ?? 0);
      this.loading = false;
      this.fetchDetailedResults(state.attemptId, false);
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params['attemptId'] ? Number(params['attemptId']) : null;

      if (!id) {
        this.error = 'Result data unavailable. Please go back to your test history.';
        this.loading = false;
        return;
      }

      this.attemptId = id;

      if (!this.result || this.result.attempt_id !== id) {
        this.fetchDetailedResults(id, true);
      }
    });
  }

  private fetchDetailedResults(attemptId: number, showLoader: boolean): void {
    if (showLoader) this.loading = true;

    this.ugTestService
      .getResults(attemptId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const detail = res.data;
          this.result = {
            attempt_id: detail.attempt_id,
            totalScore: detail.total_score,
            accuracy: detail.accuracy_percent,
            correctCount: detail.answers.filter((answer) => answer.is_correct === 1).length,
            totalQuestions: detail.answers.length,
          };
          this.totalMarks = Number(detail.total_marks ?? 0);
          this.attemptedCount = detail.answers.filter(
            (answer) => answer.answer_status === 'answered',
          ).length;
          this.unattemptedCount = detail.answers.filter(
            (answer) => answer.answer_status === 'not_answered',
          ).length;
          this.subjectPerformance = this.buildSubjectPerformance(detail.answers);
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'Failed to load results. Please try again.';
          this.loading = false;
        },
      });
  }

  private buildSubjectPerformance(answers: AttemptAnswerDetail[]): SubjectPerformance[] {
    const grouped = new Map<string, { correct: number; total: number }>();

    for (const answer of answers) {
      const subjectName = answer.subject_name?.trim() || 'General';
      const subject = grouped.get(subjectName) ?? { correct: 0, total: 0 };

      subject.total += 1;
      if (answer.is_correct === 1) subject.correct += 1;

      grouped.set(subjectName, subject);
    }

    return Array.from(grouped.entries())
      .map(([name, value]) => {
        const accuracy = value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0;
        return {
          name,
          accuracy,
          correct: value.correct,
          total: value.total,
          tone: this.getSubjectTone(accuracy),
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);
  }

  private getSubjectTone(accuracy: number): SubjectPerformance['tone'] {
    if (accuracy >= 75) return 'strong';
    if (accuracy >= 50) return 'average';
    return 'focus';
  }

  get accuracyNum(): number {
    return parseFloat(this.result?.accuracy ?? '0');
  }

  get scorePercent(): number {
    if (!this.result || this.result.totalQuestions === 0) return 0;
    return Math.round((this.result.correctCount / this.result.totalQuestions) * 100);
  }

  get incorrectCount(): number {
    if (!this.result) return 0;
    return Math.max(0, this.attemptedCount - this.result.correctCount);
  }

  get incorrectPercent(): number {
    if (!this.result || this.result.totalQuestions === 0) return 0;
    return Math.round((this.incorrectCount / this.result.totalQuestions) * 100);
  }

  get unattemptedPercent(): number {
    if (!this.result || this.result.totalQuestions === 0) return 0;
    return Math.round((this.unattemptedCount / this.result.totalQuestions) * 100);
  }

  get scoreRatio(): number {
    if (!this.result) return 0;
    if (!this.totalMarks) return this.scorePercent;
    return Math.max(0, Math.min(100, Math.round((this.result.totalScore / this.totalMarks) * 100)));
  }

  get scoreRingOffset(): number {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    return circumference - (this.scoreRatio / 100) * circumference;
  }

  get scoreDisplayTotal(): number {
    return this.totalMarks || this.result?.totalQuestions || 0;
  }

  get performanceSummary(): string {
    const accuracy = this.accuracyNum;

    if (accuracy >= 80) {
      return 'Your performance shows strong conceptual clarity with good control across most questions.';
    }
    if (accuracy >= 60) {
      return 'You have a solid base. A little more precision on medium-difficulty questions can lift your score quickly.';
    }
    if (accuracy >= 40) {
      return 'Your result shows promise, but consistency needs work. Focus on accuracy before pushing for speed.';
    }
    return 'This attempt highlights the topics that need attention most. Rebuilding fundamentals here will improve your next score.';
  }

  subjectToneLabel(tone: SubjectPerformance['tone']): string {
    if (tone === 'strong') return 'Strong';
    if (tone === 'average') return 'Average';
    return 'Needs Focus';
  }

  viewDetailedResults(): void {
    this.router.navigate(['student-test/results', this.attemptId]);
  }

  goHome(): void {
    this.router.navigate(['student/test-home']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
