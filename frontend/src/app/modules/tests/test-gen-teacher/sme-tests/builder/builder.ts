import { ChangeDetectorRef, Component, DoCheck, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SmeTestService } from '../../../../../core/services/tests/sme-tests/sme-test';

type BuilderMode = 'manual' | 'bank' | '';
type ToastType = 'success' | 'error';
type Difficulty = 'easy' | 'medium' | 'hard';

export interface Step {
  title: string;
  status: 'upcoming' | 'in-progress' | 'completed';
}

export interface TeacherCourse {
  course_id: number;
  course_name: string;
  subject_id: number;
  subject_name: string;
  exam_id?: number;
  exam_code: string;
  exam_name: string;
}

export interface TestForm {
  title: string;
  course_id: number | null;
  subject_name: string;
  totalQuestions: number;
  mode: BuilderMode;
  exam_code: string;
  exam_type: string;
  scheduled_start: string;
  scheduled_end: string;
}

export interface FormErrors {
  title: boolean;
  course: boolean;
}

interface SmeTestSection {
  section_id: number;
  section_name: string;
  subject_name?: string;
  subject_id?: number;
  question_type: string;
  num_questions: number;
  questions_added: number;
  remaining: number;
  global_subject_id?: number;
  marks_correct?: number;
  marks_incorrect?: number;
  paper_number?: number;
  sort_order?: number;
}

interface TestQuestionOption {
  option_id?: number;
  option_text: string;
  option_image_url?: string;
  is_correct: boolean | number;
}

interface TestQuestion {
  question_id: number;
  source: 'manual' | 'qb';
  section_id: number;
  question_text: string;
  paragraph_text?: string | null;
  difficulty?: string;
  question_type: string;
  db_question_type?: string;
  correct_answer?: string | null;
  explanation?: string | null;
  is_manual?: number;
  options: TestQuestionOption[];
}

interface SmeTestDetail {
  test_id: number;
  title: string;
  status?: string;
  question_source: 'manual' | 'qb';
  total_questions: number;
  duration_minutes: number;
  sections: SmeTestSection[];
  subject?: string;
  questions: TestQuestion[];
}

interface AvailableQuestionsResponse {
  section_id: number;
  section_name?: string;
  question_type?: string;
  required: number;
  added: number;
  remaining: number;
  data: BankQuestion[];
  pagination?: { total: number; page?: number; limit?: number; totalPages?: number };
}

interface BankQuestion extends TestQuestion {
  already_added?: boolean;
  isSelected?: boolean;
}

interface ManualDraftOption {
  text: string;
  isCorrect: boolean;
}

interface ManualDraft {
  text: string;
  difficulty: Difficulty;
  explanation: string;
  correctAnswer: string;
  options: ManualDraftOption[];
}

interface ReviewDraft {
  question_text: string;
  difficulty: Difficulty;
  explanation: string;
  correct_answer: string;
  options: ManualDraftOption[];
}

interface PersistedBuilderState {
  version: number;
  currentStep: number;
  sessionId: string;
  form: TestForm;
  currentTest: SmeTestDetail | null;
  manualSectionId: number | null;
  bankQuestionsBySection: Record<number, BankQuestion[]>;
  reviewEditState: Record<number, boolean>;
  reviewDrafts: Record<number, ReviewDraft>;
  manualDraft: ManualDraft;
  poolVisibilityBySection: Record<number, boolean>;
}

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder.html',
})
export class Builder implements OnInit, DoCheck {
  private readonly storageKey = 'sme-test-builder-state-v1';
  private smeService = inject(SmeTestService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private lastPersistedSnapshot = '';

  currentStep = 1;
  toast = false;
  toastMsg = '';
  toastType: ToastType = 'success';
  sessionId = '';

  isPageLoading = false;
  isCreatingTest = false;
  isSavingQuestion = false;
  isFetchingBank = false;
  isRefreshingTest = false;
  isPublishing = false;
  activeBankSaveSectionId: number | null = null;
  removingQuestionId: number | null = null;
  reviewSavingQuestionId: number | null = null;

  teacherCourses: TeacherCourse[] = [];
  selectedCourse: TeacherCourse | null = null;
  currentTest: SmeTestDetail | null = null;
  manualSectionId: number | null = null;

  bankQuestionsBySection: Record<number, BankQuestion[]> = {};
  bankLoadingBySection: Record<number, boolean> = {};
  poolVisibilityBySection: Record<number, boolean> = {};
  reviewEditState: Record<number, boolean> = {};
  reviewDrafts: Record<number, ReviewDraft> = {};

  readonly OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

  steps: Step[] = [
    { title: 'Setup', status: 'in-progress' },
    { title: 'Mode', status: 'upcoming' },
    { title: 'Questions', status: 'upcoming' },
    { title: 'Review', status: 'upcoming' },
  ];

  form: TestForm = {
    title: '',
    course_id: null,
    subject_name: '',
    totalQuestions: 0,
    mode: '',
    exam_code: '',
    exam_type: '',
    scheduled_start: '',
    scheduled_end: '',
  };

  errors: FormErrors = { title: false, course: false };
  manualDraft: ManualDraft = this.createManualDraft();

  ngOnInit(): void {
    this.hydrateStepFromRoute();
    this.sessionId = this.generateSessionId();
    this.hydratePersistedState();
    this.loadTeacherCourses();
  }

  ngDoCheck(): void {
    this.persistState();
  }

  get progressPercent(): number {
    return this.currentStep * 25;
  }

  get sections(): SmeTestSection[] {
    return this.currentTest?.sections ?? [];
  }

  get reviewQuestions(): TestQuestion[] {
    return this.currentTest?.questions ?? [];
  }

  get hasAddedQuestions(): boolean {
    return this.reviewQuestions.length > 0;
  }

  get manualSavedCount(): number {
    return this.reviewQuestions.filter((q) => q.source === 'manual').length;
  }

  get questionBankSavedCount(): number {
    return this.reviewQuestions.filter((q) => q.source === 'qb').length;
  }

  get totalAllocated(): number {
    return this.sections.reduce((sum, section) => {
      const list = this.getBankQuestions(section.section_id);
      return sum + list.filter((q) => q.isSelected && !q.already_added).length;
    }, 0);
  }

  get remainingQuestions(): number {
    return this.sections.reduce(
      (sum, section) => sum + Math.max(0, Number(section.remaining ?? 0)),
      0,
    );
  }

  get currentManualSection(): SmeTestSection | null {
    const incomplete = this.sections.filter((s) => Number(s.remaining) > 0);
    if (!incomplete.length) return this.sections[0] ?? null;
    if (this.manualSectionId) {
      const selected = incomplete.find((s) => s.section_id === this.manualSectionId);
      if (selected) return selected;
    }
    return incomplete[0];
  }

  get currentManualSectionType(): string {
    return this.getQuestionTypeLabel(this.currentManualSection?.question_type ?? '');
  }

  get currentManualIsNat(): boolean {
    return this.isNatType(this.currentManualSection?.question_type);
  }

  get currentManualAllowsMultipleCorrect(): boolean {
    return this.allowsMultipleCorrect(this.currentManualSection?.question_type);
  }

  get manualCanSave(): boolean {
    const section = this.currentManualSection;
    if (!section || !this.manualDraft.text.trim()) return false;
    if (this.currentManualIsNat) return !!this.manualDraft.correctAnswer.trim();
    const filledOptions = this.manualDraft.options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) return false;
    const correctCount = filledOptions.filter((o) => o.isCorrect).length;
    if (correctCount === 0) return false;
    if (!this.currentManualAllowsMultipleCorrect && correctCount > 1) return false;
    return true;
  }

  get checklistItems(): Array<{ label: string; done: boolean; detail: string }> {
    return [
      {
        label: 'Course & exam set',
        done: !!this.selectedCourse,
        detail: this.selectedCourse
          ? `${this.selectedCourse.course_name} · ${this.form.exam_code}`
          : 'No course selected',
      },
      {
        label: 'Schedule configured',
        done: !!this.form.scheduled_start && !!this.form.scheduled_end,
        detail:
          this.form.scheduled_start && this.form.scheduled_end
            ? 'Start and end times set'
            : 'Schedule not set',
      },
      {
        label: 'Mode selected',
        done: !!this.form.mode,
        detail: this.form.mode ? `Source: ${this.form.mode}` : 'No mode chosen',
      },
      {
        label: 'Questions completed',
        done: !!this.currentTest && this.remainingQuestions === 0,
        detail: this.currentTest
          ? this.remainingQuestions === 0
            ? 'All section targets completed'
            : `${this.remainingQuestions} slot(s) remaining`
          : 'No test created yet',
      },
      {
        label: 'Ready to publish',
        done: !!this.currentTest && this.remainingQuestions === 0,
        detail: this.currentTest
          ? 'Backend publish validation will run next'
          : 'Create a test first',
      },
    ];
  }

  get isLoading(): boolean {
    return (
      this.isPageLoading ||
      this.isCreatingTest ||
      this.isSavingQuestion ||
      this.isFetchingBank ||
      this.isRefreshingTest ||
      this.isPublishing
    );
  }

  // ─── Pool visibility ────────────────────────────────────────────────────────

  togglePoolVisibility(sectionId: number): void {
    this.poolVisibilityBySection[sectionId] = !this.poolVisibilityBySection[sectionId];
  }

  isPoolVisible(sectionId: number): boolean {
    return !!this.poolVisibilityBySection[sectionId];
  }

  // ─── Bank question helpers ───────────────────────────────────────────────────

  getAutoSelectedQuestions(sectionId: number): BankQuestion[] {
    return this.getBankQuestions(sectionId).filter((q) => q.isSelected && !q.already_added);
  }

  getUnselectedBankQuestions(sectionId: number): BankQuestion[] {
    return this.getBankQuestions(sectionId).filter((q) => !q.isSelected && !q.already_added);
  }

  // ─── Course loading ──────────────────────────────────────────────────────────

  loadTeacherCourses(): void {
    this.isPageLoading = true;
    this.smeService.getTeacherDealingSubjects().subscribe({
      next: (res: any) => {
        this.isPageLoading = false;
        const courses: any[] = res.data?.courses || [];
        this.teacherCourses = courses.map((c) => ({
          course_id: Number(c.course_id),
          course_name: c.course_name,
          subject_id: Number(c.subject_id),
          subject_name: c.subject_name,
          exam_id: Number(c.exam_id),
          exam_code: c.exam_code || '',
          exam_name: c.exam_name || '',
        }));
        this.restoreSelectedCourse();
        if (!this.form.course_id && this.teacherCourses.length === 1) {
          this.onCourseChange(this.teacherCourses[0].course_id);
        }
        if (this.currentTest?.test_id) {
          this.refreshCurrentTest(() => {
            if (this.currentStep === 3 && this.form.mode === 'bank') {
              this.sections.forEach((s) => this.loadBankQuestions(s.section_id));
            }
          });
        }
        this.refreshView();
      },
      error: () => {
        this.isPageLoading = false;
        this.showToast('Failed to load assigned courses', 'error');
        this.refreshView();
      },
    });
  }

  onCourseChange(courseId: number | null): void {
    this.form.course_id = courseId;
    this.errors.course = false;
    if (!courseId) {
      this.selectedCourse = null;
      this.form.subject_name = '';
      this.form.exam_code = '';
      this.form.exam_type = '';
      return;
    }
    const selected = this.teacherCourses.find((c) => c.course_id === Number(courseId)) ?? null;
    this.selectedCourse = selected;
    this.form.subject_name = selected?.subject_name || '';
    this.form.exam_code = selected?.exam_code || '';
    this.form.exam_type = selected?.exam_name || '';
  }

  // ─── Step navigation ─────────────────────────────────────────────────────────

  goStep2(): void {
    this.errors.title = !this.form.title.trim();
    this.errors.course = !this.form.course_id;
    if (this.errors.title || this.errors.course) return;
    if (!this.form.scheduled_start || !this.form.scheduled_end) {
      this.showToast('Please select a scheduled start and end time', 'error');
      return;
    }
    if (new Date(this.form.scheduled_end) <= new Date(this.form.scheduled_start)) {
      this.showToast('Scheduled end must be after the start time', 'error');
      return;
    }
    this.setStep(2);
  }

  setStep(step: number): void {
    this.currentStep = step;
    this.syncStepStatuses();
    this.refreshView();
    this.syncRouteState();
  }

  // ─── Mode selection ──────────────────────────────────────────────────────────

  selectMode(mode: 'manual' | 'bank'): void {
    this.form.mode = mode;
    if (!this.selectedCourse?.subject_id || !this.form.exam_code) {
      this.showToast('Select a valid course before choosing the mode', 'error');
      return;
    }
    const existingMode = this.currentTest?.question_source === 'qb' ? 'bank' : 'manual';
    if (this.currentTest && existingMode !== mode) {
      if (this.hasAddedQuestions) {
        this.isCreatingTest = false;
        this.showToast(
          'Reset the builder to switch between manual and question bank mode after adding questions',
          'error',
        );
        return;
      }
      this.prepareForModeRecreate();
    }
    if (this.currentTest) {
      this.prepareQuestionStep(mode);
      return;
    }

    const payload = {
      exam_code: this.form.exam_code,
      subject_id: this.selectedCourse.subject_id,
      question_source: mode === 'bank' ? 'qb' : 'manual',
      scheduled_start: this.form.scheduled_start,
      scheduled_end: this.form.scheduled_end,
    };

    this.isCreatingTest = true;
    this.smeService.createTest(payload).subscribe({
      next: (res: any) => {
        this.isCreatingTest = false;
        this.currentTest = this.normalizeTest(res.data);
        this.sessionId = String(this.currentTest.test_id);
        this.form.totalQuestions = Number(this.currentTest.total_questions || 0);
        this.form.title = this.currentTest.title || this.form.title;
        this.prepareQuestionStep(mode);
        this.showToast('Test created successfully');
        this.refreshView();
      },
      error: (err: { error?: { message?: string } }) => {
        this.isCreatingTest = false;
        this.showToast(err.error?.message || 'Failed to create test', 'error');
        this.refreshView();
      },
    });
  }

  continueFromModeStep(): void {
    if (this.isCreatingTest) return;
    if (this.form.mode !== 'manual' && this.form.mode !== 'bank') {
      this.showToast('Choose Manual Entry or Question Bank to continue', 'error');
      return;
    }
    this.selectMode(this.form.mode);
  }

  // ─── Manual entry ────────────────────────────────────────────────────────────

  selectManualSection(sectionId: number): void {
    this.manualSectionId = sectionId;
    this.manualDraft = this.createManualDraft();
  }

  addManualOption(): void {
    if (this.currentManualIsNat || this.manualDraft.options.length >= 6) return;
    this.manualDraft.options.push({ text: '', isCorrect: false });
  }

  removeManualOption(index: number): void {
    if (this.currentManualIsNat || this.manualDraft.options.length <= 2) return;
    this.manualDraft.options.splice(index, 1);
  }

  toggleManualCorrect(index: number): void {
    if (this.currentManualIsNat) return;
    if (this.currentManualAllowsMultipleCorrect) {
      this.manualDraft.options[index].isCorrect = !this.manualDraft.options[index].isCorrect;
      return;
    }
    this.manualDraft.options = this.manualDraft.options.map((o, i) => ({
      ...o,
      isCorrect: i === index,
    }));
  }

  saveAndNext(): void {
    this.saveManualQuestion(false);
  }

  saveAndFinish(): void {
    this.saveManualQuestion(true);
  }

  // ─── Bank mode ───────────────────────────────────────────────────────────────

  loadBankQuestions(sectionId: number): void {
    const testId = this.getPersistedTestId();
    if (!testId) return;

    this.bankLoadingBySection[sectionId] = true;

    this.smeService.getAvailableQuestions(testId, sectionId, undefined, 100).subscribe({
      next: (res: any) => {
        const response = res.data as AvailableQuestionsResponse;
        this.updateSectionProgress(sectionId, {
          num_questions: Number(response.required ?? 0) || undefined,
          questions_added: Number(response.added ?? 0),
          remaining: Number(response.remaining ?? 0),
        });

        const section = this.sections.find((s) => Number(s.section_id) === Number(sectionId));
        const remaining = Number(section?.remaining ?? response.remaining ?? 0);

        // Auto-select the first `remaining` unadded questions
        this.bankQuestionsBySection[sectionId] = (response.data ?? []).map((q, idx) => ({
          ...q,
          source: (q.source as 'manual' | 'qb') || 'qb',
          section_id: Number(q.section_id ?? sectionId),
          options: this.normalizeOptions(q.options),
          isSelected: !q.already_added && idx < remaining,
        }));

        this.bankLoadingBySection[sectionId] = false;
        this.refreshView();
      },
      error: () => {
        this.bankQuestionsBySection[sectionId] = [];
        this.bankLoadingBySection[sectionId] = false;
        this.refreshView();
      },
    });
  }

  toggleBankQuestion(sectionId: number, questionId: number): void {
    this.bankQuestionsBySection[sectionId] = this.getBankQuestions(sectionId).map((q) =>
      q.question_id === questionId && !q.already_added ? { ...q, isSelected: !q.isSelected } : q,
    );
  }

  addSelectedBankQuestions(section: SmeTestSection): void {
    const testId = this.getPersistedTestId();
    if (!testId) return;

    const selectedIds = this.getBankQuestions(section.section_id)
      .filter((q) => q.isSelected && !q.already_added)
      .slice(0, Number(section.remaining))
      .map((q) => q.question_id);

    if (!selectedIds.length) {
      this.showToast(`Select one or more questions for ${section.section_name}`, 'error');
      return;
    }

    this.isFetchingBank = true;
    this.activeBankSaveSectionId = section.section_id;
    this.smeService
      .addQuestion(testId, { section_id: section.section_id, question_ids: selectedIds })
      .subscribe({
        next: (res: any) => {
          this.bumpSectionProgress(section.section_id, selectedIds.length);
          this.afterQuestionMutation(res.data?.message || 'Questions added successfully', () => {
            this.loadBankQuestions(section.section_id);
          });
        },
        error: (err: { error?: { message?: string } }) => {
          this.isFetchingBank = false;
          this.activeBankSaveSectionId = null;
          this.showToast(err.error?.message || 'Failed to add selected questions', 'error');
          this.refreshView();
        },
      });
  }

  confirmAllSections(): void {
    const pendingSections = this.sections.filter(
      (section) => this.getAutoSelectedQuestions(section.section_id).length > 0,
    );
    if (!pendingSections.length) {
      this.showToast('No auto-selected questions to confirm', 'error');
      return;
    }
    this.addBankQuestionsSequentially(pendingSections, 0);
  }

  // ─── Remove / edit ───────────────────────────────────────────────────────────

  removeQuestion(question: TestQuestion): void {
    const testId = this.getPersistedTestId();
    if (!testId) return;

    this.removingQuestionId = question.question_id;
    this.smeService.removeQuestion(testId, question.question_id).subscribe({
      next: () => {
        this.bumpSectionProgress(question.section_id, -1);
        this.refreshCurrentTest(() => {
          this.removingQuestionId = null;
          if (this.form.mode === 'bank') this.loadBankQuestions(question.section_id);
          this.showToast('Question removed successfully');
          this.refreshView();
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.removingQuestionId = null;
        this.showToast(err.error?.message || 'Failed to remove question', 'error');
        this.refreshView();
      },
    });
  }

  startReviewEdit(question: TestQuestion): void {
    if (!this.canEditReviewQuestion(question)) {
      this.showToast(
        'Question bank questions can be reviewed or removed, but not edited here',
        'error',
      );
      return;
    }

    this.reviewEditState[question.question_id] = true;
    this.reviewDrafts[question.question_id] = {
      question_text: question.question_text || '',
      difficulty: this.normalizeDifficulty(question.difficulty),
      explanation: question.explanation || '',
      correct_answer: question.correct_answer || '',
      options: this.normalizeOptions(question.options).map((o) => ({
        text: o.option_text,
        isCorrect: this.toBool(o.is_correct),
      })),
    };

    if (
      !this.reviewDrafts[question.question_id].options.length &&
      !this.isNatType(question.question_type)
    ) {
      this.reviewDrafts[question.question_id].options = [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ];
    }
  }

  cancelReviewEdit(questionId: number): void {
    delete this.reviewEditState[questionId];
    delete this.reviewDrafts[questionId];
  }

  addReviewOption(questionId: number): void {
    const draft = this.reviewDrafts[questionId];
    if (!draft || draft.options.length >= 6) return;
    draft.options.push({ text: '', isCorrect: false });
  }

  removeReviewOption(question: TestQuestion, questionId: number, optionIndex: number): void {
    const draft = this.reviewDrafts[questionId];
    if (!draft || this.isNatType(question.question_type) || draft.options.length <= 2) return;
    draft.options.splice(optionIndex, 1);
  }

  toggleReviewCorrect(question: TestQuestion, questionId: number, optionIndex: number): void {
    const draft = this.reviewDrafts[questionId];
    if (!draft || this.isNatType(question.question_type)) return;
    if (this.allowsMultipleCorrect(question.question_type)) {
      draft.options[optionIndex].isCorrect = !draft.options[optionIndex].isCorrect;
      return;
    }
    draft.options = draft.options.map((o, i) => ({ ...o, isCorrect: i === optionIndex }));
  }

  saveReviewQuestion(question: TestQuestion): void {
    const draft = this.reviewDrafts[question.question_id];
    if (!draft) return;
    if (!draft.question_text.trim()) {
      this.showToast('Question text is required', 'error');
      return;
    }

    const isNat = this.isNatType(question.question_type);
    const payload: any = {
      question_text: draft.question_text.trim(),
      difficulty: draft.difficulty,
      explanation: draft.explanation.trim() || null,
    };

    if (isNat) {
      if (!draft.correct_answer.trim()) {
        this.showToast('Correct answer is required for numerical questions', 'error');
        return;
      }
      payload.correct_answer = draft.correct_answer.trim();
    } else {
      const options = draft.options
        .filter((o) => o.text.trim())
        .map((o) => ({ option_text: o.text.trim(), is_correct: o.isCorrect }));
      if (options.length < 2) {
        this.showToast('At least two options are required', 'error');
        return;
      }
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount === 0) {
        this.showToast('Mark at least one correct option', 'error');
        return;
      }
      if (!this.allowsMultipleCorrect(question.question_type) && correctCount > 1) {
        this.showToast('Only one correct option is allowed for this question type', 'error');
        return;
      }
      payload.options = options;
    }

    this.reviewSavingQuestionId = question.question_id;
    this.smeService.updateQuestion(question.question_id, payload).subscribe({
      next: () => {
        this.refreshCurrentTest(() => {
          this.reviewSavingQuestionId = null;
          this.cancelReviewEdit(question.question_id);
          this.showToast('Question updated successfully');
          this.refreshView();
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.reviewSavingQuestionId = null;
        this.showToast(err.error?.message || 'Failed to update question', 'error');
        this.refreshView();
      },
    });
  }

  // ─── Publish / reset ─────────────────────────────────────────────────────────

  publish(): void {
    const testId = this.getPersistedTestId();
    if (!testId) {
      this.showToast('Create the test before publishing', 'error');
      return;
    }

    this.isPublishing = true;
    this.smeService.publishTest(testId).subscribe({
      next: () => {
        this.isPublishing = false;
        this.clearPersistedState();
        this.showToast('Test published successfully');
        this.refreshView();
        setTimeout(() => this.router.navigate(['/teacher/sme-test']), 1400);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isPublishing = false;
        this.showToast(err.error?.message || 'Publish failed', 'error');
        this.refreshView();
      },
    });
  }

  reset(): void {
    this.isCreatingTest = false;
    this.form = {
      title: '',
      course_id: null,
      subject_name: '',
      totalQuestions: 0,
      mode: '',
      exam_code: '',
      exam_type: '',
      scheduled_start: '',
      scheduled_end: '',
    };
    this.errors = { title: false, course: false };
    this.selectedCourse = null;
    this.currentTest = null;
    this.manualSectionId = null;
    this.manualDraft = this.createManualDraft();
    this.bankQuestionsBySection = {};
    this.bankLoadingBySection = {};
    this.poolVisibilityBySection = {};
    this.reviewEditState = {};
    this.reviewDrafts = {};
    this.activeBankSaveSectionId = null;
    this.removingQuestionId = null;
    this.reviewSavingQuestionId = null;
    this.sessionId = this.generateSessionId();
    this.clearPersistedState();
    this.setStep(1);
    this.loadTeacherCourses();
    this.refreshView();
  }

  // ─── Query helpers ───────────────────────────────────────────────────────────

  getBankQuestions(sectionId: number): BankQuestion[] {
    return this.bankQuestionsBySection[sectionId] ?? [];
  }

  getVisibleQuestionOptions(
    question: Pick<TestQuestion, 'question_type' | 'options'>,
  ): TestQuestionOption[] {
    if (this.isNatType(question.question_type)) return [];
    return this.normalizeOptions(question.options);
  }

  getSelectedBankCount(sectionId: number): number {
    return this.getBankQuestions(sectionId).filter((q) => q.isSelected && !q.already_added).length;
  }

  getSectionQuestions(sectionId: number): TestQuestion[] {
    return this.reviewQuestions.filter((q) => Number(q.section_id) === Number(sectionId));
  }

  getAddedBankQuestions(sectionId: number): TestQuestion[] {
    return this.getSectionQuestions(sectionId).filter((q) => q.source === 'qb');
  }

  getQuestionSectionName(sectionId: number): string {
    return this.sections.find((s) => s.section_id === sectionId)?.section_name || 'Section';
  }

  getQuestionTypeLabel(type: string): string {
    const normalized = (type || '').toLowerCase();
    const labels: Record<string, string> = {
      mcq_single: 'MCQ Single Correct',
      mcq_multi: 'MCQ Multiple Correct',
      nat: 'NAT',
      numerical: 'NAT',
      match_list: 'Match List',
    };
    return labels[normalized] || type || 'Question';
  }

  canEditReviewQuestion(question: TestQuestion): boolean {
    return question.source === 'manual' || this.toBool(question.is_manual);
  }

  isReviewEditing(questionId: number): boolean {
    return !!this.reviewEditState[questionId];
  }

  isBankSectionLoading(sectionId: number): boolean {
    return !!this.bankLoadingBySection[sectionId];
  }

  formatDateTime(dt: string): string {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  }

  padNumber(n: number): string {
    return String(n || 0).padStart(2, '0');
  }

  trackBySectionId(_: number, section: SmeTestSection): number {
    return section.section_id;
  }

  trackByQuestionId(_: number, question: TestQuestion): number {
    return question.question_id;
  }

  trackByBankQuestionId(_: number, question: BankQuestion): number {
    return question.question_id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private prepareQuestionStep(mode: 'manual' | 'bank'): void {
    this.isCreatingTest = false;
    this.form.mode = mode;
    this.setStep(3);
    this.refreshView();
    if (mode === 'manual') {
      this.manualSectionId =
        this.currentManualSection?.section_id ?? this.sections[0]?.section_id ?? null;
      this.manualDraft = this.createManualDraft();
      return;
    }
    if (!this.sections.length && this.currentTest?.test_id) {
      this.refreshCurrentTest(() => {
        this.sections.forEach((s) => this.loadBankQuestions(s.section_id));
      });
      return;
    }
    this.sections.forEach((s) => this.loadBankQuestions(s.section_id));
  }

  private prepareForModeRecreate(): void {
    this.isCreatingTest = false;
    this.currentTest = null;
    this.bankQuestionsBySection = {};
    this.bankLoadingBySection = {};
    this.poolVisibilityBySection = {};
    this.reviewEditState = {};
    this.reviewDrafts = {};
    this.manualSectionId = null;
    this.manualDraft = this.createManualDraft();
    this.activeBankSaveSectionId = null;
    this.removingQuestionId = null;
    this.reviewSavingQuestionId = null;
    this.sessionId = this.generateSessionId();
  }

  private saveManualQuestion(finishAfterSave: boolean): void {
    const testId = this.getPersistedTestId();
    const section = this.currentManualSection;
    if (!testId || !section) {
      this.showToast('Create the test before adding questions', 'error');
      return;
    }
    if (!this.manualCanSave) {
      this.showToast('Complete the question form before saving', 'error');
      return;
    }

    const payload: any = {
      section_id: section.section_id,
      question_text: this.manualDraft.text.trim(),
      question_type: section.question_type,
      difficulty: this.manualDraft.difficulty,
      explanation: this.manualDraft.explanation.trim() || null,
    };

    if (this.currentManualIsNat) {
      payload.correct_answer = this.manualDraft.correctAnswer.trim();
      payload.options = [];
    } else {
      payload.options = this.manualDraft.options
        .filter((o) => o.text.trim())
        .map((o) => ({ option_text: o.text.trim(), is_correct: o.isCorrect }));
    }

    this.isSavingQuestion = true;
    this.smeService.addQuestion(testId, payload).subscribe({
      next: (res: any) => {
        this.bumpSectionProgress(section.section_id, 1);
        this.afterQuestionMutation(res.data?.message || 'Question saved successfully', () => {
          if (this.remainingQuestions === 0 || finishAfterSave) {
            this.setStep(4);
            return;
          }
          this.manualSectionId =
            this.currentManualSection?.section_id ?? this.sections[0]?.section_id ?? null;
          this.manualDraft = this.createManualDraft();
        });
      },
      error: (err: { error?: { message?: string } }) => {
        this.isSavingQuestion = false;
        this.showToast(err.error?.message || 'Failed to save question', 'error');
        this.refreshView();
      },
    });
  }

  private addBankQuestionsSequentially(sections: SmeTestSection[], index: number): void {
    if (index >= sections.length) {
      this.showToast('All sections confirmed and questions added successfully');
      this.setStep(4);
      return;
    }

    const section = sections[index];
    const selectedIds = this.getBankQuestions(section.section_id)
      .filter((q) => q.isSelected && !q.already_added)
      .slice(0, Number(section.remaining))
      .map((q) => q.question_id);

    if (!selectedIds.length) {
      this.addBankQuestionsSequentially(sections, index + 1);
      return;
    }

    const testId = this.getPersistedTestId();
    if (!testId) return;

    this.isFetchingBank = true;
    this.activeBankSaveSectionId = section.section_id;
    this.smeService
      .addQuestion(testId, { section_id: section.section_id, question_ids: selectedIds })
      .subscribe({
        next: () => {
          this.bumpSectionProgress(section.section_id, selectedIds.length);
          this.refreshCurrentTest(() => {
            this.loadBankQuestions(section.section_id);
            this.isFetchingBank = false;
            this.activeBankSaveSectionId = null;
            this.addBankQuestionsSequentially(sections, index + 1);
          });
        },
        error: (err: { error?: { message?: string } }) => {
          this.isFetchingBank = false;
          this.activeBankSaveSectionId = null;
          this.showToast(
            err.error?.message || `Failed to add questions for ${section.section_name}`,
            'error',
          );
          this.refreshView();
        },
      });
  }

  private afterQuestionMutation(message: string, callback?: () => void): void {
    this.refreshCurrentTest(() => {
      this.isSavingQuestion = false;
      this.isFetchingBank = false;
      this.activeBankSaveSectionId = null;
      this.showToast(message);
      callback?.();
      this.refreshView();
    });
  }

  private bumpSectionProgress(sectionId: number, delta: number): void {
    const section = this.sections.find((s) => Number(s.section_id) === Number(sectionId));
    if (!section) return;
    const nextAdded = Math.max(0, Number(section.questions_added || 0) + delta);
    const total = Number(section.num_questions || 0);
    const nextRemaining = Math.max(0, total - nextAdded);
    this.updateSectionProgress(sectionId, {
      questions_added: nextAdded,
      remaining: nextRemaining,
    });
  }

  private updateSectionProgress(
    sectionId: number,
    values: Partial<Pick<SmeTestSection, 'num_questions' | 'questions_added' | 'remaining'>>,
  ): void {
    if (!this.currentTest) return;
    this.currentTest = {
      ...this.currentTest,
      sections: this.currentTest.sections.map((s) =>
        Number(s.section_id) === Number(sectionId)
          ? {
              ...s,
              num_questions:
                values.num_questions !== undefined ? Number(values.num_questions) : s.num_questions,
              questions_added:
                values.questions_added !== undefined
                  ? Number(values.questions_added)
                  : s.questions_added,
              remaining: values.remaining !== undefined ? Number(values.remaining) : s.remaining,
            }
          : s,
      ),
    };
    this.refreshView();
  }

  private refreshCurrentTest(callback?: () => void): void {
    const testId = this.getPersistedTestId();
    if (!testId) {
      callback?.();
      return;
    }

    this.isRefreshingTest = true;
    this.smeService.getTestById(testId).subscribe({
      next: (res: any) => {
        this.currentTest = this.normalizeTest(res.data);
        if (this.currentTest.status === 'published') {
          this.reset();
          callback?.();
          this.refreshView();
          return;
        }
        this.form.mode = this.currentTest.question_source === 'qb' ? 'bank' : 'manual';
        this.form.totalQuestions = Number(this.currentTest.total_questions || 0);
        this.form.title = this.currentTest.title || this.form.title;
        this.form.subject_name = this.currentTest.subject || this.form.subject_name;
        this.isRefreshingTest = false;
        callback?.();
        this.refreshView();
      },
      error: () => {
        this.isRefreshingTest = false;
        callback?.();
        this.refreshView();
      },
    });
  }

  private normalizeTest(test: any): SmeTestDetail {
    return {
      ...test,
      total_questions: Number(test?.total_questions || 0),
      question_source: test?.question_source === 'qb' ? 'qb' : 'manual',
      sections: (test?.sections ?? []).map((s: any) => ({
        ...s,
        section_id: Number(s.section_id),
        subject_id: Number(s.subject_id ?? 0),
        num_questions: Number(s.num_questions || 0),
        questions_added: Number(s.questions_added || 0),
        remaining: Number(s.remaining || 0),
      })),
      questions: (test?.questions ?? []).map((q: any) => ({
        ...q,
        question_id: Number(q.question_id),
        section_id: Number(q.section_id),
        source:
          q?.source === 'manual' || q?.source === 'qb'
            ? q.source
            : Number(q?.is_manual) === 1
              ? 'manual'
              : 'qb',
        options: this.normalizeOptions(q.options),
      })),
    };
  }

  private normalizeOptions(options: any[]): TestQuestionOption[] {
    if (!Array.isArray(options)) return [];
    return options
      .filter((o) => {
        if (!o) return false;
        const hasText = typeof o.option_text === 'string' && o.option_text.trim().length > 0;
        const hasId = o.option_id !== null && o.option_id !== undefined;
        return hasText || hasId;
      })
      .map((o) => ({
        option_id: o?.option_id ? Number(o.option_id) : undefined,
        option_text: o?.option_text || '',
        option_image_url: o?.option_image_url || '',
        is_correct: o?.is_correct ?? false,
      }));
  }

  private createManualDraft(): ManualDraft {
    return {
      text: '',
      difficulty: 'medium',
      explanation: '',
      correctAnswer: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    };
  }

  private allowsMultipleCorrect(type?: string): boolean {
    const normalized = (type || '').toLowerCase();
    return normalized === 'mcq_multi' || normalized === 'match_list';
  }

  private isNatType(type?: string): boolean {
    const normalized = (type || '').toLowerCase();
    return normalized === 'nat' || normalized === 'numerical';
  }

  private normalizeDifficulty(value?: string): Difficulty {
    const normalized = (value || 'medium').toLowerCase();
    if (normalized === 'easy' || normalized === 'hard') return normalized;
    return 'medium';
  }

  private toBool(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  private getPersistedTestId(): number | null {
    const id = Number(this.currentTest?.test_id ?? 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private generateSessionId(): string {
    return 'Q-' + Math.floor(1000 + Math.random() * 9000) + '-B';
  }

  private restoreSelectedCourse(): void {
    if (!this.form.course_id) return;
    const selected =
      this.teacherCourses.find((c) => c.course_id === Number(this.form.course_id)) ?? null;
    if (!selected) return;
    this.selectedCourse = selected;
    this.form.subject_name = selected.subject_name || this.form.subject_name;
    this.form.exam_code = selected.exam_code || this.form.exam_code;
    this.form.exam_type = selected.exam_name || this.form.exam_type;
  }

  private getPersistableState(): PersistedBuilderState {
    return {
      version: 1,
      currentStep: this.currentStep,
      sessionId: this.sessionId,
      form: { ...this.form },
      currentTest: this.currentTest,
      manualSectionId: this.manualSectionId,
      bankQuestionsBySection: this.bankQuestionsBySection,
      reviewEditState: this.reviewEditState,
      reviewDrafts: this.reviewDrafts,
      manualDraft: this.manualDraft,
      poolVisibilityBySection: this.poolVisibilityBySection,
    };
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    const snapshot = JSON.stringify(this.getPersistableState());
    if (snapshot === this.lastPersistedSnapshot) return;
    localStorage.setItem(this.storageKey, snapshot);
    this.lastPersistedSnapshot = snapshot;
  }

  private hydratePersistedState(): void {
    if (typeof localStorage === 'undefined') return;

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;

    try {
      const state = JSON.parse(raw) as PersistedBuilderState;
      if (state.version !== 1) return;

      this.currentStep = [1, 2, 3, 4].includes(state.currentStep) ? state.currentStep : 1;
      this.sessionId = state.sessionId || this.sessionId;
      this.form = { ...this.form, ...(state.form || {}) };
      this.currentTest = state.currentTest ? this.normalizeTest(state.currentTest) : null;
      if (this.currentTest?.status === 'published') {
        this.clearPersistedState();
        return;
      }
      if (this.currentTest?.question_source) {
        this.form.mode = this.currentTest.question_source === 'qb' ? 'bank' : 'manual';
      }
      this.manualSectionId = state.manualSectionId ?? null;
      this.bankQuestionsBySection = state.bankQuestionsBySection || {};
      this.reviewEditState = state.reviewEditState || {};
      this.reviewDrafts = state.reviewDrafts || {};
      this.manualDraft = state.manualDraft || this.createManualDraft();
      this.poolVisibilityBySection = state.poolVisibilityBySection || {};
      this.isCreatingTest = false;
      this.syncStepStatuses();
      this.lastPersistedSnapshot = JSON.stringify(this.getPersistableState());
      this.refreshView();
      this.syncRouteState();
    } catch {
      this.clearPersistedState();
    }
  }

  private clearPersistedState(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.storageKey);
    this.lastPersistedSnapshot = '';
  }

  private showToast(message: string, type: ToastType = 'success'): void {
    this.toastMsg = message;
    this.toastType = type;
    this.toast = true;
    this.refreshView();
    setTimeout(() => (this.toast = false), 2800);
  }

  private refreshView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }

  private syncStepStatuses(): void {
    this.steps = this.steps.map((step, index) => ({
      ...step,
      status:
        index + 1 < this.currentStep
          ? 'completed'
          : index + 1 === this.currentStep
            ? 'in-progress'
            : 'upcoming',
    }));
  }

  private hydrateStepFromRoute(): void {
    const step = Number(this.route.snapshot.queryParamMap.get('step'));
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'manual' || mode === 'bank') this.form.mode = mode;
    if ([1, 2, 3, 4].includes(step)) {
      this.currentStep = step;
      this.syncStepStatuses();
    }
  }

  private syncRouteState(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: this.currentStep, mode: this.form.mode || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
