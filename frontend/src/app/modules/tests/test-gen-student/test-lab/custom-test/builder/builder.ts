// Author: E.Kaeith Emmanuel
import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AppState } from '../../../../../../core/states/appstate';
import { createTest } from '../../../../../../core/states/custom-test/test.actions';
import {
  UgTestService,
  UgExam,
  UgSubject,
  UgChapter,
} from '../../../../../../core/services/tests/custom-tests/custom-test';
import { mapQuestions } from '../../../../../../core/utils/questionmap';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder.html',
})
export class Builder implements OnInit {
  constructor(
    private ugTestService: UgTestService,
    private store: Store<AppState>,
    private router: Router,
    private cdRef: ChangeDetectorRef,
  ) {}

  formData: {
    exam_name: string;
    exam_code: string;
    paper_number: number;
    testType: 'multi-subject' | 'topic-based' | '';
    selectedSubjects: UgSubject[];
    selectedSubject: UgSubject | null;
    selectedChapters: UgChapter[];
    difficulty: string;
  } = {
    exam_name: '',
    exam_code: '',
    paper_number: 1,
    testType: '',
    selectedSubjects: [],
    selectedSubject: null,
    selectedChapters: [],
    difficulty: '',
  };

  subjectDropdownOpen = false;
  chapterDropdownOpen = false;
  subjectSearch = '';
  chapterSearch = '';

  availableExams: UgExam[] = [];
  allSubjects: UgSubject[] = [];
  allChapters: UgChapter[] = [];
  difficulties: string[] = ['Easy', 'Medium', 'Hard'];

  isLoading = false;
  isLoadingSubjects = false;
  isLoadingChapters = false;
  isLoadingPattern = false;
  isGenerating = false;
  errorMessage = '';
  autoCalculatedDurationMins = 0;
  private patternRequestId = 0;
  private patternDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPatternRequestKey = '';

  ngOnInit() {
    this.loadExams();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.subject-dropdown-wrapper')) this.subjectDropdownOpen = false;
    if (!target.closest('.chapter-dropdown-wrapper')) this.chapterDropdownOpen = false;
  }

  loadExams() {
    this.isLoading = true;
    this.errorMessage = '';
    this.ugTestService
      .getAvailableExams()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          this.availableExams = res.data ?? [];

          if (this.availableExams.length > 0) {
            const currentExam = this.availableExams.find(
              (exam) => exam.exam_code === this.formData.exam_code,
            );
            // Defer setting ngModel-bound value to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
            queueMicrotask(() => {
              this.formData.exam_code = currentExam?.exam_code ?? this.availableExams[0].exam_code;
              this.onExamChange();
              this.cdRef.detectChanges();
            });
          }
        },
        error: (err) => {
          this.availableExams = [];
          this.errorMessage = err.error?.message || 'Failed to load exams.';
        },
      });
  }

  onExamChange() {
    const selected = this.availableExams.find((e) => e.exam_code === this.formData.exam_code);
    this.formData.exam_name = selected?.exam_name ?? '';
    this.formData.testType = '';
    this.formData.selectedSubjects = [];
    this.formData.selectedSubject = null;
    this.formData.selectedChapters = [];
    this.formData.difficulty = '';
    this.allSubjects = [];
    this.allChapters = [];
    this.errorMessage = '';
    this.subjectDropdownOpen = false;
    this.chapterDropdownOpen = false;
    this.autoCalculatedDurationMins = 0;

    if (this.formData.exam_code) {
      this.loadSubjects();
    }
  }

  onTestTypeChange() {
    this.formData.selectedSubjects = [];
    this.formData.selectedSubject = null;
    this.formData.selectedChapters = [];
    this.allChapters = [];
    this.errorMessage = '';
    this.autoCalculatedDurationMins = 0;

    if (this.formData.exam_code && this.allSubjects.length === 0) {
      this.loadSubjects();
    }

    this.refreshAutoCalculatedTime();
  }

  loadSubjects() {
    this.isLoadingSubjects = true;
    this.allSubjects = [];
    this.ugTestService
      .getSubjectsForExam(this.formData.exam_code)
      .pipe(finalize(() => (this.isLoadingSubjects = false)))
      .subscribe({
        next: (res) => {
          this.allSubjects = res.data ?? [];
        },
        error: (err) => {
          this.allSubjects = [];
          this.errorMessage = err.error?.message || 'Failed to load subjects.';
        },
      });
  }

  toggleSubject(subject: UgSubject) {
    const idx = this.formData.selectedSubjects.findIndex(
      (s) => s.subject_id === subject.subject_id,
    );
    if (idx > -1) this.formData.selectedSubjects.splice(idx, 1);
    else this.formData.selectedSubjects.push(subject);
    this.refreshAutoCalculatedTime();
  }

  isSubjectSelected(subject: UgSubject): boolean {
    return this.formData.selectedSubjects.some(
      (s) => s.subject_id === subject.subject_id,
    );
  }

  removeSubject(subject: UgSubject) {
    this.formData.selectedSubjects = this.formData.selectedSubjects.filter(
      (s) => s.subject_id !== subject.subject_id,
    );
    this.refreshAutoCalculatedTime();
  }

  onSingleSubjectChange() {
    this.formData.selectedChapters = [];
    this.allChapters = [];
    this.chapterDropdownOpen = false;
    this.chapterSearch = '';
    this.autoCalculatedDurationMins = 0;
    this.refreshAutoCalculatedTime();
    if (!this.formData.selectedSubject) return;
    this.isLoadingChapters = true;
    this.ugTestService
      .getChaptersBySubject(this.formData.selectedSubject.subject_id)
      .pipe(finalize(() => (this.isLoadingChapters = false)))
      .subscribe({
        next: (res) => {
          this.allChapters = res.data ?? [];
        },
        error: () => {
          this.allChapters = [];
        },
      });
  }

  toggleChapter(chapter: UgChapter) {
    const idx = this.formData.selectedChapters.findIndex(
      (c) => c.chapter_id === chapter.chapter_id,
    );
    if (idx > -1) this.formData.selectedChapters.splice(idx, 1);
    else this.formData.selectedChapters.push(chapter);
    this.refreshAutoCalculatedTime();
  }

  isChapterSelected(chapter: UgChapter): boolean {
    return this.formData.selectedChapters.some((c) => c.chapter_id === chapter.chapter_id);
  }

  removeChapter(chapter: UgChapter) {
    this.formData.selectedChapters = this.formData.selectedChapters.filter(
      (c) => c.chapter_id !== chapter.chapter_id,
    );
    this.refreshAutoCalculatedTime();
  }

  onDifficultySelect(level: string) {
    this.formData.difficulty = level;
    this.refreshAutoCalculatedTime();
  }

  filteredSubjects(): UgSubject[] {
    return this.allSubjects.filter((s) =>
      s.subject_name.toLowerCase().includes(this.subjectSearch.toLowerCase()),
    );
  }

  filteredChapters(): UgChapter[] {
    return this.allChapters.filter((c) =>
      c.chapter_name.toLowerCase().includes(this.chapterSearch.toLowerCase()),
    );
  }

  get isFormValid(): boolean {
    if (!this.formData.exam_code || !this.formData.testType || !this.formData.difficulty)
      return false;
    if (this.formData.testType === 'multi-subject' && this.formData.selectedSubjects.length === 0)
      return false;
    if (this.formData.testType === 'topic-based' && !this.formData.selectedSubject) return false;
    return true;
  }

  get autoTimeLabel(): string {
    if (this.isLoadingPattern) return 'Calculating...';
    if (this.autoCalculatedDurationMins > 0) return `${this.autoCalculatedDurationMins} Min`;
    return 'Select subject(s) to calculate';
  }

  private refreshView(): void {
    queueMicrotask(() => this.cdRef.detectChanges());
  }

  private clearScheduledPatternRequest(): void {
    if (!this.patternDebounceTimer) return;
    clearTimeout(this.patternDebounceTimer);
    this.patternDebounceTimer = null;
  }

  private getSelectedSubjectIds(): number[] {
    if (this.formData.testType === 'multi-subject') {
      return this.formData.selectedSubjects.map((s) => s.subject_id).filter(Boolean);
    }

    if (this.formData.testType === 'topic-based' && this.formData.selectedSubject) {
      return [this.formData.selectedSubject.subject_id];
    }

    return [];
  }

  private getSelectedModuleIds(): number[] {
    return this.formData.selectedChapters.map((c) => c.chapter_id).filter(Boolean);
  }

  private refreshAutoCalculatedTime() {
    const subjectIds = this.getSelectedSubjectIds();
    const moduleIds = this.getSelectedModuleIds();

    if (!this.formData.exam_code || !this.formData.testType || subjectIds.length === 0) {
      this.clearScheduledPatternRequest();
      this.lastPatternRequestKey = '';
      this.autoCalculatedDurationMins = 0;
      this.isLoadingPattern = false;
      this.refreshView();
      return;
    }

    const requestKey = JSON.stringify({
      examCode: this.formData.exam_code,
      testType: this.formData.testType,
      subjectIds: [...subjectIds].sort((a, b) => a - b),
      difficulty: this.formData.difficulty || '',
      moduleIds: [...moduleIds].sort((a, b) => a - b),
    });

    if (requestKey === this.lastPatternRequestKey && this.autoCalculatedDurationMins > 0) {
      this.clearScheduledPatternRequest();
      this.isLoadingPattern = false;
      this.refreshView();
      return;
    }

    this.clearScheduledPatternRequest();
    this.isLoadingPattern = true;
    this.refreshView();

    this.patternDebounceTimer = setTimeout(() => {
      this.patternDebounceTimer = null;
      this.lastPatternRequestKey = requestKey;

      const requestId = ++this.patternRequestId;

      this.ugTestService
        .getExamPattern(
          this.formData.exam_code,
          subjectIds,
          this.formData.difficulty,
          moduleIds,
        )
        .pipe(
          finalize(() => {
            if (requestId === this.patternRequestId) {
              this.isLoadingPattern = false;
              this.refreshView();
            }
          }),
        )
        .subscribe({
          next: (res) => {
            if (requestId !== this.patternRequestId) return;
            this.autoCalculatedDurationMins = Number(res.data?.duration_mins ?? 0);
            this.refreshView();
          },
          error: () => {
            if (requestId !== this.patternRequestId) return;
            this.autoCalculatedDurationMins = 0;
            this.lastPatternRequestKey = '';
            this.refreshView();
          },
        });
    }, 250);
  }

  openInstructions() {
    if (!this.isFormValid || this.isGenerating) return;

    this.isGenerating = true;
    this.errorMessage = '';

    const payload = {
      exam_code: this.formData.exam_code,
      paper_number: this.formData.paper_number,
      test_type: this.formData.testType as 'multi-subject' | 'topic-based',
      difficulty: this.formData.difficulty,
      ...(this.formData.testType === 'multi-subject' && {
        subjects: this.formData.selectedSubjects.map((s) => s.subject_id),
      }),
      ...(this.formData.testType === 'topic-based' && {
        subjects: [this.formData.selectedSubject!.subject_id],
        ...(this.formData.selectedChapters.length > 0 && {
          module_ids: this.formData.selectedChapters.map((c) => c.chapter_id),
          chapters: this.formData.selectedChapters.map((c) => c.chapter_name),
        }),
      }),
    };

    this.ugTestService.generateTest(payload).subscribe({
      next: (res) => {
        const test = res.data;
        const mappedQuestions = mapQuestions(test.questions ?? [], test.has_partial_marking === 1);

        this.store.dispatch(
          createTest({
            testData: {
              questions: mappedQuestions,
              // FIX: store exam_code (not exam_name) so test-pattern.ts can fetch
              // GET /api/ug-tests/exams/:examCode/pattern correctly.
              // exam_name is stored separately as examTitle for the interface header.
              exam: this.formData.exam_code,
              examTitle: this.formData.exam_name,
              subjects:
                this.formData.testType === 'multi-subject'
                  ? this.formData.selectedSubjects.map((s) => s.subject_name)
                  : this.formData.selectedSubject
                    ? [this.formData.selectedSubject.subject_name]
                    : [],
              subjectIds:
                this.formData.testType === 'multi-subject'
                  ? this.formData.selectedSubjects.map((s) => s.subject_id)
                  : this.formData.selectedSubject
                    ? [this.formData.selectedSubject.subject_id]
                    : [],
              chapters: this.formData.selectedChapters.map((c) => c.chapter_name),
              difficulty: this.formData.difficulty,
              testType: this.formData.testType,
              timeLimit: test.duration_minutes,
              testId: test.test_id,
              // Store marking info so instructions page can display it
              marksCorrect: test.questions?.[0]
                ? ((test.questions[0] as any).marks_correct ?? 0)
                : 0,
              marksIncorrect: test.questions?.[0]
                ? ((test.questions[0] as any).marks_incorrect ?? 0)
                : 0,
            },
          }),
        );

        this.isGenerating = false;
        // Navigate to test-pattern page (not instructions directly)
        this.router.navigate(['/student-test/test-pattern']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to generate test. Please try again.';
        this.isGenerating = false;
      },
    });
  }
}
