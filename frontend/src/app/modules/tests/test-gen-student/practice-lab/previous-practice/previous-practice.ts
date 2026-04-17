import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PracticeService } from '../../../../../core/services/tests/practice-tests/practiceservice';
import { SafeLatexPipe } from '../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  templateUrl: './previous-practice.html',
})
export class PreviousPractice implements OnInit {
  attemptId!: number;
  data: any = null;

  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private service: PracticeService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.attemptId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadResults();
  }

  loadResults(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.getResults(this.attemptId).subscribe({
      next: (res) => {
        this.data = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load analysis';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ parse explanation safely
  parseExplanation(exp: any): string {
    if (!exp) return 'No explanation available';

    try {
      const parsed = JSON.parse(exp);
      return parsed?.text || 'No explanation available';
    } catch {
      return exp;
    }
  }

  isSelected(q: any, opt: any): boolean {
    return q.selected_option_id === opt.option_id;
  }

  isCorrect(opt: any): boolean {
    return opt.is_correct === 1;
  }
}
