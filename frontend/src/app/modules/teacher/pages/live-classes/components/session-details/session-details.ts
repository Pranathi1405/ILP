// Author: Poojitha
// Schedule-New-class page Session-details Component

import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule,FormBuilder,FormGroup,Validators,FormsModule } from '@angular/forms';
import { LiveClassStateService } from '../../services/live-class-state.service';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';

@Component({
  selector: 'app-session-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './session-details.html',
  styleUrl: './session-details.css',
})
export class SessionDetails implements OnInit, OnChanges {
  sessionForm!: FormGroup;
  today = new Date().toISOString().split('T')[0];

  isPatching = false;
  filteredSubjects: any[] = [];
  filteredModules: any[] = [];
  courses: any[] = [];

  @Input() session: any;

  constructor(
    private fb: FormBuilder,
    private state: LiveClassStateService,
    private liveClassService: LiveClassService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const initialValues = {
      title: '',
      course: '',
      subject: '',
      module: '',
      date: '',
      time: '',
      duration: '',
    };

    this.sessionForm = this.fb.group({
      title: [initialValues.title, Validators.required],
      course: [initialValues.course, Validators.required],
      subject: [initialValues.subject, Validators.required],
      module: [initialValues.module, Validators.required],
      date: [initialValues.date, Validators.required],
      time: [initialValues.time, Validators.required],
      duration: [initialValues.duration, [Validators.required, Validators.min(1)]],
    });

    // COURSE CHANGE 
    this.sessionForm.get('course')?.valueChanges.subscribe((courseId) => {
      if (this.isPatching) return;
      if (!courseId) return;

      this.loadSubjects(courseId);

      this.sessionForm.get('subject')?.reset();
      this.sessionForm.get('module')?.reset();
      this.filteredModules = [];
    });

    // SUBJECT CHANGE 
    this.sessionForm.get('subject')?.valueChanges.subscribe((subjectId) => {
      if (this.isPatching) return;
      if (!subjectId) return;

      this.loadModules(subjectId);

      this.sessionForm.get('module')?.reset();
    });

    //  MODULE CHANGE
    this.sessionForm.get('module')?.valueChanges.subscribe((moduleId) => {
      if (this.isPatching) return;
      if (!moduleId) return;
    });

    // updates state
    this.sessionForm.valueChanges.subscribe((value) => {
      const selectedCourse = this.courses.find(
        (c) => c.course_id === Number(value.course)
      );

      const selectedSubject = this.filteredSubjects.find(
        (s) => s.subject_id === Number(value.subject)
      );

      const selectedModule = this.filteredModules.find(
        (m) => m.module_id === Number(value.module)
      );

      this.state.updateSession({
        ...value,
        course_name: selectedCourse?.course_name || '',
        subject_name: selectedSubject?.subject_name || '',
        module_name: selectedModule?.module_name || '',
      });
    });

    this.loadCourses();
  }

  //  EDIT MODE PATCH
  populateEditData() {
    if (!this.session || !this.sessionForm) return;

    this.isPatching = true;

    const selectedCourse = this.courses.find(
      c => c.course_name === this.session.course
    );

    const courseId = selectedCourse?.course_id;

    if (!courseId) return;

    //  Load subjects
    this.liveClassService.getSubjectsByCourse(courseId).subscribe({
      next: (subRes) => {
        this.filteredSubjects = subRes.data || [];

        const selectedSubject = this.filteredSubjects.find(
          s => s.subject_name === this.session.subject
        );

        const subjectId = selectedSubject?.subject_id;

        if (!subjectId) return;

        //  Load modules
        this.liveClassService.getModulesBySubject(subjectId).subscribe({
          next: (modRes) => {
            this.filteredModules = modRes.data || [];

            const selectedModule = this.filteredModules.find(
              m => m.module_name === this.session.module
            );

            //  Patch form AFTER everything is ready
            this.sessionForm.patchValue({
              title: this.session.title,
              course: courseId,
              subject: subjectId,
              module: selectedModule?.module_id,
              date: this.session.date,
              time: this.session.time,
              duration: this.session.duration,
            });

            this.isPatching = false;
          },
          error: (err) => console.error(err)
        });
      },
      error: (err) => console.error(err)
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['session'] && this.session) {
      this.populateEditData();
    }
  }

  submitSession() {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const sessionData = this.sessionForm.value;
    this.state.updateSession(sessionData);
  }

  //Api call for loading courses inside dropdown
  loadCourses() {
    this.liveClassService.getTeacherCourses().subscribe({
      next: (res) => {
        if (res.success) {
          this.courses = res.data || [];
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Courses API Error:', err);
        alert(err.error?.message || 'Failed to load courses');
      },
    });
  }

  //api call for loading subjects inside dropdown
  loadSubjects(courseId: number) {
    this.liveClassService.getSubjectsByCourse(courseId).subscribe({
      next: (res) => {
        if (res.success) {
          this.filteredSubjects = res.data || [];
          this.sessionForm.get('subject')?.enable();
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || 'Failed to load subjects');
      },
    });
  }

  //api call for loading modules inside dropdown
  loadModules(subjectId: number) {
    this.liveClassService.getModulesBySubject(subjectId).subscribe({
      next: (res) => {
        if (res.success) {
          this.filteredModules = res.data || [];
          this.sessionForm.get('module')?.enable();
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || 'Failed to load modules');
      },
    });
  }
}
