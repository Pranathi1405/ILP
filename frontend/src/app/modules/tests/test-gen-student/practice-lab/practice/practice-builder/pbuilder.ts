import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CreatePracticeTestPayload } from '../../../../../../core/models/practice-test.model';
import { PracticeService } from '../../../../../../core/services/tests/practice-tests/practiceservice';
import {
  StudentCourseService,
  StudentLinkedCourse,
  StudentLinkedModule,
  StudentLinkedSubject,
} from '../../../../../../core/services/student/student-course.service';

@Component({
  selector: 'app-practice-builder',
  templateUrl: './pbuilder.html',
  imports: [FormsModule],
})
export class Pbuilder implements OnInit {
  formData: {
    courseId: number | '';
    testType: '' | 'subject' | 'chapter' | 'custom';
    subject: string;
    subjectId: number | '';
    chapter: string;
    topic: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    numberOfQuestions: number;
    types: Array<'MCQ' | 'MSQ' | 'NAT'>;
  } = {
    courseId: '',
    testType: '',
    subject: '',
    subjectId: '',
    chapter: '',
    topic: '',
    difficulty: 'Easy',
    numberOfQuestions: 10,
    types: [],
  };

  isLoading = false;
  isLoadingCourses = false;
  isLoadingSubjects = false;
  isLoadingChapters = false;
  errorMessage = '';

  questionTypes: Array<'MCQ' | 'MSQ' | 'NAT'> = ['MCQ', 'MSQ', 'NAT'];
  difficultyLevels: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];

  private enrolledCourses: StudentLinkedCourse[] = [];
  private allSubjects: StudentLinkedSubject[] = [];
  private allChapters: StudentLinkedModule[] = [];

  constructor(
    private practiceService: PracticeService,
    private studentCourseService: StudentCourseService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPracticeContext();
  }

  private loadPracticeContext(): void {
    this.isLoadingCourses = true;
    this.errorMessage = '';
    this.enrolledCourses = [];
    this.allSubjects = [];
    this.allChapters = [];
    this.cdr.markForCheck();

    this.studentCourseService
      .getEnrolledCourses()
      .pipe(
        finalize(() => {
          this.isLoadingCourses = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.enrolledCourses = Array.isArray(res.data) ? res.data : [];

          if (!this.enrolledCourses.length) {
            this.errorMessage = 'No linked courses found for practice tests.';
            return;
          }

          if (this.enrolledCourses.length === 1) {
            this.formData.courseId = this.enrolledCourses[0].course_id;
            this.loadSubjects(Number(this.formData.courseId));
            return;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load linked courses.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadSubjects(courseId: number): void {
    this.isLoadingSubjects = true;
    this.errorMessage = '';
    this.allSubjects = [];
    this.allChapters = [];
    this.formData.subjectId = '';
    this.formData.subject = '';
    this.formData.chapter = '';
    this.formData.topic = '';
    this.cdr.markForCheck();

    this.studentCourseService
      .getSubjectsByCourse(courseId)
      .pipe(
        finalize(() => {
          this.isLoadingSubjects = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.allSubjects = Array.isArray(res.data) ? res.data : [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load subjects.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadChapters(subjectId: number): void {
    this.isLoadingChapters = true;
    this.allChapters = [];
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.studentCourseService
      .getModulesBySubject(subjectId)
      .pipe(
        finalize(() => {
          this.isLoadingChapters = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.allChapters = Array.isArray(res.data) ? res.data : [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load chapters.';
          this.cdr.detectChanges();
        },
      });
  }

  courses(): { id: number; label: string }[] {
    return this.enrolledCourses.map((course) => ({
      id: course.course_id,
      label: course.course_name,
    }));
  }

  subjects(): { id: number; label: string }[] {
    return this.allSubjects.map((s) => ({
      id: s.subject_id,
      label: s.subject_name,
    }));
  }

  chapters(): { id: number; label: string }[] {
    return this.allChapters.map((c) => ({
      id: c.module_id,
      label: c.module_name,
    }));
  }

  topics(): string[] {
    return [];
  }

  get showChapter(): boolean {
    return this.formData.testType === 'chapter';
  }

  get showTopic(): boolean {
    return false;
  }

  warning(): string {
    if (!this.formData.types.length) {
      return 'Select at least one question type.';
    }
    if (this.formData.numberOfQuestions < 1 || this.formData.numberOfQuestions > 100) {
      return 'Number of questions must be between 1 and 100.';
    }
    return '';
  }

  isTypeChecked(type: 'MCQ' | 'MSQ' | 'NAT'): boolean {
    return this.formData.types.includes(type);
  }

  onTypeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value as 'MCQ' | 'MSQ' | 'NAT';

    if (target.checked) {
      if (!this.formData.types.includes(value)) {
        this.formData.types = [...this.formData.types, value];
      }
      return;
    }

    this.formData.types = this.formData.types.filter((t) => t !== value);
  }

  onTestTypeChange(): void {
    this.formData.chapter = '';
    this.formData.topic = '';

    if (this.formData.subjectId) {
      this.loadChapters(Number(this.formData.subjectId));
    }
  }

  onCourseChange(): void {
    this.errorMessage = '';
    this.allSubjects = [];
    this.allChapters = [];
    this.formData.subject = '';
    this.formData.subjectId = '';
    this.formData.chapter = '';
    this.formData.topic = '';
    this.cdr.detectChanges();

    const courseId = Number(this.formData.courseId);
    if (courseId) {
      this.loadSubjects(courseId);
    }
  }

  onSubjectChange(): void {
    this.formData.chapter = '';
    this.formData.topic = '';
    this.allChapters = [];
    this.errorMessage = '';
    this.formData.subject =
      this.allSubjects.find((s) => s.subject_id === Number(this.formData.subjectId))
        ?.subject_name ?? '';
    this.cdr.detectChanges();

    if (this.formData.subjectId) {
      this.loadChapters(Number(this.formData.subjectId));
    }
  }

  onChapterChange(): void {
    this.formData.topic = '';
  }

  private getChapterIds(): number[] {
    const id = Number(this.formData.chapter);
    return id ? [id] : [];
  }

  private mapTypes(types: Array<'MCQ' | 'MSQ' | 'NAT'>): Array<'mcq' | 'mcq_multi' | 'numerical'> {
    const map: Record<'MCQ' | 'MSQ' | 'NAT', 'mcq' | 'mcq_multi' | 'numerical'> = {
      MCQ: 'mcq',
      MSQ: 'mcq_multi',
      NAT: 'numerical',
    };
    return types.map((t) => map[t]);
  }

  buildTest(): void {
    const courseId = Number(this.formData.courseId);
    const subjectId = Number(this.formData.subjectId);

    if (!courseId) {
      this.errorMessage = 'Please select a linked course.';
      return;
    }
    if (!subjectId) {
      this.errorMessage = 'Please select a subject.';
      return;
    }
    if (!this.formData.types.length) {
      this.errorMessage = 'Please select at least one question type.';
      return;
    }

    const subjectLabel =
      this.formData.subject ||
      this.allSubjects.find((s) => s.subject_id === subjectId)?.subject_name ||
      'Practice';

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const payload: CreatePracticeTestPayload = {
      courseId,
      subjectId,
      numQuestions: Number(this.formData.numberOfQuestions),
      questionTypes: this.mapTypes(this.formData.types),
      difficulty: this.formData.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      chapterIds: this.getChapterIds(),
      marksCorrect: 1,
      marksIncorrect: 0,
      title: `${subjectLabel} Practice - ${new Date().toLocaleDateString('en-IN')}`,
    };

    this.practiceService.createTest(payload).subscribe({
      next: (test) => {
        this.isLoading = false;
        const testId = test?.test_id;
        if (!testId) {
          this.errorMessage = 'Test created but no test ID returned.';
          this.cdr.detectChanges();
          return;
        }
        this.cdr.detectChanges();
        this.router.navigate(['/student-test/practice-instructions', testId]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to create test. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }
}
