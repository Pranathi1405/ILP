// Author: E.Kaeith Emmanuel
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { AppState } from '../../../../../../core/states/appstate';
import { selectTestMeta } from '../../../../../../core/states/custom-test/test.selectors';
import { UgTestService } from '../../../../../../core/services/tests/custom-tests/custom-test';

// ─── API response shapes ───────────────────────────────────────
export interface PatternSection {
  section_id: number;
  section_name: string;
  question_type: string;
  num_questions: number;
  marks_correct: number;
  marks_incorrect: number;
  marks_partial: number | null;
  is_optional: number;
}

export interface PatternSubject {
  subject_id?: number;
  global_subject_id: number;
  subject_name: string;
  sections: PatternSection[];
}

export interface PatternPaper {
  paper_number: number;
  subjects: PatternSubject[];
}

export interface ExamPatternData {
  exam_id: number;
  exam_code: string;
  exam_name: string;
  total_questions: number;
  total_marks: number;
  duration_mins: number;
  total_subjects_in_exam?: number;
  selected_subjects?: number;
  total_papers: number;
  has_partial_marking: number;
  papers: PatternPaper[];
}

const Q_TYPE_LABEL: Record<string, string> = {
  mcq_single: 'Single Correct',
  mcq: 'Single Correct',
  mcq_multi: 'Multiple Correct',
  numerical: 'Numerical',
  nat: 'Numerical',
  match_list: 'Match the List',
  assertion: 'Assertion & Reason',
  paragraph: 'Paragraph Based',
};

@Component({
  selector: 'app-test-pattern',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-pattern.html',
})
export class TestPattern implements OnInit, OnDestroy {
  private router = inject(Router);
  private store = inject(Store<AppState>);
  private ugTestService = inject(UgTestService);
  private destroy$ = new Subject<void>();

  private readonly testMeta$ = this.store.select(selectTestMeta);

  // ── Local state ──
  examCode = signal<string>('');
  testType = signal<string>('');
  selectedSubjects = signal<string[]>([]);
  selectedSubjectIds = signal<number[]>([]);
  storedTimeLimit = signal<number>(0);

  // ── Raw API response ──
  pattern = signal<ExamPatternData | null>(null);
  loadError = signal<string | null>(null);

  // ── Active paper tab ──
  activePaper = signal(1);

  // ── All papers from API ──
  papers = computed(() => this.pattern()?.papers ?? []);

  // ── Active paper raw data ──
  activePaperRaw = computed(
    () => this.papers().find((p) => p.paper_number === this.activePaper()) ?? null,
  );

  // ── Filter subjects based on testType + selectedSubjects ──
  filteredSubjects = computed<PatternSubject[]>(() => {
    const paper = this.activePaperRaw();
    const selected = this.selectedSubjects();
    if (!paper) return [];
    if (!selected.length) return paper.subjects;
    return paper.subjects.filter((subj) =>
      selected.includes(subj.subject_name.toLowerCase().trim()),
    );
  });

  // ── Per-subject display totals ──
  subjectTotals = computed(() =>
    this.filteredSubjects().map((subj) => ({
      subject_name: subj.subject_name,
      totalQuestions: subj.sections.reduce((s, sec) => s + sec.num_questions, 0),
      totalMarks: subj.sections.reduce((s, sec) => s + sec.num_questions * sec.marks_correct, 0),
      sections: subj.sections,
    })),
  );

  // ── Grand total for visible subjects only ──
  paperTotals = computed(() => {
    const st = this.subjectTotals();
    return {
      questions: st.reduce((s, sub) => s + sub.totalQuestions, 0),
      marks: st.reduce((s, sub) => s + sub.totalMarks, 0),
    };
  });

  // ── Adjusted duration ──
  adjustedDuration = computed(() => {
    const stored = this.storedTimeLimit();
    if (stored > 0) return stored;
    const raw = this.pattern();
    if (!raw) return 0;
    const base = raw.duration_mins ?? 0;
    const totalSubs =
      raw.total_subjects_in_exam ??
      this.activePaperRaw()?.subjects?.length ??
      raw.papers?.[0]?.subjects?.length ??
      1;

    // Use selected subjects from store if available; fall back to API hint; otherwise all.
    const selected =
      this.filteredSubjects().length ||
      raw.selected_subjects ||
      this.selectedSubjects().length ||
      totalSubs;

    // Avoid divide by zero
    if (!totalSubs) return base;

    return Math.floor((base / totalSubs) * selected);
  });

  // ─── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.testMeta$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (meta) => {
        if (!meta) return;

        const code = meta.exam ?? '';
        const subjects = (meta.subjects ?? []).map((s: string) => s.toLowerCase().trim());
        const subjectIds = (meta.subjectIds ?? []).map((id: number) => Number(id)).filter(Boolean);
        const type = meta.testType ?? '';
        const timeLimit = Number(meta.timeLimit ?? 0);

        this.examCode.set(code);
        this.testType.set(type);
        this.selectedSubjects.set(subjects);
        this.selectedSubjectIds.set(subjectIds);
        this.storedTimeLimit.set(timeLimit);

        if (!code) {
          this.loadError.set('No exam selected. Please go back and choose an exam.');
          return;
        }

        // Fetch once — unsubscribe after first valid meta
        this.destroy$.next();
        this.fetchPattern(code, meta.subjectIds ?? [], meta.difficulty ?? '');
      },
      error: () => {
        this.loadError.set('Failed to read test configuration from store.');
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchPattern(examCode: string, subjectIds: number[], difficulty: string): void {
    this.loadError.set(null);

    let obs$;
    try {
      obs$ = this.ugTestService.getExamPattern(
        examCode,
        (subjectIds ?? []).map((id) => String(id)),
        difficulty,
      );
    } catch (err) {
      console.error('[TestPattern] getExamPattern threw synchronously:', err);
      this.loadError.set('Failed to build exam pattern request. Please go back and try again.');
      return;
    }

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (!res?.data) {
          this.loadError.set('Received empty pattern data from server.');
          return;
        }
        const normalized = this.normalizePatternResponse(res.data);
        this.pattern.set(normalized);
        this.activePaper.set(normalized.papers?.[0]?.paper_number ?? 1);
      },
      error: (err) => {
        console.error('[TestPattern] getExamPattern error:', err);
        this.loadError.set(err?.error?.message ?? 'Failed to load exam pattern.');
      },
    });
  }

  /**
   * Normalize backend responses to the UI-friendly ExamPatternData shape.
   * Handles both legacy { papers: [...] } payloads and newer flat { sections: [...] } payloads.
   */
  private normalizePatternResponse(raw: any): ExamPatternData {
    if (!raw || !Array.isArray(raw.sections)) {
      return raw as ExamPatternData;
    }

    const subjectsMap = new Map<number | string, PatternSubject>();

    for (const sec of raw.sections) {
      const key = sec.subject_id ?? sec.subject_name;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          subject_id: sec.subject_id,
          global_subject_id: sec.subject_id ?? 0,
          subject_name: sec.subject_name,
          sections: [],
        });
      }

      subjectsMap.get(key)!.sections.push({
        section_id: sec.section_id,
        section_name: sec.section_name,
        question_type: sec.question_type,
        num_questions: Number(sec.num_questions) || 0,
        marks_correct: Number(sec.marks_correct) || 0,
        marks_incorrect: Number(sec.marks_incorrect) || 0,
        marks_partial: sec.marks_partial ?? null,
        is_optional: sec.is_optional ?? 0,
      });
    }

    const subjects = Array.from(subjectsMap.values());

    const totalQuestions = subjects.reduce(
      (sum, subj) => sum + subj.sections.reduce((s, sec) => s + sec.num_questions, 0),
      0
    );
    const totalMarks = subjects.reduce(
      (sum, subj) =>
        sum + subj.sections.reduce((s, sec) => s + sec.num_questions * (sec.marks_correct || 0), 0),
      0
    );

    return {
      exam_id: raw.exam_id,
      exam_code: raw.exam_code,
      exam_name: raw.exam_name,
      total_questions: totalQuestions,
      total_marks: totalMarks,
      duration_mins: raw.duration_mins ?? 0,
      total_subjects_in_exam: raw.total_subjects_in_exam ?? subjects.length,
      selected_subjects: raw.selected_subjects ?? subjects.length,
      total_papers: 1,
      has_partial_marking: raw.has_partial_marking ?? 0,
      papers: [
        {
          paper_number: raw.paper_number ?? 1,
          subjects,
        },
      ],
    };
  }

  // ─── Interactions ──────────────────────────────────────────────
  selectPaper(paperNumber: number): void {
    this.activePaper.set(paperNumber);
  }

  getQuestionTypeLabel(type: string): string {
    return Q_TYPE_LABEL[type] ?? type;
  }

  goBack(): void {
    this.router.navigate(['/student/test-builder']);
  }

  proceedToInstructions(): void {
    this.router.navigate(['/student-test/test-instructions']);
  }
}
