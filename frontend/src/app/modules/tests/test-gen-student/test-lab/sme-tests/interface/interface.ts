import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ComponentRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SafeLatexPipe } from '../../../../../../core/utils/safe-latex.pipe';
import { SmeTestService } from '../../../../../../core/services/tests/sme-tests/sme-test';
import {
  AnswerChangeEvent,
  InterfaceOption,
  InterfaceQuestion,
} from '../../../../../../core/utils/questionmap';

interface SmeSection {
  section_id: number;
  section_name: string;
  subject_name?: string;
  num_questions?: number;
  question_type?: string;
  marks_correct?: string | number;
  marks_incorrect?: string | number;
  sort_order?: number;
}

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
  difficulty?: string;
  question_image_url?: string | null;
  paragraph_text?: string | null;
  paragraph_image_url?: string | null;
  image_position?: string | null;
  correct_answer?: string | null;
  options: SmeOption[];
  section_name?: string;
  subject_name?: string;
}

interface SmeTestData {
  test_id: number;
  title: string;
  subject?: string;
  exam_name?: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  negative_marking?: number;
  sections: SmeSection[];
  questions: SmeQuestion[];
}

interface QuestionAnswerState {
  selectedOptionId?: number | null;
  selectedOptionIds?: number[];
  numericalAnswer?: number | null;
}

interface SubmitAnswerPayload {
  question_id: number;
  selected_option_id?: number | null;
  selected_option_ids?: number[] | null;
  numerical_answer?: number | null;
}

interface SmeMappedQuestion extends InterfaceQuestion {
  originalQuestion: SmeQuestion;
}

@Component({
  standalone: true,
  selector: 'app-interface',
  imports: [CommonModule, FormsModule, RouterLink, SafeLatexPipe],
  templateUrl: './interface.html',
})
export class Interface implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('questionHost', { read: ViewContainerRef })
  private questionHost?: ViewContainerRef;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly smeTestService = inject(SmeTestService);

  loading = true;
  submitting = false;
  error = '';

  testId = 0;
  attemptId: number | null = null;
  test: SmeTestData | null = null;
  questions: SmeQuestion[] = [];
  mappedQuestions: SmeMappedQuestion[] = [];
  currentIndex = 0;
  timeLeft = 0;

  answers: Record<number, QuestionAnswerState> = {};
  reviewMarked = new Set<number>();
  visitedQuestionIds = new Set<number>();

  fullscreenExitCount = 0;
  readonly MAX_FULLSCREEN_EXITS = 3;
  showFullscreenWarning = false;
  showFullscreenBlocker = true;
  questionComponentLoading = false;
  questionComponentError = false;

  private timerSub?: Subscription;
  private questionComponentRef?: ComponentRef<LazyQuestionComponentInstance>;
  private questionComponentOutputSub?: Subscription;
  private questionLoadSequence = 0;
  private viewInitialized = false;

  private readonly questionComponentLoaders: Partial<
    Record<SmeMappedQuestion['questionType'], () => Promise<Type<LazyQuestionComponentInstance>>>
  > = {
    MCQ: () =>
      import(
        '../../custom-test/interface/questiontype components/mcq-question/mcq-question'
      ).then((m) => m.McqQuestion),
    MSQ_PARTIAL: () =>
      import(
        '../../custom-test/interface/questiontype components/msq-question/msq-question'
      ).then((m) => m.MsqQuestion),
    MSQ_NO_PARTIAL: () =>
      import(
        '../../custom-test/interface/questiontype components/msq-question/msq-question'
      ).then((m) => m.MsqQuestion),
    NAT: () =>
      import(
        '../../custom-test/interface/questiontype components/nat-question/nat-question'
      ).then((m) => m.NatQuestion),
    INTEGER: () =>
      import(
        '../../custom-test/interface/questiontype components/integer-question/integer-question'
      ).then((m) => m.IntegerQuestion),
    MATCH_MATRIX: () =>
      import(
        '../../custom-test/interface/questiontype components/match-matrix-question/match-matrix-question'
      ).then((m) => m.MatchMatrixQuestion),
    PARAGRAPH_MCQ: () =>
      import(
        '../../custom-test/interface/questiontype components/paragraph-mcq-question/paragraph-mcq-question'
      ).then((m) => m.ParagraphMcqQuestion),
    ASSERTION_REASON: () =>
      import(
        '../../custom-test/interface/questiontype components/assertion-reason-question/assertion-reason-question'
      ).then((m) => m.AssertionReasonQuestion),
  };

  ngOnInit(): void {
    this.testId = Number(this.route.snapshot.paramMap.get('testId'));
    const state = history.state as { attemptId?: number; test?: SmeTestData };
    this.attemptId = state?.attemptId ?? null;

    if (state?.test?.test_id === this.testId) {
      this.hydrateTest(state.test);
    } else {
      this.loadTest();
    }

    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange as EventListener);
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.loadCurrentQuestionComponent();
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.destroyQuestionComponent();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener(
      'webkitfullscreenchange',
      this.onFullscreenChange as EventListener,
    );
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  private loadTest(): void {
    this.loading = true;
    this.error = '';

    this.smeTestService.getTestById(this.testId).subscribe({
      next: (res) => {
        this.hydrateTest((res?.data ?? res) as SmeTestData);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Failed to load test data.';
      },
    });
  }

  private hydrateTest(raw: SmeTestData): void {
    const sections = [...(raw.sections ?? [])].sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    );
    const sectionMap = new Map(sections.map((section) => [section.section_id, section]));
    const normalizedQuestions = [...(raw.questions ?? [])]
      .map((question) => {
        const section = sectionMap.get(question.section_id);
        return {
          ...question,
          section_name: question.section_name ?? section?.section_name ?? 'General',
          subject_name:
            question.subject_name ??
            section?.subject_name ??
            raw.subject ??
            raw.exam_name ??
            'Test',
        };
      })
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    this.test = {
      ...raw,
      sections,
      questions: normalizedQuestions,
      total_questions: raw.total_questions ?? normalizedQuestions.length,
    };
    this.questions = normalizedQuestions;
    this.mappedQuestions = normalizedQuestions.map((question, index) =>
      this.mapToInterfaceQuestion(question, index),
    );
    this.timeLeft = Math.max(0, Number(raw.duration_minutes ?? 0) * 60);
    this.visitedQuestionIds = new Set(this.questions[0] ? [this.questions[0].question_id] : []);
    this.currentIndex = 0;
    this.loading = false;
    void this.loadCurrentQuestionComponent();
  }

  enterFullscreen(): void {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element
        .requestFullscreen()
        .then(() => {
          this.showFullscreenBlocker = false;
          this.showFullscreenWarning = false;
          this.startTimerIfNeeded();
        })
        .catch(() => {
          this.showFullscreenBlocker = false;
          this.startTimerIfNeeded();
        });
      return;
    }

    this.showFullscreenBlocker = false;
    this.startTimerIfNeeded();
  }

  private startTimerIfNeeded(): void {
    if (this.timerSub || this.timeLeft <= 0) return;
    this.timerSub = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.submitTest();
      }
    });
  }

  readonly onFullscreenChange = (): void => {
    if (document.fullscreenElement || this.showFullscreenBlocker || this.submitting) return;

    this.fullscreenExitCount++;
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

  get currentQuestion(): SmeQuestion | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get currentMappedQuestion(): SmeMappedQuestion | null {
    return this.mappedQuestions[this.currentIndex] ?? null;
  }

  get questionPalette(): Array<{ question: SmeQuestion; index: number }> {
    return this.questions.map((question, index) => ({ question, index }));
  }

  get currentSectionQuestions(): SmeQuestion[] {
    const sectionName = this.currentQuestion?.section_name;
    if (!sectionName) return this.questions;
    return this.questions.filter((question) => question.section_name === sectionName);
  }

  get currentSectionQuestionNumber(): number {
    const currentQuestion = this.currentQuestion;
    if (!currentQuestion) return 0;
    const index = this.currentSectionQuestions.findIndex(
      (question) => question.question_id === currentQuestion.question_id,
    );
    return index + 1;
  }

  get attemptedCount(): number {
    return this.questions.filter((question) => this.hasAnswer(question.question_id)).length;
  }

  get reviewCount(): number {
    return this.reviewMarked.size;
  }

  get remainingExits(): number {
    return this.MAX_FULLSCREEN_EXITS - this.fullscreenExitCount;
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  get timerDanger(): boolean {
    return this.timeLeft > 0 && this.timeLeft <= 300;
  }

  trackQuestion(_: number, item: { question: SmeQuestion; index: number }): number {
    return item.question.question_id;
  }

  hasAnswer(questionId: number): boolean {
    const answer = this.answers[questionId];
    if (!answer) return false;
    if (answer.selectedOptionId != null) return true;
    if (Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0) return true;
    return answer.numericalAnswer != null && !Number.isNaN(answer.numericalAnswer);
  }

  clearResponse(): void {
    const currentQuestion = this.currentQuestion;
    if (!currentQuestion) return;

    this.answers = {
      ...this.answers,
      [currentQuestion.question_id]: {},
    };
    this.syncQuestionComponentInputs();
  }

  toggleMarkForReview(): void {
    const currentQuestion = this.currentQuestion;
    if (!currentQuestion) return;

    const updated = new Set(this.reviewMarked);
    if (updated.has(currentQuestion.question_id)) {
      updated.delete(currentQuestion.question_id);
    } else {
      updated.add(currentQuestion.question_id);
    }
    this.reviewMarked = updated;
  }

  previous(): void {
    if (this.currentIndex === 0) return;
    this.goToQuestion(this.currentIndex - 1);
  }

  saveAndNext(): void {
    if (this.currentIndex >= this.questions.length - 1) return;
    this.goToQuestion(this.currentIndex + 1);
  }

  goToQuestion(index: number): void {
    this.currentIndex = index;
    const question = this.questions[index];
    if (question) {
      this.visitedQuestionIds.add(question.question_id);
    }
    void this.loadCurrentQuestionComponent();
  }

  isQuestionMarked(questionId: number): boolean {
    return this.reviewMarked.has(questionId);
  }

  isQuestionVisited(questionId: number): boolean {
    return this.visitedQuestionIds.has(questionId);
  }

  questionTypeLabel(question: SmeMappedQuestion | null): string {
    if (!question) return '';
    switch (question.questionType) {
      case 'MCQ':
        return 'Single Correct';
      case 'MSQ_PARTIAL':
      case 'MSQ_NO_PARTIAL':
        return 'Multiple Correct';
      case 'NAT':
        return 'Numerical Answer';
      case 'INTEGER':
        return 'Integer Type';
      case 'MATCH_MATRIX':
        return 'Match the Following';
      case 'PARAGRAPH_MCQ':
        return 'Paragraph Based';
      case 'ASSERTION_REASON':
        return 'Assertion Reason';
      default:
        return question.questionType;
    }
  }

  buildAnswerPayload(): SubmitAnswerPayload[] {
    return this.mappedQuestions.map((question) => {
      const state = this.answers[question.originalQuestion.question_id];
      switch (question.questionType) {
        case 'MSQ_PARTIAL':
        case 'MSQ_NO_PARTIAL':
          return {
            question_id: question.originalQuestion.question_id,
            selected_option_ids: state?.selectedOptionIds?.length ? state.selectedOptionIds : null,
          };
        case 'NAT':
        case 'INTEGER':
          return {
            question_id: question.originalQuestion.question_id,
            numerical_answer: state?.numericalAnswer ?? null,
          };
        default:
          return {
            question_id: question.originalQuestion.question_id,
            selected_option_id: state?.selectedOptionId ?? null,
          };
      }
    });
  }

  private mapToInterfaceQuestion(question: SmeQuestion, index: number): SmeMappedQuestion {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const options: InterfaceOption[] = (question.options ?? []).map((option, optionIndex) => ({
      id: option.option_id ?? optionIndex,
      label: optionLabels[optionIndex] ?? String(optionIndex + 1),
      text: option.option_text ?? '',
      imageUrl: option.option_image_url ?? null,
    }));

    const normalizedType = (question.question_type || question.db_question_type || '')
      .toLowerCase()
      .trim();

    let questionType: SmeMappedQuestion['questionType'] = 'MCQ';
    if (normalizedType === 'nat' || normalizedType === 'numerical') questionType = 'NAT';
    else if (normalizedType === 'integer') questionType = 'INTEGER';
    else if (normalizedType === 'mcq_multi' || normalizedType === 'msq') questionType = 'MSQ_PARTIAL';
    else if (normalizedType === 'match_list' || normalizedType === 'multi_match') questionType = 'MATCH_MATRIX';
    else if (normalizedType === 'paragraph_mcq' || normalizedType === 'comprehension') questionType = 'PARAGRAPH_MCQ';
    else if (normalizedType === 'assertion_reason') questionType = 'ASSERTION_REASON';
    else questionType = 'MCQ';

    const matchPairs =
      questionType === 'MATCH_MATRIX'
        ? this.buildMatchPairs(question.options ?? [])
        : { matchLeft: undefined, matchRight: undefined };

    return {
      id: question.question_id,
      question: question.question_text,
      questionType,
      options,
      marks: Number(question.marks_correct ?? 0),
      negativeMarks: Math.abs(Number(question.marks_incorrect ?? 0)),
      subjectName: question.subject_name ?? this.test?.subject ?? 'Test',
      section: question.section_name ?? 'General',
      sectionName: question.section_name ?? 'General',
      sectionId: question.section_id,
      sortOrder: Number(question.sort_order ?? index + 1),
      difficulty: question.difficulty ?? '',
      paragraph: question.paragraph_text ?? undefined,
      imageUrl: question.question_image_url ?? null,
      originalQuestion: question,
      ...matchPairs,
    };
  }

  private buildMatchPairs(options: SmeOption[]): {
    matchLeft?: string[];
    matchRight?: string[];
  } {
    const validOptions = options.filter((option) => (option.option_text ?? '').trim().length > 0);
    if (validOptions.length < 2) return {};
    const half = Math.ceil(validOptions.length / 2);
    return {
      matchLeft: validOptions.slice(0, half).map((option) => option.option_text ?? ''),
      matchRight: validOptions.slice(half).map((option) => option.option_text ?? ''),
    };
  }

  private async loadCurrentQuestionComponent(): Promise<void> {
    if (!this.viewInitialized || !this.questionHost) return;

    const question = this.currentMappedQuestion;
    this.questionLoadSequence++;
    const loadSequence = this.questionLoadSequence;
    this.destroyQuestionComponent();

    if (!question) {
      this.questionComponentLoading = false;
      this.questionComponentError = false;
      return;
    }

    const loader = this.questionComponentLoaders[question.questionType];
    if (!loader) {
      this.questionComponentLoading = false;
      this.questionComponentError = true;
      return;
    }

    this.questionComponentLoading = true;
    this.questionComponentError = false;

    try {
      const componentType = await loader();
      if (loadSequence !== this.questionLoadSequence || !this.questionHost) return;

      this.questionComponentRef = this.questionHost.createComponent(componentType);
      this.syncQuestionComponentInputs();
      this.questionComponentOutputSub = this.questionComponentRef.instance.answerChange.subscribe(
        (event) => this.handleQuestionAnswerChange(question, event),
      );
    } catch (error) {
      console.error('[SME Interface] Failed to lazy load question component:', error);
      if (loadSequence !== this.questionLoadSequence) return;
      this.questionComponentError = true;
    } finally {
      if (loadSequence === this.questionLoadSequence) {
        this.questionComponentLoading = false;
      }
    }
  }

  private syncQuestionComponentInputs(): void {
    if (!this.questionComponentRef || !this.currentMappedQuestion) return;

    const question = this.currentMappedQuestion;
    const answerState = this.answers[question.originalQuestion.question_id] ?? {};
    this.questionComponentRef.setInput('question', question);

    if (question.questionType === 'MSQ_PARTIAL' || question.questionType === 'MSQ_NO_PARTIAL') {
      this.questionComponentRef.setInput('answer', answerState.selectedOptionIds ?? []);
      return;
    }

    if (question.questionType === 'NAT' || question.questionType === 'INTEGER') {
      this.questionComponentRef.setInput('answer', answerState.numericalAnswer ?? null);
      return;
    }

    this.questionComponentRef.setInput('answer', answerState.selectedOptionId ?? null);
  }

  private handleQuestionAnswerChange(
    question: SmeMappedQuestion,
    event: AnswerChangeEvent<number | null>,
  ): void {
    const questionId = question.originalQuestion.question_id;
    const current = this.answers[questionId] ?? {};

    switch (question.questionType) {
      case 'MSQ_PARTIAL':
      case 'MSQ_NO_PARTIAL': {
        if (event.value == null) return;
        const existing = current.selectedOptionIds ?? [];
        const selectedOptionIds = existing.includes(event.value)
          ? existing.filter((id) => id !== event.value)
          : [...existing, event.value];
        this.answers = {
          ...this.answers,
          [questionId]: {
            selectedOptionIds,
            selectedOptionId: undefined,
            numericalAnswer: undefined,
          },
        };
        break;
      }
      case 'NAT':
      case 'INTEGER':
        this.answers = {
          ...this.answers,
          [questionId]: {
            numericalAnswer: event.value,
            selectedOptionId: undefined,
            selectedOptionIds: undefined,
          },
        };
        break;
      default:
        this.answers = {
          ...this.answers,
          [questionId]: {
            selectedOptionId: event.value,
            selectedOptionIds: undefined,
            numericalAnswer: undefined,
          },
        };
        break;
    }

    this.syncQuestionComponentInputs();
  }

  private destroyQuestionComponent(): void {
    this.questionComponentOutputSub?.unsubscribe();
    this.questionComponentOutputSub = undefined;
    this.questionComponentRef?.destroy();
    this.questionComponentRef = undefined;
    this.questionHost?.clear();
  }

  submitTest(): void {
    if (this.submitting || !this.test) return;

    this.submitting = true;
    this.error = '';
    this.timerSub?.unsubscribe();

    this.smeTestService.submitTest(this.test.test_id, this.buildAnswerPayload()).subscribe({
      next: (res) => {
        const result = res?.data ?? res;
        const attemptId = result?.attempt_id ?? this.attemptId;
        if (!attemptId) {
          this.submitting = false;
          this.error = 'Test submitted, but the attempt result could not be opened.';
          return;
        }
        this.router.navigate(['/student-test/sme-test-result', attemptId], {
          state: {
            result,
            test: this.test,
          },
        });
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message ?? 'Failed to submit test. Please try again.';
        this.startTimerIfNeeded();
      },
    });
  }
}

interface LazyQuestionComponentInstance {
  answerChange: EventEmitter<AnswerChangeEvent<number | null>>;
}
