// Author: E.Kaeith Emmanuel
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  OnDestroy,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { interval, Subscription, take } from 'rxjs';

import {
  selectQuestions,
  selectTimeLeft,
  selectAnswers,
  selectReviewMarked,
  selectSubmitted,
  selectTestId,
  selectAttemptId,
  selectSessionId,
  selectAttemptedCount,
  selectReviewCount,
  selectHasSections,
  selectTestMeta,
} from '../../../../../../core/states/custom-test/test.selectors';

import {
  saveAnswer,
  markForReview,
  submitTest as submitTestAction,
  tickQuestion,
  createTest,
} from '../../../../../../core/states/custom-test/test.actions';

import { AppState } from '../../../../../../core/states/appstate';
import {
  UgTestService,
  AnswerPayload,
} from '../../../../../../core/services/tests/custom-tests/custom-test';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
  mapQuestions,
} from '../../../../../../core/utils/questionmap';

import { SafeLatexPipe } from '../../../../../../core/utils/safe-latex.pipe';

export interface SectionQuestionEntry {
  question: InterfaceQuestion;
  globalIndex: number;
  sectionIndex: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SafeLatexPipe],
  templateUrl: './interface.html',
})
export class Interface implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('questionHost', { read: ViewContainerRef })
  private questionHost?: ViewContainerRef;

  questions: InterfaceQuestion[] = [];
  currentIndex = 0;
  timeLeft = 0;
  isSaving = false;
  answers: { [key: number]: any } = {};
  reviewMarked: number[] = [];
  submitted = false;
  testId: number | null = null;
  attemptId: number | null = null;
  sessionId = '';
  attemptedCount = 0;
  reviewCount = 0;
  examTitle = 'Exam';
  examSubjects = '';
  hasSections = false;
  visitedIndices = new Set<number>();

  activeSubject = '';
  activeSection = '';

  fullscreenExitCount = 0;
  readonly MAX_FULLSCREEN_EXITS = 3;
  showFullscreenWarning = false;
  showFullscreenBlocker = false;
  questionComponentLoading = false;
  questionComponentError = false;

  private intervalSub!: Subscription;
  private isSubmitting = false;
  private isRestoringTest = false;
  private timerStarted = false;
  private viewInitialized = false;
  private questionComponentRef?: ComponentRef<LazyQuestionComponentInstance>;
  private questionComponentOutputSub?: Subscription;
  private questionLoadSequence = 0;

  private readonly questionComponentLoaders: Partial<
    Record<InterfaceQuestion['questionType'], () => Promise<Type<LazyQuestionComponentInstance>>>
  > = {
    MCQ: () =>
      import('./questiontype components/mcq-question/mcq-question').then((m) => m.McqQuestion),
    MSQ_PARTIAL: () =>
      import('./questiontype components/msq-question/msq-question').then((m) => m.MsqQuestion),
    MSQ_NO_PARTIAL: () =>
      import('./questiontype components/msq-question/msq-question').then((m) => m.MsqQuestion),
    NAT: () =>
      import('./questiontype components/nat-question/nat-question').then((m) => m.NatQuestion),
    INTEGER: () =>
      import('./questiontype components/integer-question/integer-question').then(
        (m) => m.IntegerQuestion,
      ),
    ASSERTION_REASON: () =>
      import('./questiontype components/assertion-reason-question/assertion-reason-question').then(
        (m) => m.AssertionReasonQuestion,
      ),
    MATCH_MATRIX: () =>
      import('./questiontype components/match-matrix-question/match-matrix-question').then(
        (m) => m.MatchMatrixQuestion,
      ),
    PARAGRAPH_MCQ: () =>
      import('./questiontype components/paragraph-mcq-question/paragraph-mcq-question').then(
        (m) => m.ParagraphMcqQuestion,
      ),
  };

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ugTestService: UgTestService,
  ) {}

  ngOnInit(): void {
    this.store.select(selectQuestions).subscribe((q) => {
      this.questions = q || [];
      if (this.questions.length && !this.activeSubject) {
        this.activeSubject = this.subjectNames[0] ?? '';
        this.activeSection = this.sectionsForSubject(this.activeSubject)[0] ?? '';
      }
      void this.loadCurrentQuestionComponent();
    });
    this.store.select(selectAnswers).subscribe((a) => {
      this.answers = a || {};
      this.syncQuestionComponentInputs();
    });
    this.store.select(selectReviewMarked).subscribe((r) => (this.reviewMarked = r || []));
    this.store.select(selectSubmitted).subscribe((s) => (this.submitted = s));
    this.store.select(selectAttemptId).subscribe((id) => (this.attemptId = id));
    this.store.select(selectSessionId).subscribe((s) => (this.sessionId = s));
    this.store.select(selectAttemptedCount).subscribe((c) => (this.attemptedCount = c));
    this.store.select(selectReviewCount).subscribe((c) => (this.reviewCount = c));
    this.store.select(selectHasSections).subscribe((v) => (this.hasSections = v));
    this.store.select(selectTestId).subscribe((id) => {
      this.testId = id;
      if (id && this.questions.length === 0 && !this.isRestoringTest) {
        this.restoreTestFromBackend(id);
      }
    });

    this.store
      .select(selectTestMeta)
      .pipe(take(1))
      .subscribe((meta) => {
        this.examTitle = meta?.examTitle ?? meta?.exam ?? 'Exam';
        const storedSeconds = (Number(meta?.timeLimit) || 0) * 60;
        this.examSubjects = (meta?.subjects ?? []).join(' · ');

        if (storedSeconds > 0 && !this.timerStarted) {
          this.timerStarted = true;
          this.timeLeft = storedSeconds;
          this.startTimer();
          this.cdr.detectChanges();
        }

        if (!meta?.exam) return;

        this.ugTestService
          .getExamPattern(
            meta.exam,
            (meta?.subjectIds ?? []).map((id: number) => String(id)),
            meta.difficulty ?? '',
          )
          .subscribe({
            next: (res) => {
              const adjustedSeconds = (Number(res.data?.duration_mins) || 0) * 60;

              if (adjustedSeconds > 0 && !this.timerStarted) {
                this.timerStarted = true;
                this.timeLeft = adjustedSeconds;
                this.startTimer();
                this.cdr.detectChanges();
              }
            },
            error: () => {
              this.store
                .select(selectTimeLeft)
                .pipe(take(1))
                .subscribe((t) => {
                  if (t > 0 && !this.timerStarted) {
                    this.timerStarted = true;
                    this.timeLeft = t;
                    this.startTimer();
                  }
                });
            },
          });
      });

    this.visitedIndices.add(0);
    this.showFullscreenBlocker = true;
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.loadCurrentQuestionComponent();
  }

  private restoreTestFromBackend(testId: number): void {
    this.isRestoringTest = true;
    this.ugTestService
      .getTestById(testId)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const test = res.data;
          const mappedQuestions = mapQuestions(
            test.questions ?? [],
            test.has_partial_marking === 1,
          );

          this.store.dispatch(
            createTest({
              testData: {
                questions: mappedQuestions,
                exam: test.exam_type ?? '',
                examTitle: test.exam_name ?? 'Exam',
                subjects: [
                  ...new Set((test.questions ?? []).map((q) => q.subject_name).filter(Boolean)),
                ],
                subjectIds: [],
                chapters: [],
                difficulty: '',
                testType: '',
                timeLimit: test.duration_minutes,
                testId: test.test_id,
                marksCorrect: test.questions?.[0]
                  ? ((test.questions[0] as any).marks_correct ?? 0)
                  : 0,
                marksIncorrect: test.questions?.[0]
                  ? ((test.questions[0] as any).marks_incorrect ?? 0)
                  : 0,
              },
            }),
          );
          this.isRestoringTest = false;
        },
        error: (err) => {
          this.isRestoringTest = false;
          console.error('[CustomTest Interface] Failed to restore test on refresh:', err);
        },
      });
  }

  get subjectNames(): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const q of this.questions) {
      const sn = q.subjectName ?? 'General';
      if (!seen.has(sn)) {
        seen.add(sn);
        names.push(sn);
      }
    }
    return names;
  }

  sectionsForSubject(subjectName: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const q of this.questions) {
      if ((q.subjectName ?? 'General') !== subjectName) continue;
      const sec = q.sectionName ?? 'General';
      if (!seen.has(sec)) {
        seen.add(sec);
        names.push(sec);
      }
    }
    return names;
  }

  get currentSectionQuestions(): SectionQuestionEntry[] {
    return this.getEntriesForSubjectSection(this.activeSubject, this.activeSection);
  }

  getEntriesForSubjectSection(subjectName: string, sectionName: string): SectionQuestionEntry[] {
    const result: SectionQuestionEntry[] = [];
    let sectionIndex = 0;
    this.questions.forEach((q, globalIndex) => {
      if (
        (q.subjectName ?? 'General') === subjectName &&
        (q.sectionName ?? 'General') === sectionName
      ) {
        result.push({ question: q, globalIndex, sectionIndex });
        sectionIndex++;
      }
    });
    return result;
  }

  selectSubject(subjectName: string): void {
    this.activeSubject = subjectName;
    this.activeSection = this.sectionsForSubject(subjectName)[0] ?? '';
    const first = this.currentSectionQuestions[0];
    if (first) this.goToQuestion(first.globalIndex);
  }

  selectSection(sectionName: string): void {
    this.activeSection = sectionName;
    const first = this.currentSectionQuestions[0];
    if (first) this.goToQuestion(first.globalIndex);
  }

  private syncTabsToIndex(index: number): void {
    const q = this.questions[index];
    if (!q) return;
    this.activeSubject = q.subjectName ?? 'General';
    this.activeSection = q.sectionName ?? 'General';
  }

  get currentQuestion(): InterfaceQuestion | undefined {
    return this.questions[this.currentIndex];
  }

  get currentSectionQuestionNumber(): number {
    const entry = this.currentSectionQuestions.find((e) => e.globalIndex === this.currentIndex);
    return entry ? entry.sectionIndex + 1 : this.currentIndex + 1;
  }

  get currentSectionTotal(): number {
    return this.currentSectionQuestions.length || this.questions.length;
  }

  isVisited(globalIndex: number): boolean {
    return this.visitedIndices.has(globalIndex);
  }

  answeredInSubject(subjectName: string): number {
    return this.questions.filter(
      (q, i) => (q.subjectName ?? 'General') === subjectName && this.answers[i] != null,
    ).length;
  }

  totalInSubject(subjectName: string): number {
    return this.questions.filter((q) => (q.subjectName ?? 'General') === subjectName).length;
  }

  enterFullscreen(): void {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          this.showFullscreenBlocker = false;
          this.showFullscreenWarning = false;
          this.cdr.detectChanges();
        })
        .catch(() => {
          this.showFullscreenBlocker = false;
          this.cdr.detectChanges();
        });
    } else {
      this.showFullscreenBlocker = false;
      this.cdr.detectChanges();
    }
  }

  get isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  onFullscreenChange = (): void => {
    if (document.fullscreenElement || this.submitted || this.showFullscreenBlocker) return;
    this.fullscreenExitCount++;
    this.cdr.detectChanges();
    if (this.fullscreenExitCount >= this.MAX_FULLSCREEN_EXITS) {
      this.submitTest();
    } else {
      this.showFullscreenWarning = true;
    }
  };

  reenterFullscreen(): void {
    this.showFullscreenWarning = false;
    this.enterFullscreen();
  }

  get remainingExits(): number {
    return this.MAX_FULLSCREEN_EXITS - this.fullscreenExitCount;
  }

  startTimer(): void {
    this.intervalSub = interval(1000).subscribe(() => {
      this.store.dispatch(tickQuestion({ index: this.currentIndex }));
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.cdr.detectChanges();
      } else {
        this.submitTest();
      }
    });
  }

  get formattedTime(): string {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get timerDanger(): boolean {
    return this.timeLeft > 0 && this.timeLeft <= 300;
  }

  private dispatchSave(answer: any): void {
    if (this.submitted) return;
    this.isSaving = true;
    this.store.dispatch(saveAnswer({ index: this.currentIndex, answer }));
    setTimeout(() => (this.isSaving = false), 400);
  }

  selectMCQ(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }
  selectNAT(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }
  selectInteger(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }
  selectAssertionReason(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }
  selectMatchMatrix(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }
  selectParagraph(event: AnswerChangeEvent<number | null>): void {
    this.dispatchSave(event.value);
  }

  selectMSQ(event: AnswerChangeEvent<number | null>): void {
    if (this.submitted || event.value === null) return;
    const existing: number[] = Array.isArray(this.answers[this.currentIndex])
      ? this.answers[this.currentIndex]
      : [];
    const updated = existing.includes(event.value)
      ? existing.filter((o) => o !== event.value)
      : [...existing, event.value];
    this.dispatchSave(updated);
  }

  Previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.visitedIndices.add(this.currentIndex);
      this.syncTabsToIndex(this.currentIndex);
      void this.loadCurrentQuestionComponent();
    }
  }

  saveAndNext(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.visitedIndices.add(this.currentIndex);
      this.syncTabsToIndex(this.currentIndex);
      void this.loadCurrentQuestionComponent();
    }
  }

  clearResponse(): void {
    this.dispatchSave(null);
  }
  markQuestionForReview(): void {
    this.store.dispatch(markForReview({ index: this.currentIndex }));
  }

  goToQuestion(index: number): void {
    this.currentIndex = index;
    this.visitedIndices.add(index);
    this.syncTabsToIndex(index);
    void this.loadCurrentQuestionComponent();
  }

  private async loadCurrentQuestionComponent(): Promise<void> {
    if (!this.viewInitialized || !this.questionHost) return;

    const question = this.currentQuestion;
    this.questionLoadSequence++;
    const currentLoadSequence = this.questionLoadSequence;
    this.destroyQuestionComponent();

    if (!question) {
      this.questionComponentLoading = false;
      this.questionComponentError = false;
      this.cdr.detectChanges();
      return;
    }

    const loader = this.questionComponentLoaders[question.questionType];
    if (!loader) {
      this.questionComponentLoading = false;
      this.questionComponentError = true;
      this.cdr.detectChanges();
      return;
    }

    this.questionComponentLoading = true;
    this.questionComponentError = false;
    this.cdr.detectChanges();

    try {
      const componentType = await loader();
      if (currentLoadSequence !== this.questionLoadSequence || !this.questionHost) return;

      this.questionComponentRef = this.questionHost.createComponent(componentType);
      this.syncQuestionComponentInputs();
      this.questionComponentOutputSub = this.questionComponentRef.instance.answerChange.subscribe(
        (event) => this.handleQuestionAnswerChange(question.questionType, event),
      );
    } catch (error) {
      console.error('[CustomTest Interface] Failed to lazy load question component:', error);
      if (currentLoadSequence !== this.questionLoadSequence) return;
      this.questionComponentError = true;
    } finally {
      if (currentLoadSequence === this.questionLoadSequence) {
        this.questionComponentLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  private syncQuestionComponentInputs(): void {
    if (!this.questionComponentRef || !this.currentQuestion) return;

    this.questionComponentRef.setInput('question', this.currentQuestion);
    this.questionComponentRef.setInput(
      'answer',
      this.isMsqQuestion(this.currentQuestion)
        ? (this.answers[this.currentIndex] ?? [])
        : (this.answers[this.currentIndex] ?? null),
    );
  }

  private handleQuestionAnswerChange(
    questionType: InterfaceQuestion['questionType'],
    event: AnswerChangeEvent<number | null>,
  ): void {
    switch (questionType) {
      case 'MCQ':
        this.selectMCQ(event);
        break;
      case 'MSQ_PARTIAL':
      case 'MSQ_NO_PARTIAL':
        this.selectMSQ(event);
        break;
      case 'NAT':
        this.selectNAT(event);
        break;
      case 'INTEGER':
        this.selectInteger(event);
        break;
      case 'ASSERTION_REASON':
        this.selectAssertionReason(event);
        break;
      case 'MATCH_MATRIX':
        this.selectMatchMatrix(event);
        break;
      case 'PARAGRAPH_MCQ':
        this.selectParagraph(event);
        break;
    }
  }

  private isMsqQuestion(question: InterfaceQuestion): boolean {
    return question.questionType === 'MSQ_PARTIAL' || question.questionType === 'MSQ_NO_PARTIAL';
  }

  private destroyQuestionComponent(): void {
    this.questionComponentOutputSub?.unsubscribe();
    this.questionComponentOutputSub = undefined;
    this.questionComponentRef?.destroy();
    this.questionComponentRef = undefined;
    this.questionHost?.clear();
  }

  private buildAnswerPayload(): AnswerPayload[] {
    return this.questions.map((q, idx) => {
      const raw = this.answers[idx];
      const payload: AnswerPayload = { question_id: q.id };
      if (raw == null || raw === '') return payload;
      switch (q.questionType) {
        case 'MCQ':
          payload.selected_option_id = Number(raw) || null;
          break;
        case 'MSQ_PARTIAL':
        case 'MSQ_NO_PARTIAL':
          payload.selected_option_ids = Array.isArray(raw) ? raw.map(Number).filter(Boolean) : [];
          break;
        case 'NAT':
          payload.numerical_answer = raw !== null ? Number(raw) : null;
          break;
        case 'MATCH_MATRIX':
          payload.selected_option_id = Number(raw) || null;
          break;
      }
      return payload;
    });
  }

  submitTest(): void {
    if (this.isSubmitting || this.submitted) return;
    this.isSubmitting = true;
    this.intervalSub?.unsubscribe();

    const current = this.answers[this.currentIndex];
    if (current !== undefined) {
      this.store.dispatch(saveAnswer({ index: this.currentIndex, answer: current }));
    }
    this.store.dispatch(submitTestAction());

    if (!this.testId) {
      this.router.navigate(['/student-test/test-result']);
      return;
    }

    const answers = this.buildAnswerPayload();
    if (this.attemptId) {
      this.doSubmit(this.attemptId, answers);
    } else {
      this.isSubmitting = false;
      this.router.navigate(['/student-test/test-result']);
    }
  }

  private doSubmit(attemptId: number, answers: AnswerPayload[]): void {
    this.ugTestService.submitTest(this.testId!, answers).subscribe({
      next: (res) => {
        const reviewMarked = this.reviewMarked ?? [];
        const answersMap = this.answers ?? {};
        const answeredAndMarked = reviewMarked.filter((idx) => answersMap[idx] != null).length;
        const markedOnly = reviewMarked.length - answeredAndMarked;
        const attemptedCount = Object.values(answersMap).filter((v) => v != null).length;
        const unattempted = this.questions.length - attemptedCount;

        this.router.navigate(['/student-test/test-result'], {
          queryParams: { attemptId },
          state: {
            result: res.data,
            attemptId,
            totalQuestions: this.questions.length,
            attemptedCount,
            unattempted,
            reviewMarkedCount: reviewMarked.length,
            answeredAndMarked,
            markedOnly,
          },
        });
      },
      error: (err) => {
        console.error('Submit error:', err);
        this.isSubmitting = false;
        this.router.navigate(['/student-test/test-result'], { queryParams: { attemptId } });
      },
    });
  }

  ngOnDestroy(): void {
    this.intervalSub?.unsubscribe();
    this.destroyQuestionComponent();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
}

interface LazyQuestionComponentInstance {
  answerChange: EventEmitter<AnswerChangeEvent<number | null>>;
}
