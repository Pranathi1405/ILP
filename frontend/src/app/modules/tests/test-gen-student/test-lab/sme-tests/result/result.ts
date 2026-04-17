import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SafeLatexPipe } from '../../../../../../core/utils/safe-latex.pipe';
import { SmeTestService } from '../../../../../../core/services/tests/sme-tests/sme-test';

interface SmeOption {
  option_id: number | null;
  option_text: string | null;
  option_image_url?: string | null;
}

interface SmeQuestion {
  question_id: number;
  section_id: number;
  question_text: string;
  question_type: string;
  db_question_type?: string;
  sort_order: number;
  marks_correct: string | number;
  marks_incorrect: string | number;
  subject_name?: string;
  section_name?: string;
  question_image_url?: string | null;
  paragraph_text?: string | null;
  paragraph_image_url?: string | null;
  image_position?: string | null;
  options: SmeOption[];
}

interface SmeSection {
  section_id: number;
  section_name: string;
  subject_name?: string;
  sort_order?: number;
}

interface SmeTestData {
  test_id: number;
  title: string;
  exam_name?: string;
  subject?: string;
  total_questions: number;
  total_marks: number;
  sections: SmeSection[];
  questions: SmeQuestion[];
}

interface SmeResultAnswer {
  question_id: number;
  selected_option_id?: number | null;
  selected_option_ids?: string | number[] | null;
  selected_option_text?: string | null;
  numerical_answer?: number | string | null;
  correct_option_id?: number | null;
  correct_option_ids?: string | null;
  correct_option_text?: string | null;
  correct_numerical?: string | null;
  is_correct?: number;
  is_partial?: number;
  marks_obtained?: number;
  answer_status?: string;
  section_name?: string;
  subject_name?: string;
}

interface SmeResultDetail {
  attempt_id: number;
  test_id: number;
  total_score: number;
  total_marks: number;
  accuracy_percent: string | number;
  answers: SmeResultAnswer[];
}

interface ReviewQuestion extends SmeQuestion {
  status: 'correct' | 'incorrect' | 'partial' | 'unanswered';
  selectedOptionId: number | null;
  selectedOptionIds: number[];
  numericalAnswer: string;
  correctOptionId: number | null;
  correctOptionIds: number[];
  correctNumerical: string;
  marksObtained: number;
}

@Component({
  selector: 'app-submit-result',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  templateUrl: './result.html',
})
export class Result implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly smeTestService = inject(SmeTestService);

  loading = true;
  error = '';
  attemptId = 0;

  result: SmeResultDetail | null = null;
  test: SmeTestData | null = null;
  reviewQuestions: ReviewQuestion[] = [];
  currentIndex = 0;

  ngOnInit(): void {
    this.attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));
    const state = history.state as { result?: SmeResultDetail; test?: SmeTestData };

    if (state?.result?.attempt_id === this.attemptId) {
      this.result = state.result;
      if (state.test) {
        this.test = this.normalizeTest(state.test);
        this.buildReviewQuestions();
        this.loading = false;
      }
    }

    this.loadResults();
  }

  private loadResults(): void {
    this.loading = true;
    this.error = '';

    this.smeTestService.getResults(this.attemptId).subscribe({
      next: (res) => {
        const detail = (res?.data ?? res) as SmeResultDetail;
        this.result = detail;

        if (this.test?.test_id === detail.test_id) {
          this.buildReviewQuestions();
          this.loading = false;
          return;
        }

        this.smeTestService.getTestById(detail.test_id).subscribe({
          next: (testRes) => {
            this.test = this.normalizeTest((testRes?.data ?? testRes) as SmeTestData);
            this.buildReviewQuestions();
            this.loading = false;
          },
          error: (err) => {
            this.loading = false;
            this.error = err?.error?.message ?? 'Result loaded, but test review data is unavailable.';
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Failed to load result.';
      },
    });
  }

  private normalizeTest(test: SmeTestData): SmeTestData {
    const sections = [...(test.sections ?? [])].sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    );
    const sectionMap = new Map(sections.map((section) => [section.section_id, section]));
    const questions = [...(test.questions ?? [])]
      .map((question) => {
        const section = sectionMap.get(question.section_id);
        return {
          ...question,
          section_name: question.section_name ?? section?.section_name ?? 'General',
          subject_name:
            question.subject_name ??
            section?.subject_name ??
            test.subject ??
            test.exam_name ??
            'SME Test',
        };
      })
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    return {
      ...test,
      sections,
      questions,
    };
  }

  private buildReviewQuestions(): void {
    if (!this.result || !this.test) return;

    const answers = this.result.answers ?? [];
    const answersMap = new Map(answers.map((answer) => [answer.question_id, answer]));
    this.reviewQuestions = this.test.questions.map((question) => {
      const answer = answersMap.get(question.question_id);
      const status = this.resolveStatus(answer);

      return {
        ...question,
        status,
        selectedOptionId: answer?.selected_option_id ?? null,
        selectedOptionIds: this.parseIds(answer?.selected_option_ids),
        numericalAnswer:
          answer?.numerical_answer == null ? '' : String(answer.numerical_answer).trim(),
        correctOptionId: answer?.correct_option_id ?? null,
        correctOptionIds: this.parseIds(answer?.correct_option_ids),
        correctNumerical: answer?.correct_numerical?.trim() ?? '',
        marksObtained: Number(answer?.marks_obtained ?? 0),
      };
    });
  }

  private resolveStatus(answer?: SmeResultAnswer): ReviewQuestion['status'] {
    if (!answer || answer.answer_status === 'not_answered') return 'unanswered';
    if (Number(answer.is_correct) === 1) return 'correct';
    if (Number(answer.is_partial) === 1) return 'partial';
    return 'incorrect';
  }

  private parseIds(value?: string | number[] | null): number[] {
    if (Array.isArray(value)) {
      return value.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }
    if (!value) return [];
    return String(value)
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));
  }

  get currentQuestion(): ReviewQuestion | null {
    return this.reviewQuestions[this.currentIndex] ?? null;
  }

  get accuracy(): number {
    return Number(this.result?.accuracy_percent ?? 0);
  }

  get attemptedCount(): number {
    return this.reviewQuestions.filter((question) => question.status !== 'unanswered').length;
  }

  get correctCount(): number {
    return this.reviewQuestions.filter((question) => question.status === 'correct').length;
  }

  get partialCount(): number {
    return this.reviewQuestions.filter((question) => question.status === 'partial').length;
  }

  get incorrectCount(): number {
    return this.reviewQuestions.filter((question) => question.status === 'incorrect').length;
  }

  get unansweredCount(): number {
    return this.reviewQuestions.filter((question) => question.status === 'unanswered').length;
  }

  goToQuestion(index: number): void {
    this.currentIndex = index;
  }

  optionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getStatusLabel(status: ReviewQuestion['status']): string {
    if (status === 'correct') return 'Correct';
    if (status === 'partial') return 'Partially Correct';
    if (status === 'incorrect') return 'Incorrect';
    return 'Unanswered';
  }

  getStatusClasses(status: ReviewQuestion['status']): string {
    if (status === 'correct') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'partial') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (status === 'incorrect') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  isNumerical(question: ReviewQuestion): boolean {
    return question.question_type === 'nat' || question.db_question_type === 'numerical';
  }

  isSelected(question: ReviewQuestion, optionId: number | null): boolean {
    if (optionId == null) return false;
    return question.selectedOptionId === optionId || question.selectedOptionIds.includes(optionId);
  }

  isCorrectOption(question: ReviewQuestion, optionId: number | null): boolean {
    if (optionId == null) return false;
    return question.correctOptionId === optionId || question.correctOptionIds.includes(optionId);
  }

  viewHome(): void {
    this.router.navigate(['/student/test-home']);
  }
}
