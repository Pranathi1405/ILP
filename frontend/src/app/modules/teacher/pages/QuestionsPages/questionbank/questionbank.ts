import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherAddquestions } from '../../../../../core/services/teacher/teacher-addquestions';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

interface AnswerOption {
  id: string;
  label: string;
  text: string;
  image?: string;
}

interface MatrixItem {
  aLabel: string;
  aText: string;
  bLabel: string;
  bText: string;
}

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './questionbank.html',
  styleUrls: ['./questionbank.css']
})
export class QuestionBank implements OnInit {

  constructor(
    private add: TeacherAddquestions,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private route: Router
  ) {}

  // ── Question Types ────────────────────────────────────────
  questionTypes = [
    { id: 'mcq-single', label: 'MCQ -Single Correct' },
    { id: 'mcq-multi',  label: 'MSQ -Multiple Correct' },
    { id: 'integer',    label: 'Integer / Numeric' },
    { id: 'matrix',     label: 'Match the Matrix' },
    { id: 'paragraph',  label: 'Paragraph (Linked)' },
  ];
  selectedType = 'mcq-single';

  // ── Difficulty ────────────────────────────────────────────
  difficulties = [
    { id: 'easy',   label: 'Easy',   dot: '#22c55e' },
    { id: 'medium', label: 'Medium', dot: '#f59e0b' },
    { id: 'hard',   label: 'Hard',   dot: '#ef4444' },
  ];
  selectedDifficulty = 'medium';

  // ── Course / Subject / Module ─────────────────────────────
  courses:  any[] = [];
  subjects: any[] = [];
  modules:  any[] = [];

  teacherCourse:  any = null;
  teacherSubject: any = null;
  teachermodule:  any = null;
  isLoadingInfo       = false;

  // ── Editor / Question Content ─────────────────────────────
  questionContent  = '';
  paragraphPassage = '';
  @ViewChild('editor', { static: false }) editor!: ElementRef;
  editorHTML = '';

  // ── Answer Options ────────────────────────────────────────
  answerOptions: AnswerOption[] = [
    { id: 'A', label: 'A', text: '' },
    { id: 'B', label: 'B', text: '' },
    { id: 'C', label: 'C', text: '' },
    { id: 'D', label: 'D', text: '' },
  ];
  correctAnswers: string[] = [];

  // ── Integer / Numeric ─────────────────────────────────────
  integerCorrectAnswer = '0.00';
  integerUnit          = '';
  integerOnly          = false;
  precision            = 2;
  rangeMode            = true;
  rangeMin             = '1.95';
  rangeMax             = '2.05';

  // ── Matrix Match ──────────────────────────────────────────
  private readonly ROW_LABELS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  private readonly COL_LABELS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

  matrixItems: MatrixItem[] = [
    { aLabel: 'A1', aText: 'Thermodynamic Cycle', bLabel: 'B1', bText: 'Jules/Sec'          },
    { aLabel: 'A2', aText: 'Entropic Flow',        bLabel: 'B2', bText: 'Carnot Engine'      },
    { aLabel: 'A3', aText: 'Kinetic Energy',       bLabel: 'B3', bText: 'Voltage Difference' },
    { aLabel: 'A4', aText: 'Potential Gradient',   bLabel: 'B4', bText: 'Disorder Vector'    },
  ];
  matrixExtraMatches: { bLabel: string; bText: string }[] = [];
  matrixMappings: Map<number, Set<string>> = new Map([
    [0, new Set(['B2'])],
    [1, new Set(['B4'])],
    [2, new Set(['B1'])],
    [3, new Set(['B3'])],
  ]);

  // ── Scoring ───────────────────────────────────────────────
  scoringEnabled      = true;
  positiveMarks       = '4';
  negativeMarks       = '-0.33';
  detailedExplanation = '';

  // ── Time ──────────────────────────────────────────────────
  idealMinutes = 1;
  idealSeconds = 30;

  // ── Hints ─────────────────────────────────────────────────
  hints: string[] = [];

  // ── Linked Questions ──────────────────────────────────────
  linkedQuestions: { content: string; type: string }[] = [
    { content: 'According to the passage, what was the primary catalys...', type: 'MCQ' },
    { content: 'Identify all the correct statements regarding the socio-e...', type: 'MSQ' },
  ];

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit() {
    this.loadTeacherInfo();
  }

  // ── Utility: safely unwrap any API response shape ─────────
  private unwrap(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      const candidate =
        res.data     ??
        res.courses  ??
        res.subjects ??
        res.results  ??
        res.items    ??
        null;
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }

  // ── Load Courses ──────────────────────────────────────────
  loadTeacherInfo() {
    this.isLoadingInfo = true;

    this.add.getTeacherCourses().subscribe({
      next: (res: any) => {
        this.courses = this.unwrap(res);
        this.isLoadingInfo = false;
        console.log('courses api', this.courses);
        if (!this.courses.length) {
          this.toastr.error('No courses assigned to your account.');
        } else {
          this.onCourseSelect(this.courses[0]?.course_id);
        }
      },
      error: () => {
        this.isLoadingInfo = false;
        this.toastr.error('Failed to load course info.');
      }
    });
  }

  // ── On Course Selected ────────────────────────────────────
  onCourseSelect(courseId: number) {
    const found = this.courses.find(c => c.course_id == courseId);
    this.teacherCourse  = found ? { id: found.course_id, name: found.course_name } : null;
    this.teacherSubject = null;
    this.teachermodule  = null;
    this.subjects       = [];
    this.modules        = [];

    if (!this.teacherCourse?.id) return;

    this.add.getSubjectsByCourse(this.teacherCourse.id).subscribe({
      next: (res: any) => {
        this.subjects = this.unwrap(res);
        console.log('subject api', this.subjects);
        if (!this.subjects.length) this.toastr.error('No subjects found for this course.');
      },
      error: () => this.toastr.error('Failed to load subjects.')
    });
  }

  // ── On Subject Selected ───────────────────────────────────
  onSubjectSelect(subjectId: number) {
    const found = this.subjects.find(s => s.subject_id == subjectId);
    this.teacherSubject = found ? { id: found.subject_id, name: found.subject_name } : null;
    this.teachermodule  = null;
    this.modules        = [];

    if (!this.teacherSubject?.id) return;

    this.add.getModulesBySubject(this.teacherSubject.id).subscribe({
      next: (res: any) => {
        this.modules = this.unwrap(res);
        console.log('modules api', this.modules);
        if (!this.modules.length) this.toastr.error('No modules found for this subject.');
      },
      error: () => this.toastr.error('Failed to load modules.')
    });
  }

  // ── On Module Selected ────────────────────────────────────
  onModuleSelect(moduleId: number) {
    const found = this.modules.find(m => m.module_id == moduleId);
    this.teachermodule = found ? { id: found.module_id, name: found.module_name } : null;
  }

  // ── Editor ────────────────────────────────────────────────
  onContentChange() {
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editorHTML = this.editor.nativeElement.innerHTML;
        this.paragraphPassage = this.editor.nativeElement.innerText;
      }
    });
  }

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.editor?.nativeElement) return;
      const img = document.createElement('img');
      img.src                = reader.result as string;
      img.style.maxWidth     = '100%';
      img.style.marginTop    = '8px';
      img.style.borderRadius = '6px';
      this.editor.nativeElement.appendChild(img);
      this.onContentChange();
    };
    reader.readAsDataURL(file);
  }

  // ── Option Image Upload ───────────────────────────────────
  onOptionImageUpload(event: any, index: number) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.answerOptions[index].image = reader.result as string;
      // Reset the file input so the same file can be re-selected if needed
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  // ── Option Image Remove (NEW) ─────────────────────────────
  removeOptionImage(optionId: string) {
    const opt = this.answerOptions.find(o => o.id === optionId);
    if (opt) {
      opt.image = undefined;
    }
  }

  getWordCount(): number {
    if (!this.editor?.nativeElement) return 0;
    const text = this.editor.nativeElement.innerText || '';
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // ── Matrix helpers ────────────────────────────────────────
  get allBOptions(): { bLabel: string; bText: string }[] {
    return [
      ...this.matrixItems.map(item => ({ bLabel: item.bLabel, bText: item.bText })),
      ...this.matrixExtraMatches,
    ];
  }

  addMatrixItem() {
    const count = this.matrixItems.length;
    if (count >= 6) return;
    this.matrixItems.push({ aLabel: this.ROW_LABELS[count], aText: '', bLabel: this.COL_LABELS[count], bText: '' });
  }

  removeMatrixItem(index: number) {
    this.matrixItems.splice(index, 1);
    const newMap = new Map<number, Set<string>>();
    this.matrixMappings.forEach((v, k) => {
      if (k < index) newMap.set(k, v);
      if (k > index) newMap.set(k - 1, v);
    });
    this.matrixMappings = newMap;
    this.matrixItems.forEach((item, i) => { item.aLabel = this.ROW_LABELS[i]; });
  }

  addMatrixMatch() {
    const totalB = this.matrixItems.length + this.matrixExtraMatches.length;
    if (totalB >= 6) return;
    this.matrixExtraMatches.push({ bLabel: this.COL_LABELS[totalB], bText: '' });
  }

  removeMatrixMatch(index: number) {
    this.matrixExtraMatches.splice(index, 1);
    this.matrixExtraMatches.forEach((m, i) => { m.bLabel = this.COL_LABELS[this.matrixItems.length + i]; });
    const validBLabels = new Set(this.allBOptions.map(b => b.bLabel));
    this.matrixMappings.forEach(set => { set.forEach(bLabel => { if (!validBLabels.has(bLabel)) set.delete(bLabel); }); });
  }

  toggleMatrixMapping(rowIndex: number, bLabel: string) {
    if (!this.matrixMappings.has(rowIndex)) this.matrixMappings.set(rowIndex, new Set());
    const set = this.matrixMappings.get(rowIndex)!;
    set.has(bLabel) ? set.delete(bLabel) : set.add(bLabel);
  }

  isMatrixMapped(rowIndex: number, bLabel: string): boolean {
    return this.matrixMappings.get(rowIndex)?.has(bLabel) ?? false;
  }

  // ── Hints ─────────────────────────────────────────────────
  addHint()             { this.hints.push(''); }
  removeHint(i: number) { this.hints.splice(i, 1); }

  // ── Linked Questions ──────────────────────────────────────
  addLinkedQuestion()             { this.linkedQuestions.push({ content: '', type: 'MCQ' }); }
  removeLinkedQuestion(i: number) { this.linkedQuestions.splice(i, 1); }
  editLinkedQuestion(_i: number)  { /* wire to routing / dialog */ }

  getLinkedQTypeBadge(type: string): string {
    const map: Record<string, string> = {
      MCQ: 'bg-blue-50 text-blue-500 border border-blue-100',
      MSQ: 'bg-purple-50 text-purple-500 border border-purple-100',
      INT: 'bg-orange-50 text-orange-500 border border-orange-100',
    };
    return map[type] ?? 'bg-gray-50 text-gray-400 border border-gray-100';
  }

  // ── Computed ──────────────────────────────────────────────
  get isMSQ():         boolean { return this.selectedType === 'mcq-multi';  }
  get isInteger():     boolean { return this.selectedType === 'integer';     }
  get isMCQ():         boolean { return this.selectedType === 'mcq-single' || this.selectedType === 'mcq-multi'; }
  get isMatrixMatch(): boolean { return this.selectedType === 'matrix';     }
  get isParagraph():   boolean { return this.selectedType === 'paragraph';  }

  isCorrect(id: string): boolean { return this.correctAnswers.includes(id); }

  selectType(id: string) {
    // Save current editor content before switching
    if (this.editor?.nativeElement) {
      this.editorHTML = this.editor.nativeElement.innerHTML;
    }
    this.selectedType = id;
    this.correctAnswers = [];

    // Restore content after Angular re-renders the new editor
    setTimeout(() => {
      if (this.editor?.nativeElement) {
        this.editor.nativeElement.innerHTML = this.editorHTML;
      }
    }, 0);
  }

  toggleCorrect(id: string) {
    if (this.isMSQ) {
      const idx = this.correctAnswers.indexOf(id);
      idx > -1 ? this.correctAnswers.splice(idx, 1) : this.correctAnswers.push(id);
    } else {
      this.correctAnswers = this.correctAnswers[0] === id ? [] : [id];
    }
  }

  getDifficultyActiveClass(id: string): string {
    const map: Record<string, string> = {
      easy:   'border-green-400 text-green-600 bg-green-50',
      medium: 'border-yellow-400 text-yellow-600 bg-yellow-50',
      hard:   'border-red-400 text-red-500 bg-red-50',
    };
    return map[id] ?? '';
  }

  nextOptionLabel(): string { return String.fromCharCode(65 + this.answerOptions.length); }

  addOption() {
    if (this.answerOptions.length >= 8) return;
    const label = this.nextOptionLabel();
    this.answerOptions.push({ id: label, label, text: '' });
  }

  removeOption(index: number) {
    const removed = this.answerOptions[index].id;
    this.answerOptions.splice(index, 1);
    this.correctAnswers = this.correctAnswers.filter(id => id !== removed);
    this.answerOptions.forEach((o, i) => { o.id = String.fromCharCode(65 + i); o.label = o.id; });
  }

  incrementPrecision() { if (this.precision < 4) this.precision++; }
  decrementPrecision() { if (this.precision > 0) this.precision--; }

  // ── Validation ────────────────────────────────────────────
  private validatePayload(): string | null {
    const questionText = this.editor?.nativeElement?.innerHTML?.trim() || this.questionContent.trim();
    if (!questionText)        return 'Question text cannot be empty.';
    if (!this.teacherCourse)  return 'Please select a course.';
    if (!this.teacherSubject) return 'Please select a subject.';
    if (!this.teachermodule)  return 'Please select a module.';
    if (this.isMCQ && this.correctAnswers.length === 0)
      return 'Please select at least one correct answer.';
    if (this.isMSQ && this.correctAnswers.length < 2)
      return 'MSQ requires at least two correct answers.';
    if (this.isInteger && !this.integerCorrectAnswer.trim())
      return 'Please enter the correct numeric answer.';
    if (this.rangeMode && this.isInteger) {
      if (!this.rangeMin.trim() || !this.rangeMax.trim())
        return 'Please fill in both range min and max values.';
      if (parseFloat(this.rangeMin) > parseFloat(this.rangeMax))
        return 'Range min cannot be greater than range max.';
    }
    return null;
  }

  // ── Save ──────────────────────────────────────────────────
  saveQuestion() {
    const validationError = this.validatePayload();
    if (validationError) { this.toastr.show(validationError); return; }

    const questionText = this.editor?.nativeElement?.innerHTML?.trim() || this.questionContent.trim();

    const typeMap: Record<string, string> = {
      'mcq-single': 'mcq',
      'mcq-multi':  'mcq_multi',
      'integer':    'numerical',
      'matrix':     'match_list',
    };

    const payload: any = {
      subject_id:      this.teacherSubject.id,
      module_id:       this.teachermodule.id,
      question_type:   typeMap[this.selectedType],
      difficulty:      this.selectedDifficulty,
      question_text:   questionText,
      marks:           parseFloat(this.positiveMarks) || 1,
      explanation:     this.detailedExplanation || null,
      hints:           this.hints.length ? JSON.stringify(this.hints) : null,
      ideal_time_mins: this.idealMinutes + (this.idealSeconds / 60),
    };

    if (this.isMCQ || this.isMSQ) {
      payload.options = this.answerOptions.map(opt => ({
        option_text: opt.text,
        is_correct:  this.correctAnswers.includes(opt.id),
        image:       opt.image ?? null,
      }));
    }

    if (this.isMatrixMatch) {
      payload.options = this.matrixItems.map((item, index) => ({
        left:            item.aText,
        right:           item.bText,
        correct_matches: Array.from(this.matrixMappings.get(index) || [])
      }));
      console.log(payload.options);
    }

    if (this.isInteger) {
      payload.correct_answer = this.integerCorrectAnswer;
      if (this.rangeMode) {
        payload.range_min = this.rangeMin;
        payload.range_max = this.rangeMax;
      }
    }

    this.add.addQuestion(payload).subscribe({
      next: (res) => {
        this.toastr.show(res.message);
        this.reset();
      },
      error: (err) => { this.toastr.error(err?.error?.message || 'Failed to save question.'); },
    });
  }

  // ── Reset ─────────────────────────────────────────────────
  reset() {
    this.questionContent      = '';
    this.editorHTML           = '';
    this.teacherCourse        = null;
    this.teacherSubject       = null;
    this.teachermodule        = null;
    this.subjects             = [];
    this.modules              = [];
    this.answerOptions = [
      { id: 'A', label: 'A', text: '' },
      { id: 'B', label: 'B', text: '' },
      { id: 'C', label: 'C', text: '' },
      { id: 'D', label: 'D', text: '' },
    ];
    this.correctAnswers       = [];
    this.detailedExplanation  = '';
    this.integerCorrectAnswer = '0.00';
    this.integerUnit          = '';
    this.integerOnly          = false;
    this.precision            = 2;
    this.rangeMode            = false;
    this.rangeMin             = '';
    this.rangeMax             = '';
    this.hints                = [];
    this.matrixItems = [
      { aLabel: 'A1', aText: '', bLabel: 'B1', bText: '' },
      { aLabel: 'A2', aText: '', bLabel: 'B2', bText: '' },
      { aLabel: 'A3', aText: '', bLabel: 'B3', bText: '' },
      { aLabel: 'A4', aText: '', bLabel: 'B4', bText: '' },
    ];
    this.matrixExtraMatches = [];
    this.matrixMappings     = new Map();

    if (this.editor) {
      this.editor.nativeElement.innerHTML = '';
    }
    this.cdr.detectChanges();
  }
}