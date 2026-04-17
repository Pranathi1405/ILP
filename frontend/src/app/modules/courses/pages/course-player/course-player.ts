// Author: Poojitha
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudyMaterialService } from '../../../../core/services/studyMaterials/studyMaterials.service';
import { CourseService } from '../../services/course';
import { UserCourseService } from '../../../../core/services/user-course.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-course-player',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './course-player.html',
})
export class CoursePlayer {
  activeTab: string = 'syllabus';
  subjectId!: number;
  courseId?: number;
  courseSubjects: any[] = [];
  isSubjectOpen = false;
  subjectsLoading = signal(true);
  subjectName = signal('Loading...');
  modules = signal<any[]>([]);
  modulesLoading = signal(true);
  materials = signal<any[]>([]);
  loading = signal(false);

  selectedPdf = signal<string | null>(null);
  activeModuleId = signal<number | null>(null);
  activeMaterialId = signal<number | null>(null);

  groupedMaterials: { [key: string]: any[] } = {};
  moduleMap: { [key: number]: string } = {};
  expandedModules: { [key: number]: boolean } = {};

  private courseService = inject(CourseService);
  private userCourseService = inject(UserCourseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  safePdfUrl = signal<SafeResourceUrl | null>(null);
  viewerType = signal<'empty' | 'pdf' | 'video'>('empty');
  videoUrl = signal<string | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const subjectId = Number(params.get('subjectId'));
      if (!subjectId || isNaN(subjectId)) {
        console.error('Invalid subjectId in route', params.get('subjectId'));
        return;
      }

      this.subjectId = subjectId;
      console.log('SUBJECT ID 👉', this.subjectId);
      this.loadSubject();
      this.loadModules();
    });
  }
  qaList = [
    {
      name: 'Rahul K.',
      time: '10m ago',
      question: 'Sir, what happens if the axis passes through the center of mass?',
      status: 'resolved',
      replies: 1,
    },
    {
      name: 'Sneha P.',
      time: '2h ago',
      question: 'Is the parallel axis theorem applicable for 3D objects?',
      status: 'open',
      replies: 1,
    },
    {
      name: 'Arjun M.',
      time: '5h ago',
      question: 'Can you explain the radius of gyration again?',
      status: 'answered',
      replies: 1,
      disabled: true,
    },
  ];
  // notesData: { [key: number]: any[] } = {
  //   1: [
  //     {
  //       material_id: 1,
  //       material_name: 'Kinematics Notes',
  //       file_size_mb: 2.4,
  //       pdf_url: '#'
  //     },
  //     {
  //       material_id: 2,
  //       material_name: 'Projectile Motion',
  //       file_size_mb: 1.8,
  //       pdf_url: '#'
  //     }
  //   ],
  //   2: [
  //     {
  //       material_id: 3,
  //       material_name: 'Newton Laws PDF',
  //       file_size_mb: 3.2,
  //       pdf_url: '#'
  //     }
  //   ]
  // };

  setTab(tab: string) {
    this.activeTab = tab;

    if (tab === 'notes' && this.materials().length === 0) {
      this.loadAllMaterials();
    }
  }

  toggleModule(moduleId: number) {
    this.expandedModules[moduleId] = !this.expandedModules[moduleId];
    this.activeModuleId.set(moduleId);
  }
  loadSubject() {
    this.subjectsLoading.set(true);
    this.subjectName.set('Loading...');
    this.courseSubjects = [];
    this.modules.set([]);
    this.materials.set([]);
    this.groupedMaterials = {};
    this.expandedModules = {};
    this.activeMaterialId.set(null);

    this.courseService.getSubjectById(this.subjectId).subscribe({
      next: (res) => {
        console.log('SUBJECT API 👉', res);

        const subject = res?.data || {};
        this.subjectName.set(subject.subject_name || 'Subject');
        this.courseId = subject.course_id || this.courseId;

        if (this.courseId) {
          this.loadCourseSubjects(this.courseId);
        } else {
          this.subjectsLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error fetching subject', err);
        this.subjectName.set('Subject');
        this.subjectsLoading.set(false);
      },
    });
  }

  loadCourseSubjects(courseId: number) {
    this.subjectsLoading.set(true);
    this.userCourseService.getCourseSubjects(courseId).subscribe({
      next: (res) => {
        this.courseSubjects = Array.isArray(res.data) ? res.data : [];
        this.subjectsLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching course subjects', err);
        this.courseSubjects = [];
        this.subjectsLoading.set(false);
      },
    });
  }

  onSubjectChange(subjectId: string | number) {
    const id = Number(subjectId);
    if (!id || id === this.subjectId) {
      return;
    }

    this.subjectId = id;
    this.router.navigate(['/student/my-courses/course-player', id]);
  }

  private studyMaterialService = inject(StudyMaterialService);
  loadModules() {
    this.modulesLoading.set(true);

    this.courseService
      .getModules({
        subjectId: this.subjectId,
        limit: 50,
        sortBy: 'display_order',
        order: 'ASC',
      })
      .subscribe({
        next: (res) => {
          console.log('MODULES API ', res);

          const modulesData = res?.data || [];

          this.modules.set(modulesData);

          // optional map
          modulesData.forEach((m: any) => {
            this.moduleMap[m.module_id] = m.module_name;
          });

          this.modulesLoading.set(false);
        },
        error: () => {
          this.modulesLoading.set(false);
        },
      });
  }
  loadAllMaterials() {
    this.loading.set(true);

    let allMaterials: any[] = [];
    let completedCalls = 0;

    const modulesList = this.modules();

    if (modulesList.length === 0) {
      this.loading.set(false);
      return;
    }

    modulesList.forEach((module: any) => {
      this.studyMaterialService
        .getStudyMaterials({
          moduleId: module.module_id,
          resourceType: 'pdf',
          page: 1,
          limit: 10,
        })
        .subscribe({
          next: (res) => {
            const data = res?.data || [];

            const enriched = data.map((item: any) => ({
              ...item,
              module_id: module.module_id,
            }));

            allMaterials = [...allMaterials, ...enriched];

            completedCalls++;

            if (completedCalls === modulesList.length) {
              this.materials.set(allMaterials);
              this.groupedMaterials = this.groupByModule(allMaterials);
              this.loading.set(false);
            }
          },
          error: () => {
            completedCalls++;

            if (completedCalls === modulesList.length) {
              this.loading.set(false);
            }
          },
        });
    });
  }

  groupByModule(data: any[]) {
    const grouped: any = {};

    data.forEach((item) => {
      const moduleId = item.module_id;

      if (!grouped[moduleId]) {
        grouped[moduleId] = [];
      }

      grouped[moduleId].push(item);
    });

    return grouped;
  }
  viewPdf(file: any) {
    console.log('VIEW PDF 👉', file.pdf_url);
    this.activeTab = 'notes'; // auto switch tab

    this.activeMaterialId.set(file.material_id); //  highlight
    this.selectedPdf.set(file.pdf_url);

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.pdf_url);
    this.safePdfUrl.set(safeUrl);
    this.viewerType.set('pdf');
  }
  playVideo() {
    // temporary static video (you can replace later)
    const demoVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';

    this.videoUrl.set(demoVideo);
    this.viewerType.set('video');
  }

  get isMaterialsEmpty(): boolean {
    return Object.keys(this.groupedMaterials || {}).length === 0;
  }
  get currentSubjectName(): string {
    return this.courseSubjects.find((s) => s.subject_id === this.subjectId)?.subject_name ?? '';
  }
}
