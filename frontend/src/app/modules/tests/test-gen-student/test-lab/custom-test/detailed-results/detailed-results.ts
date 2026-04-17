import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AttemptAnswerDetail,
  AttemptResultDetail,
  UgTestService,
} from '../../../../../../core/services/tests/custom-tests/custom-test';
import { SafeLatexPipe } from '../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-detailed-results',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  templateUrl: './detailed-results.html',
  styleUrl: './detailed-results.css',
})
export class DetailedResults implements OnInit {
  loading = true;
  error = '';
  result: AttemptResultDetail | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ugTestService: UgTestService,
  ) {}

  ngOnInit(): void {
    const attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));

    if (!attemptId) {
      this.loading = false;
      this.error = 'Attempt id is missing.';
      return;
    }

    this.ugTestService.getResults(attemptId).subscribe({
      next: (res) => {
        this.result = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load detailed results.';
      },
    });
  }

  get correctCount(): number {
    return this.result?.answers.filter((answer) => answer.is_correct === 1).length ?? 0;
  }

  get attemptedCount(): number {
    return (
      this.result?.answers.filter((answer) => answer.answer_status === 'answered').length ?? 0
    );
  }

  get unattemptedCount(): number {
    return (
      this.result?.answers.filter((answer) => answer.answer_status === 'not_answered').length ?? 0
    );
  }

  get wrongCount(): number {
    return Math.max(0, this.attemptedCount - this.correctCount);
  }

  getFormattedType(answer: AttemptAnswerDetail): string {
    if (answer.question_type === 'mcq') return 'MCQ';
    if (answer.question_type === 'mcq_multi') return 'MSQ';
    if (answer.question_type === 'numerical') return 'Numerical';
    return answer.question_type;
  }

  getStatusLabel(answer: AttemptAnswerDetail): string {
    if (answer.answer_status === 'not_answered') return 'Not Answered';
    if (answer.is_correct === 1) return 'Correct';
    if (answer.is_partial === 1) return 'Partially Correct';
    return 'Incorrect';
  }

  getStatusClass(answer: AttemptAnswerDetail): string {
    if (answer.answer_status === 'not_answered') {
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
    if (answer.is_correct === 1) {
      return 'bg-green-100 text-green-700 border border-green-200';
    }
    if (answer.is_partial === 1) {
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    }
    return 'bg-red-100 text-red-700 border border-red-200';
  }

  getDisplayAnswer(answer: AttemptAnswerDetail): string {
    if (answer.answer_status === 'not_answered') return 'Not answered';

    if (answer.question_type === 'numerical') {
      return answer.numerical_answer != null ? String(answer.numerical_answer) : 'Not answered';
    }

    if (answer.selected_option_text) return answer.selected_option_text;

    if (answer.selected_option_ids) return answer.selected_option_ids;

    return 'Not answered';
  }

  getCorrectAnswer(answer: AttemptAnswerDetail): string {
    if (answer.question_type === 'numerical') {
      return answer.correct_numerical ?? '-';
    }

    if (answer.correct_option_text) return answer.correct_option_text;

    if (answer.correct_option_ids) return answer.correct_option_ids;

    return '-';
  }

  getMarksText(answer: AttemptAnswerDetail): string {
    const marks = Number(answer.marks_obtained ?? 0);
    return marks > 0 ? `+${marks}` : `${marks}`;
  }

  goBack(): void {
    if (this.result?.attempt_id) {
      this.router.navigate(['/student-test/test-result'], {
        queryParams: { attemptId: this.result.attempt_id },
      });
      return;
    }

    this.router.navigate(['/student-test/test-home']);
  }
}
