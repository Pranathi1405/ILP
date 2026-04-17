import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmeTestService } from '../../../../../core/services/tests/sme-tests/sme-test';

@Component({
  selector: 'app-test-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-test.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateTest implements OnInit {
  testId!: number;
  testData: any = null;
  questions: any[] = [];
  sections: any[] = [];

  // UI state
  activeTab: 'questions' | 'settings' = 'questions';
  expandedQuestions: Set<number> = new Set();
  savingState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  filterSection: number | 'all' = 'all';
  searchQuery = '';
  isDirty = false;

  constructor(
    private route: ActivatedRoute,
    private testService: SmeTestService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.testId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchTest();
  }

  fetchTest() {
    this.testService.getTestById(this.testId).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.testData = { ...data };
        this.sections = data.sections || [];
        this.questions = (data.questions || []).map((q: any) => ({
          ...q,
          options: q.options || [],
          _expanded: false,
        }));
        // Expand first question by default
        if (this.questions.length > 0) {
          this.expandedQuestions.add(this.questions[0].question_id);
        }
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Filter & Search ────────────────────────────────────────────────────────

  get filteredQuestions(): any[] {
    return this.questions.filter((q) => {
      const matchSection = this.filterSection === 'all' || q.section_id === this.filterSection;
      const matchSearch =
        !this.searchQuery ||
        q.question_text?.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchSection && matchSearch;
    });
  }

  getSectionName(sectionId: number): string {
    return this.sections.find((s) => s.section_id === sectionId)?.section_name ?? 'Unknown';
  }

  getQuestionsForSection(sectionId: number): any[] {
    return this.questions.filter((q) => q.section_id === sectionId);
  }

  // ─── Expand / Collapse ──────────────────────────────────────────────────────

  toggleExpand(questionId: number) {
    if (this.expandedQuestions.has(questionId)) {
      this.expandedQuestions.delete(questionId);
    } else {
      this.expandedQuestions.add(questionId);
    }
    this.cdr.markForCheck();
  }

  isExpanded(questionId: number): boolean {
    return this.expandedQuestions.has(questionId);
  }

  expandAll() {
    this.filteredQuestions.forEach((q) => this.expandedQuestions.add(q.question_id));
    this.cdr.markForCheck();
  }

  collapseAll() {
    this.expandedQuestions.clear();
    this.cdr.markForCheck();
  }

  // ─── Correct Answer ─────────────────────────────────────────────────────────

  setCorrect(question: any, selectedOption: any) {
    if (!question.options) return;
    question.options = question.options.map((opt: any) => ({
      ...opt,
      is_correct: opt.option_id === selectedOption.option_id ? 1 : 0,
    }));
    this.markDirty();
    this.cdr.markForCheck();
  }

  getCorrectOptionText(question: any): string {
    return question.options?.find((o: any) => o.is_correct)?.option_text ?? '—';
  }

  // ─── Options ────────────────────────────────────────────────────────────────

  addOption(question: any) {
    const newId = -Date.now();
    question.options.push({
      option_id: newId,
      is_correct: 0,
      option_text: '',
      option_image_url: '',
    });
    this.markDirty();
    this.cdr.markForCheck();
  }

  removeOption(question: any, optionIndex: number) {
    if (question.options.length <= 2) return; // min 2 options
    question.options.splice(optionIndex, 1);
    // ensure at least one correct
    const hasCorrect = question.options.some((o: any) => o.is_correct);
    if (!hasCorrect && question.options.length > 0) {
      question.options[0].is_correct = 1;
    }
    this.markDirty();
    this.cdr.markForCheck();
  }

  // ─── Question Metadata ──────────────────────────────────────────────────────

  markDirty() {
    this.isDirty = true;
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'hard':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  }

  getOptionLetter(index: number): string {
    return ['A', 'B', 'C', 'D', 'E'][index] ?? String(index + 1);
  }

  getExplanationText(explanation: any): string {
    if (!explanation) return '';
    if (typeof explanation === 'string') {
      try {
        const parsed = JSON.parse(explanation);
        return parsed.text ?? explanation;
      } catch {
        return explanation;
      }
    }
    return explanation.text ?? JSON.stringify(explanation);
  }

  getQuestionTypeLabel(type: string): string {
    switch (type) {
      case 'mcq_single':
        return 'MCQ';
      case 'nat':
        return 'NAT';
      default:
        return type?.toUpperCase() ?? '';
    }
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  saveTest() {
    this.savingState = 'saving';
    this.cdr.markForCheck();

    // Only send fields the backend updateSmeTestMeta + questions loop expects
    const payload = {
      // Test-level meta (maps to `tests` table via updateSmeTestMeta)
      title: this.testData.title,
      status: this.testData.status,
      paper_number: this.testData.paper_number,
      duration_minutes: this.testData.duration_minutes,
      total_marks: this.testData.total_marks,
      negative_marking: this.testData.negative_marking,
      scheduled_start: this.toMysqlDatetime(this.testData.scheduled_start),
      scheduled_end: this.toMysqlDatetime(this.testData.scheduled_end),
      // Questions — only fields the backend loops over
      questions: this.questions.map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text, // → questions.question_text
        difficulty: q.difficulty, // → questions.difficulty
        correct_answer: q.correct_answer, // → questions.correct_answer (NAT)
        marks_correct: q.marks_correct, // → test_questions.marks_correct
        marks_incorrect: q.marks_incorrect, // → test_questions.marks_incorrect
        options: (q.options ?? []).map((opt: any) => ({
          option_id: opt.option_id, // backend skips negative (temp) IDs
          option_text: opt.option_text, // → question_options.option_text
          is_correct: opt.is_correct, // → question_options.is_correct
        })),
      })),
    };

    this.testService.updateTest(this.testId, payload).subscribe({
      next: () => {
        this.savingState = 'saved';
        this.isDirty = false;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.savingState = 'idle';
          this.cdr.markForCheck();
        }, 2500);
      },
      error: () => {
        this.savingState = 'error';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.savingState = 'idle';
          this.cdr.markForCheck();
        }, 3000);
      },
    });
  }

  // ─── Date helpers ────────────────────────────────────────────────────────────

  // Converts ANY date string → 'YYYY-MM-DD HH:MM:SS' for MySQL
  toMysqlDatetime(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  toDatetimeLocal(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  fromDatetimeLocal(localString: string): string {
    if (!localString) return '';
    // MySQL requires 'YYYY-MM-DD HH:MM:SS', not ISO 8601 with T and Z
    const date = new Date(localString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  onStartChange(value: string) {
    this.testData.scheduled_start = this.toMysqlDatetime(value);
    this.markDirty();
  }

  onEndChange(value: string) {
    this.testData.scheduled_end = this.toMysqlDatetime(value);
    this.markDirty();
  }

  // ─── Track fns ───────────────────────────────────────────────────────────────

  trackByQuestion(index: number, q: any) {
    return q.question_id;
  }

  trackByOption(index: number, o: any) {
    return o.option_id ?? index;
  }

  trackBySection(index: number, s: any) {
    return s.section_id;
  }
}
