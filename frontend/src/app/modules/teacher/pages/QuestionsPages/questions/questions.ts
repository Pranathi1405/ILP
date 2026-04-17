import { NgClass, CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherAddquestions } from '../../../../../core/services/teacher/teacher-addquestions';
import { Subscription, filter } from 'rxjs';

interface Question {
  _id: string;
  id: string;
  title: string;
  subject: string;
  type: string;
  difficulty: string;
  marks: string;
  lastUsed: string;
  subject_id: number;
  module_id: number;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [RouterLink, RouterOutlet, CommonModule, FormsModule],
  templateUrl: './questions.html',
  styleUrl: './questions.css'
})
export class Questions implements OnInit, OnDestroy {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private questionService: TeacherAddquestions
  ) {}

  // ── Teacher context ────────────────────────────────────────
  courses:  any[] = [];
  subjects: any[] = [];

  // ── Questions state ────────────────────────────────────────
  allQuestions:  Question[] = [];
  isLoading      = false;
  isLoadingInfo  = false;
  errorMessage   = '';

  // ── Filters ────────────────────────────────────────────────
  filterSubject    = '';
  filterType       = '';
  filterDifficulty = '';

  subjectOptions:   { id: number; name: string }[] = [];
  typeOptions       = ['MCQ', 'MSQ', 'INTEGER', 'PARAGRAPH'];
  difficultyOptions = ['Easy', 'Medium', 'Hard'];

  // ── Pagination ─────────────────────────────────────────────
  currentPage = 1;
  pageSize    = 10;

  // ── Router subscription ────────────────────────────────────
  private routerSub!: Subscription;

  get totalCount(): number { return this.filtered.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount / this.pageSize)); }
  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ── Filtered + paginated ───────────────────────────────────
  get filtered(): Question[] {
    return this.allQuestions.filter(q => {
      const matchSubject    = !this.filterSubject    || String(q.subject_id) === String(this.filterSubject);
      const matchType       = !this.filterType       || q.type === this.filterType;
      const matchDifficulty = !this.filterDifficulty || q.difficulty.toLowerCase() === this.filterDifficulty.toLowerCase();
      return matchSubject && matchType && matchDifficulty;
    });
  }

  get pagedQuestions(): Question[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  // ── Delete modal ───────────────────────────────────────────
  showDeleteModal   = false;
  deletingId: string | null = null;
  isDeleting        = false;

  // ── Child route guard ──────────────────────────────────────
  get isChildRoute(): boolean {
    return this.route.firstChild !== null;
  }

  // ── Lifecycle ──────────────────────────────────────────────
  ngOnInit(): void {
    // Initial load
    this.loadTeacherInfo();

    // ✅ Auto-refresh when navigating back from Add/Edit question page
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const isParentRoute = !this.route.firstChild;
      if (isParentRoute) {
        this.fetchAllQuestions();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ── Unwrap helper ──────────────────────────────────────────
  private unwrap(res: any): any[] {
    if (Array.isArray(res))       return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  // ── Load courses → subjects → then questions ───────────────
  loadTeacherInfo(): void {
    this.isLoadingInfo = true;
    this.errorMessage  = '';

    this.questionService.getTeacherCourses().subscribe({
      next: (res: any) => {
        this.courses = this.unwrap(res);

        if (!this.courses.length) {
          this.isLoadingInfo = false;
          this.errorMessage  = 'No courses assigned to your account.';
          return;
        }

        let completed = 0;
        const total   = this.courses.length;

        this.courses.forEach(c => {
          this.questionService.getSubjectsByCourse(c.course_id).subscribe({
            next: (sRes: any) => {
              const subs = this.unwrap(sRes);
              subs.forEach((s: any) => {
                if (!this.subjectOptions.find(o => o.id === s.subject_id)) {
                  this.subjectOptions.push({ id: s.subject_id, name: s.subject_name });
                }
              });
              completed++;
              if (completed === total) {
                this.isLoadingInfo = false;
                this.fetchAllQuestions();
              }
            },
            error: () => {
              completed++;
              if (completed === total) {
                this.isLoadingInfo = false;
                this.fetchAllQuestions();
              }
            }
          });
        });
      },
      error: () => {
        this.isLoadingInfo = false;
        this.errorMessage  = 'Failed to load course info.';
      }
    });
  }

  // ── Fetch questions for every subject ─────────────────────
  fetchAllQuestions(): void {
    if (!this.subjectOptions.length) {
      this.errorMessage = 'No subjects found.';
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';
    this.allQuestions = [];

    const fetches = this.subjectOptions.map(s =>
      this.questionService.getQuestions(s.id).toPromise()
    );

    Promise.all(fetches)
      .then(results => {
        results.forEach(res => {
          const raw: any[] = Array.isArray(res) ? res : ((res as any)?.data ?? []);
          this.allQuestions.push(...raw.map((q: any) => this.normalize(q)));
        });
        this.isLoading = false;
      })
      .catch(() => {
        this.errorMessage = 'Failed to load questions.';
        this.isLoading    = false;
      });
  }

  // ── Normalize backend → UI ────────────────────────────────
  private normalize(q: any): Question {
    const subjectName = this.subjectOptions.find(
      s => String(s.id) === String(q.subject_id)
    )?.name ?? '—';

    return {
      _id:        q.question_id ?? q._id ?? q.id,
      id:         q.question_id ?? q._id ?? q.id,
      title:      q.question_text ?? q.text ?? q.title ?? 'Untitled',
      subject:    subjectName,           // ✅ fixed
      type:       (q.question_type ?? q.type ?? '').toUpperCase(),
      difficulty: q.difficulty ?? '—',
      marks:      q.marks != null ? String(q.marks) : '—',
      lastUsed:   q.createdAt
                    ? this.timeAgo(new Date(q.createdAt))
                    : 'New',
      subject_id: q.subject_id ?? 0,
      module_id:  q.module_id  ?? 0,
    };
  }

  // ── Time ago ───────────────────────────────────────────────
  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 86400)   return 'Today';
    if (seconds < 172800)  return '1 day ago';
    if (seconds < 604800)  return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 1209600) return '1 week ago';
    return date.toLocaleDateString();
  }

  // ── Filter change ──────────────────────────────────────────
  onFilterChange(): void {
    this.currentPage = 1;
  }

  // ── Pagination ─────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // ── Delete modal ───────────────────────────────────────────
  openDeleteModal(id: string): void {
    this.deletingId      = id;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deletingId      = null;
  }

  confirmDelete(): void {
    if (!this.deletingId) return;
    this.isDeleting = true;

    this.questionService.deleteQuestion(this.deletingId as any).subscribe({
      next: () => {
        this.allQuestions    = this.allQuestions.filter(q => q._id !== this.deletingId);
        this.isDeleting      = false;
        this.showDeleteModal = false;
        this.deletingId      = null;
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
      },
      error: (err: any) => {
        this.isDeleting = false;
        alert(err?.error?.message ?? 'Failed to delete question.');
      }
    });
  }

  // ── Edit ───────────────────────────────────────────────────
  editQuestion(id: string, subjectId: number, moduleId: number): void {
    this.router.navigate(['question-bank', id], {
      relativeTo: this.route,
      queryParams: { subject_id: subjectId, module_id: moduleId }
    });
  }
}