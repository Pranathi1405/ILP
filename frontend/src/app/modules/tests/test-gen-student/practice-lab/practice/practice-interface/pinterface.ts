import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AnswerFeedback,
  AnswerPayload,
  PracticeQuestion,
  PracticeTest,
  QuestionOption,
} from '../../../../../../core/models/practice-test.model';
import { PracticeService } from '../../../../../../core/services/tests/practice-tests/practiceservice';
import { SafeLatexPipe } from '../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-practice-attempt',
  templateUrl: './pinterface.html',
  imports: [CommonModule, SafeLatexPipe],
  changeDetection: ChangeDetectionStrategy.OnPush, // <-- OnPush; we drive updates manually
})
export class Pinterface implements OnInit, OnDestroy {
  testId!: number;
  attemptId!: number;

  test: PracticeTest | null = null;
  questions: PracticeQuestion[] = [];
  currentIndex = 0;
  isLoading = true;
  errorMessage = '';

  mcqAnswers: Record<number, number> = {};
  msqAnswers: Record<number, number[]> = {};
  natAnswers: Record<number, string> = {};

  checked: boolean[] = [];
  feedback: Array<AnswerFeedback | null> = [];

  showSolution = false;
  hintVisible: boolean[] = [];
  isSubmitting = false;

  timerRunning = false;
  timerSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  /** Guard: prevents loadTest() from being called more than once */
  private _testLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PracticeService,
    private cdr: ChangeDetectorRef, // <-- inject CDR
  ) {}

  ngOnInit(): void {
    this.testId = Number(this.route.snapshot.paramMap.get('testId'));
    this.attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));

    if (!this._testLoaded) {
      this._testLoaded = true;
      this.loadTest();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  loadTest(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.service.getTest(this.testId).subscribe({
      next: (test) => {
        this.test = test;
        this.questions = test.questions ?? [];
        const n = this.questions.length;
        this.checked = new Array(n).fill(false);
        this.feedback = new Array(n).fill(null);
        this.hintVisible = new Array(n).fill(false);
        this.isLoading = false;

        if (!n) {
          this.errorMessage = 'No questions were returned for this practice test.';
        }

        this.cdr.markForCheck(); // <-- tell Angular the view needs updating
      },
      error: (err) => {
        this.isLoading = false;
        this.questions = [];
        this.errorMessage = err?.error?.message || 'Failed to load practice questions.';
        this.cdr.markForCheck();
      },
    });
  }

  // ── TIMER ──────────────────────────────────────────────────────────────────

  toggleTimer(): void {
    if (this.timerRunning) {
      this.clearTimer();
      this.timerRunning = false;
      this.cdr.markForCheck();
    } else {
      this.timerRunning = true;
      this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        this.cdr.markForCheck(); // <-- fires every second so the display updates
      }, 1000);
      this.cdr.markForCheck();
    }
  }

  resetTimer(): void {
    this.clearTimer();
    this.timerRunning = false;
    this.timerSeconds = 0;
    this.cdr.markForCheck();
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  get formattedTime(): string {
    const h = Math.floor(this.timerSeconds / 3600);
    const m = Math.floor((this.timerSeconds % 3600) / 60);
    const s = this.timerSeconds % 60;
    if (h > 0) {
      return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
    }
    return `${this.pad(m)}:${this.pad(s)}`;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  // ── QUESTION HELPERS ───────────────────────────────────────────────────────

  get currentQuestion(): PracticeQuestion | undefined {
    return this.questions?.[this.currentIndex];
  }
  get totalScore(): number {
    return this.questions.reduce((sum, _, i) => {
      return sum + this.getMarks(i);
    }, 0);
  }

  get currentQuestionType(): 'MCQ' | 'MSQ' | 'NAT' | '' {
    const type = this.currentQuestion?.question_type;
    if (type === 'mcq') return 'MCQ';
    if (type === 'mcq_multi') return 'MSQ';
    if (type === 'numerical') return 'NAT';
    return '';
  }

  // ── MCQ ────────────────────────────────────────────────────────────────────

  selectMCQ(option: QuestionOption): void {
    if (this.checked[this.currentIndex]) return;
    this.mcqAnswers[this.currentIndex] = option.option_id;
    this.cdr.markForCheck();
  }

  getMCQOptionClass(option: QuestionOption): string {
    const selected = this.mcqAnswers[this.currentIndex];
    if (!this.checked[this.currentIndex]) {
      return selected === option.option_id
        ? 'border-black bg-gray-100'
        : 'border-gray-300 hover:border-gray-400';
    }
    const fb = this.feedback[this.currentIndex];
    const correctId = fb?.correctOptionId ?? null;
    if (option.option_id === correctId) return 'border-green-500 bg-green-50';
    if (option.option_id === selected && option.option_id !== correctId)
      return 'border-red-500 bg-red-50';
    return 'border-gray-200';
  }

  // ── MSQ ────────────────────────────────────────────────────────────────────

  selectMSQ(option: QuestionOption): void {
    if (this.checked[this.currentIndex]) return;
    const arr = this.msqAnswers[this.currentIndex] || [];
    this.msqAnswers[this.currentIndex] = arr.includes(option.option_id)
      ? arr.filter((o) => o !== option.option_id)
      : [...arr, option.option_id];
    this.cdr.markForCheck();
  }

  getMSQOptionClass(option: QuestionOption): string {
    const selected = this.msqAnswers[this.currentIndex] || [];
    if (!this.checked[this.currentIndex]) {
      return selected.includes(option.option_id)
        ? 'border-black bg-gray-100'
        : 'border-gray-300 hover:border-gray-400';
    }
    const correct = this.feedback[this.currentIndex]?.correctOptionIds ?? [];
    if (correct.includes(option.option_id)) return 'border-green-500 bg-green-50';
    if (selected.includes(option.option_id) && !correct.includes(option.option_id))
      return 'border-red-500 bg-red-50';
    return 'border-gray-200';
  }

  // ── NAT ────────────────────────────────────────────────────────────────────

  updateNAT(val: string): void {
    this.natAnswers[this.currentIndex] = val;
    this.cdr.markForCheck();
  }

  getNATClass(): string {
    if (!this.checked[this.currentIndex]) return 'border-gray-300';
    return this.feedback[this.currentIndex]?.isCorrect
      ? 'border-green-500 bg-green-50'
      : 'border-red-500 bg-red-50';
  }

  // ── HINT / SOLUTION ────────────────────────────────────────────────────────

  isHintVisible(i: number): boolean {
    return this.hintVisible[i];
  }

  revealHint(): void {
    this.hintVisible[this.currentIndex] = true;
    this.cdr.markForCheck();
  }

  toggleSolution(): void {
    this.showSolution = !this.showSolution;
    this.cdr.markForCheck();
  }

  // ── ANSWER SUBMISSION ──────────────────────────────────────────────────────

  hasAnswer(): boolean {
    const type = this.currentQuestionType;
    if (type === 'MCQ') return this.mcqAnswers[this.currentIndex] != null;
    if (type === 'MSQ') return (this.msqAnswers[this.currentIndex] || []).length > 0;
    if (type === 'NAT') {
      const val = this.natAnswers[this.currentIndex];
      return val != null && val.trim() !== '';
    }
    return false;
  }

  checkAnswer(): void {
    const q = this.currentQuestion;
    if (!q) return;

    const payload: AnswerPayload = { questionId: q.question_id };

    if (q.question_type === 'mcq') {
      payload.selected_option_id = this.mcqAnswers[this.currentIndex];
    } else if (q.question_type === 'mcq_multi') {
      payload.selected_option_ids = this.msqAnswers[this.currentIndex] || [];
    } else if (q.question_type === 'numerical') {
      payload.numerical_answer = this.natAnswers[this.currentIndex];
    }

    this.service.submitAnswer(this.testId, payload).subscribe({
      next: (feedback) => {
        this.feedback[this.currentIndex] = feedback;
        this.checked[this.currentIndex] = true;
        this.showSolution = true; // auto-show solution after checking
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to submit answer.');
      },
    });
  }

  isCorrect(i: number): boolean {
    return !!this.feedback[i]?.isCorrect;
  }

  // ── NAVIGATION ─────────────────────────────────────────────────────────────

  next(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.showSolution = false;
      this.cdr.markForCheck();
    }
  }

  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showSolution = false;
      this.cdr.markForCheck();
    }
  }

  goToQuestion(i: number): void {
    this.currentIndex = i;
    this.showSolution = false;
    this.cdr.markForCheck();
  }

  // ── TEST SUBMIT ────────────────────────────────────────────────────────────

  submitTest(): void {
    if (this.isSubmitting) return;
    if (!confirm('Submit the test? Unattempted questions will score 0.')) return;

    this.isSubmitting = true;
    this.clearTimer();
    this.cdr.markForCheck();

    const answers: AnswerPayload[] = this.questions.map((q, i) => ({
      questionId: q.question_id,
      selected_option_id: this.mcqAnswers[i] ?? null,
      selected_option_ids: this.msqAnswers[i] ?? null,
      numerical_answer: this.natAnswers[i] ?? null,
    }));

    this.service.submitTest(this.testId, answers).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        const attemptId = result?.attempt_id ?? result?.attemptId ?? this.attemptId;

        // Build a summary to pass through router state so the results page can render instantly
        const summary = {
          total: this.questions.length,
          attempted: this.attemptedCount,
          correct: this.checked.filter((_, i) => this.isCorrect(i)).length,
          accuracy: this.accuracy,
          timeTaken: this.formattedTime,
          testId: this.testId,
          attemptId,
        };

        this.router.navigate(['/student-test/practice-results'], {
          queryParams: { attemptId, testId: this.testId },
          state: { summary },
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Failed to submit test. Please try again.');
      },
    });
  }

  // ── COMPUTED STATS ─────────────────────────────────────────────────────────

  get attemptedCount(): number {
    return this.questions.filter((_, i) => {
      return (
        this.mcqAnswers[i] != null ||
        (this.msqAnswers[i] && this.msqAnswers[i].length > 0) ||
        (this.natAnswers[i] && this.natAnswers[i].trim() !== '')
      );
    }).length;
  }

  get accuracy(): number {
    const totalMarks = this.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const scored = this.totalScore;

    return totalMarks ? Math.round((scored / totalMarks) * 100) : 0;
  }

  get isLastQuestion(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }
  getMarks(i: number): number {
    const fb = this.feedback[i];
    const q = this.questions[i];

    if (!fb || !q) return 0;

    // ✅ Correct answer
    if (fb.isCorrect) {
      return Number(q.marks) || 0;
    }

    // ✅ Incorrect answer (handle negative marking flag)
    if (this.test?.negative_marking) {
      return Number(q.marks_incorrect) || 0;
    }

    return 0;
  }
  getPaletteClass(i: number): string {
    if (i === this.currentIndex) return 'bg-black text-white';
    if (this.checked[i] && this.isCorrect(i)) return 'bg-green-200 text-green-800';
    if (this.checked[i] && !this.isCorrect(i)) return 'bg-red-200 text-red-800';
    return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  }
}
