import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  NgZone,
} from '@angular/core';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DoubtFilters, Doubt } from '../../../../core/models/doubt.model';
import { DoubtService } from '../../../../core/services/doubts/doubt.service';

type StatusOption = 'All' | 'Open' | 'Resolved';

@Component({
  selector: 'app-doubt-sidebar',
  imports: [FormsModule],
  templateUrl: './doubt-sidebar.html',
  host: {
    class: 'flex flex-col h-full min-h-0',
  },
})
export class DoubtSidebar implements OnInit, OnDestroy {
  doubtService = inject(DoubtService);
  private zone = inject(NgZone);

  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  // ── Filter state ──────────────────────────────────────────────────────────
  searchValue = signal('');
  selectedStatus = signal<StatusOption>('All');
  selectedCourseId = signal<number | null>(null);
  statusDropdownOpen = signal(false);
  courseDropdownOpen = signal(false);

  readonly statusOptions: StatusOption[] = ['All', 'Open', 'Resolved'];

  // ── Derived ───────────────────────────────────────────────────────────────
  doubts = this.doubtService.doubts;
  isLoading = this.doubtService.isLoadingDoubts;
  isLoadingMore = this.doubtService.isLoadingMore;
  courses = this.doubtService.courses;
  activeDoubt = this.doubtService.activeDoubt;

  selectedCourse = computed(
    () => this.courses().find((c) => c.course_id === this.selectedCourseId()) ?? null,
  );

  ngOnInit(): void {
    this.doubtService.fetchCourses().subscribe();
    this.loadDoubts();

    this.searchInput$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe((val) => {
      this.searchValue.set(val);
      this.loadDoubts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    if (!nearBottom) return;
    // Run inside NgZone so Angular signals are read in the correct context
    this.zone.run(() => {
      const pagination = this.doubtService.pagination();
      const canLoadMore =
        pagination.hasNextPage &&
        !this.doubtService.isLoadingMore() &&
        !this.doubtService.isLoadingDoubts();
      if (canLoadMore) {
        this.doubtService.loadMoreDoubts(this.buildFilters());
      }
    });
  }

  onSearch(val: string): void {
    this.searchInput$.next(val);
  }

  onStatusSelect(option: StatusOption): void {
    this.selectedStatus.set(option);
    this.statusDropdownOpen.set(false);
    this.loadDoubts();
  }

  onCourseSelect(courseId: number | null): void {
    this.selectedCourseId.set(courseId);
    this.courseDropdownOpen.set(false);
    this.loadDoubts();
  }

  clearCourse(): void {
    this.onCourseSelect(null);
  }

  selectDoubt(doubt: Doubt): void {
    this.doubtService.setActiveDoubt(doubt);
  }

  private buildFilters(): DoubtFilters {
    const status = this.selectedStatus();
    return {
      status: status === 'All' ? undefined : (status.toLowerCase() as 'open' | 'resolved'),
      courseId: this.selectedCourseId() ?? undefined,
      keyword: this.searchValue().trim() || undefined,
      limit: 10,
    };
  }

  private loadDoubts(): void {
    this.doubtService.fetchDoubts(this.buildFilters()).subscribe();
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen.update((v) => !v);
    if (this.statusDropdownOpen()) this.courseDropdownOpen.set(false);
  }

  toggleCourseDropdown(): void {
    this.courseDropdownOpen.update((v) => !v);
    if (this.courseDropdownOpen()) this.statusDropdownOpen.set(false);
  }

  closeDropdowns(): void {
    setTimeout(() => {
      this.statusDropdownOpen.set(false);
      this.courseDropdownOpen.set(false);
    }, 150);
  }

  statusBadgeClass(status: string): string {
    return status === 'OPEN'
      ? 'bg-amber-50 border-amber-200 text-amber-600'
      : 'bg-emerald-50 border-emerald-200 text-emerald-600';
  }
}
