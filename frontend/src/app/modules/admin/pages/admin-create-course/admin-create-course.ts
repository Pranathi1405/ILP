import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CourseManagementService } from '../../../../core/services/admin/course-management/course-management';

interface Category {
  category_id: number;
  category_name: string;
  description: string;
  thumbnail: string;
  display_order: number;
}

interface Teacher {
  teacher_id?: number;
  teacher_name: string;
  department: string;
}

interface SubjectRow {
  subjectName: string;
  teacherId: number | null;
  teacherName: string;
}

@Component({
  selector: 'app-admin-create-course',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-create-course.html'
})
export class AdminCreateCourse implements OnInit {

  currentStep = 1;

  // ── Step 1 ──────────────────────────────────────────
  categories: Category[] = [];
  selectedCategoryId: number | null = null;
  categoriesLoading = false;
  categoriesError = '';

  showCreateCategoryModal = false;
  newCategoryName = '';
  newCategoryDescription = '';
  createCategoryLoading = false;
  createCategoryError = '';
  createCategorySuccess = '';

  // ── Step 2 ──────────────────────────────────────────
  subjects: SubjectRow[] = [{ subjectName: '', teacherId: null, teacherName: '' }];
  subjectTeachers: Teacher[][] = [[]];
  teachersLoadingPerRow: boolean[] = [false];
  step2Error = '';

  // ── Step 3: Basic Info ───────────────────────────────
  courseName = '';
  courseCode = '';
  description = '';
  price: number = 0;
  isFree = false;
  difficultyLevel = 'beginner';
  medium = 'english';
  startDate = '';
  endDate = '';
  isPublished = false;

  // ── Step 3: Thumbnail ────────────────────────────────
  thumbnailUrl = '';

  // ── Step 3: Prerequisites ────────────────────────────
  prerequisites: string[] = [];
  newPrerequisite = '';
  prereqError = '';

  // ── Step 3: Learning Outcomes ────────────────────────
  learningOutcomes: string[] = [];
  newOutcome = '';
  outcomesError = '';

  // ── Submission ───────────────────────────────────────
  isSubmitting = false;
  submitError = '';

  constructor(
    private courseService: CourseManagementService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  // ── Step 1: Categories ───────────────────────────────

  loadCategories() {
    this.categoriesLoading = true;
    this.categoriesError = '';
    this.courseService.getCategories().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.categories = res;
        } else if (Array.isArray(res?.data)) {
          this.categories = res.data;
        } else {
          this.categories = [];
        }
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriesError = 'Failed to load categories. Please try again.';
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateCategoryModal() {
    this.showCreateCategoryModal = true;
    this.newCategoryName = '';
    this.newCategoryDescription = '';
    this.createCategoryError = '';
    this.createCategorySuccess = '';
  }

  closeCreateCategoryModal() {
    this.showCreateCategoryModal = false;
  }

  submitNewCategory() {
    if (!this.newCategoryName.trim()) {
      this.createCategoryError = 'Category name is required.';
      return;
    }
    this.createCategoryLoading = true;
    this.createCategoryError = '';
    this.createCategorySuccess = '';

    this.courseService.createCategory({
      categoryName: this.newCategoryName.trim(),
      description: this.newCategoryDescription.trim()
    }).subscribe({
      next: (res: any) => {
        this.createCategorySuccess = 'Category created successfully!';
        this.createCategoryLoading = false;
        this.loadCategories();
        setTimeout(() => {
          this.closeCreateCategoryModal();
          const newId = res?.categoryId ?? res?.data?.category_id ?? null;
          if (newId) {
            this.selectedCategoryId = newId;
            this.cdr.detectChanges();
          }
        }, 1000);
      },
      error: (err: any) => {
        this.createCategoryError = err?.error?.message || 'Failed to create category.';
        this.createCategoryLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Step 2: Teachers ─────────────────────────────────

  loadTeachersForSubject(index: number) {
    const subjectName = this.subjects[index].subjectName;
    if (!subjectName) return;

    this.subjects[index].teacherId = null;
    this.subjects[index].teacherName = '';
    this.subjectTeachers[index] = [];
    this.teachersLoadingPerRow[index] = true;
    this.step2Error = '';

    this.courseService.getTeachersByDepartment(subjectName).subscribe({
      next: (res: any) => {
        this.subjectTeachers[index] = res?.data ?? [];
        this.teachersLoadingPerRow[index] = false;
        console.log('Teachers loaded for index', index, ':', this.subjectTeachers[index]);
        this.cdr.detectChanges();
      },
      error: () => {
        this.step2Error = `Failed to load teachers for ${subjectName}. Please try again.`;
        this.teachersLoadingPerRow[index] = false;
        this.cdr.detectChanges();
      }
    });
  }

  addSubject() {
    this.subjects.push({ subjectName: '', teacherId: null, teacherName: '' });
    this.subjectTeachers.push([]);
    this.teachersLoadingPerRow.push(false);
  }

  removeSubject(index: number) {
    if (this.subjects.length > 1) {
      this.subjects.splice(index, 1);
      this.subjectTeachers.splice(index, 1);
      this.teachersLoadingPerRow.splice(index, 1);
    }
  }

  onTeacherSelect(index: number, value: any) {
    console.log('selected value:', value);
    console.log('available teachers:', JSON.stringify(this.subjectTeachers[index]));

    const teacher = this.subjectTeachers[index]?.find(
      t => t.teacher_name === value
    );
    console.log('matched teacher:', JSON.stringify(teacher));

    this.subjects[index].teacherName = value ?? '';
    // Use teacher_id if available from API, otherwise store -1 as placeholder
    // so backend fix can be applied later
    this.subjects[index].teacherId = teacher?.teacher_id
      ? Number(teacher.teacher_id)
      : null;

    console.log('subjects after select:', JSON.stringify(this.subjects));
    this.cdr.detectChanges();
  }

  getTeacherName(teacherId: number | null, index: number): string {
    const name = this.subjects[index]?.teacherName;
    return name && name.trim() !== '' ? name : 'Not assigned';
  }

  isStep2Valid(): boolean {
    return this.subjects.every(s =>
      s.subjectName.trim() !== '' &&
      s.teacherName.trim() !== ''
    );
  }

  // ── Step 3: Prerequisites ────────────────────────────

  addPrerequisite() {
    const val = this.newPrerequisite.trim();
    if (!val) return;
    if (this.prerequisites.includes(val)) {
      this.prereqError = 'This prerequisite is already added.';
      return;
    }
    this.prerequisites.push(val);
    this.newPrerequisite = '';
    this.prereqError = '';
  }

  removePrerequisite(index: number) {
    this.prerequisites.splice(index, 1);
  }

  // ── Step 3: Learning Outcomes ────────────────────────

  addLearningOutcome() {
    const val = this.newOutcome.trim();
    if (!val) return;
    if (this.learningOutcomes.includes(val)) {
      this.outcomesError = 'This outcome is already added.';
      return;
    }
    this.learningOutcomes.push(val);
    this.newOutcome = '';
    this.outcomesError = '';
  }

  removeLearningOutcome(index: number) {
    this.learningOutcomes.splice(index, 1);
  }

  // ── Step Navigation ──────────────────────────────────

  nextStep() {
    console.log('subjects state:', JSON.stringify(this.subjects));

    if (this.currentStep === 1) {
      if (!this.selectedCategoryId) {
        this.categoriesError = 'Please select a category before proceeding.';
        return;
      }
      this.categoriesError = '';
    }

    if (this.currentStep === 2) {
      this.step2Error = '';

      for (let i = 0; i < this.subjects.length; i++) {
        const s = this.subjects[i];

        if (!s.subjectName || s.subjectName.trim() === '') {
          this.step2Error = `Row ${i + 1}: Please select a subject.`;
          return;
        }

        if (!s.teacherName || s.teacherName.trim() === '') {
          this.step2Error = `Row ${i + 1}: Please assign a teacher.`;
          return;
        }
      }
    }

    if (this.currentStep < 3) {
      this.currentStep++;
      this.cdr.detectChanges();
    }
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  goToStep(step: number) {
    this.currentStep = step;
  }

  get selectedCategoryName(): string {
    const cat = this.categories.find(c => c.category_id === this.selectedCategoryId);
    return cat ? cat.category_name : 'Not selected';
  }

  // ── Step 3: Submit ───────────────────────────────────

  saveAsDraft() {
    this.isPublished = false;
    this.submitCourse();
  }

  confirmAndPublish() {
    this.isPublished = true;
    this.submitCourse();
  }

  submitCourse() {
    this.submitError = '';

    if (!this.courseName.trim()) {
      this.submitError = 'Course name is required.';
      return;
    }
    if (!this.startDate || !this.endDate) {
      this.submitError = 'Start date and end date are required.';
      return;
    }

    // ── Validate all subjects have teacherId ──────────
    const missingTeacher = this.subjects.find(s => !s.teacherId);
    if (missingTeacher) {
      this.submitError = `Teacher ID missing for subject "${missingTeacher.subjectName}". Please restart backend and try again.`;
      return;
    }

    this.isSubmitting = true;

    const coursePayload = {
      courseName:       this.courseName.trim(),
      courseCode:       this.courseCode.trim() || null,
      description:      this.description.trim() || null,
      categoryId:       this.selectedCategoryId,
      isFree:           this.isFree,
      price:            this.isFree ? 0 : this.price,
      difficultyLevel:  this.difficultyLevel,
      medium:           this.medium,
      startDate:        this.startDate,
      endDate:          this.endDate,
      isPublished:      this.isPublished,
      thumbnailUrl:     this.thumbnailUrl.trim() || null,
      prerequisites:    this.prerequisites.length > 0 ? this.prerequisites : null,
      learningOutcomes: this.learningOutcomes.length > 0 ? this.learningOutcomes : null
    };

    this.courseService.createCourse(coursePayload).subscribe({
      next: (res: any) => {
        console.log('Course creation response:', JSON.stringify(res));

        // ── Handle both courseId and course_id in response ──
        const courseId = res?.courseId ?? res?.course_id ?? res?.data?.course_id;
        console.log('Resolved courseId:', courseId);

        if (!courseId) {
          this.isSubmitting = false;
          this.submitError = 'Course created but ID not returned. Contact backend team.';
          this.cdr.detectChanges();
          return;
        }

        const subjectCalls = this.subjects.map(s => {
          console.log('Creating subject:', s.subjectName, 'teacherId:', s.teacherId);
          return this.courseService.createSubject({
            courseId,
            teacherId: s.teacherId!,
            title: s.subjectName.trim()
          }).toPromise();
        });

       Promise.all(subjectCalls).then(() => {
  this.isSubmitting = false;
  // Show success toast or alert first
  alert('Course published successfully! 🎉');
  this.router.navigate(['/admin/course-management']);
}).catch((err: any) => {
          this.isSubmitting = false;
          this.submitError = err?.error?.message || 'Course created but some subjects failed.';
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message || 'Failed to create course. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}