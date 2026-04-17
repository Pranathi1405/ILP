import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UgTestService } from '../../../../../core/services/tests/custom-tests/custom-test';
import { SafeLatexPipe } from '../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-test-analysis',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  templateUrl: './viewanalysis.html',
})
export class Viewanalysis implements OnInit {
  attemptId!: number;

  result: any = null;
  answers: any[] = [];

  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private ugTestService: UgTestService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.attemptId = Number(this.route.snapshot.paramMap.get('attemptId'));
    this.loadResult();
  }

  loadResult() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.ugTestService.getResults(this.attemptId).subscribe({
      next: (res) => {
        const data = res?.data;

        if (!data) {
          this.error = 'No result found';
          this.loading = false;
          return;
        }

        // ✅ Normalize numbers (IMPORTANT FIX)
        this.result = {
          ...data,
          total_score: Number(data.total_score || 0),
          accuracy_percent: Number(data.accuracy_percent || 0),
        };

        this.answers = (data.answers || []).map((a: any) => ({
          ...a,
          marks_obtained: Number(a.marks_obtained || 0),
          marks_correct: Number(a.marks_correct || 0),
          marks_incorrect: Number(a.marks_incorrect || 0),
        }));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load analysis';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ helpers
  getStatus(answer: any) {
    if (answer.answer_status === 'not_answered') return 'skipped';
    if (answer.is_correct) return 'correct';
    return 'wrong';
  }

  getStatusColor(answer: any) {
    const status = this.getStatus(answer);

    return {
      'bg-green-50 border-green-200': status === 'correct',
      'bg-red-50 border-red-200': status === 'wrong',
      'bg-gray-50 border-gray-200': status === 'skipped',
    };
  }
}
