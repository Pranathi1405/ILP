import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentPerformanceService } from '../../../../core/services/parent/parent-performance.service';
import {
  ParentPerformanceViewModel,
  ExamResultRow,
} from '../../../../core/services/parent/parent-performance.data';

@Component({
  selector: 'app-parent-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './performance.html',
  styleUrls: ['./performance.css'],
})
export class ParentPerformanceComponent implements OnInit {
  private service = inject(ParentPerformanceService);
  private cdr = inject(ChangeDetectorRef);

  // ── State ──
  isLoading = true;
  hasError = false;
  vm: ParentPerformanceViewModel | null = null;

  // ── Modal state ──               ← ADD THESE
  showAnalysisModal = false;
  selectedExam: ExamResultRow | null = null;

  // ── SVG chart config ──
  readonly chartWidth = 400;
  readonly chartHeight = 160;
  readonly chartPadding = 30;
  readonly yAxisLines = [0, 25, 50, 75, 100];
  readonly yAxisLabels = [0, 50, 100];

  ngOnInit(): void {
    this.load();
  }

  retry(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.service.getPerformanceViewModel().subscribe({
      next: (vm) => {
        this.vm = vm;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Performance page load failed:', err);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Modal methods ──             ← ADD THESE
  openAnalysis(exam: ExamResultRow): void {
    this.selectedExam = exam;
    this.showAnalysisModal = true;
    this.cdr.detectChanges();
  }

  closeAnalysis(): void {
    this.showAnalysisModal = false;
    this.selectedExam = null;
    this.cdr.detectChanges();
  }

  // ── SVG chart helpers ──
  getChartY(scorePercent: number): number {
    const usableHeight = this.chartHeight - this.chartPadding * 2;
    return this.chartPadding + usableHeight - (scorePercent / 100) * usableHeight;
  }

  getChartX(index: number): number {
    const total = this.vm?.trendPoints?.length ?? 1;
    const usableWidth = this.chartWidth - this.chartPadding * 2;
    if (total <= 1) return this.chartWidth / 2;
    return this.chartPadding + (index / (total - 1)) * usableWidth;
  }

  get chartPolylinePoints(): string {
    return (this.vm?.trendPoints ?? [])
      .map((p, i) => `${this.getChartX(i)},${this.getChartY(p.score_percent)}`)
      .join(' ');
  }

  get chartAreaPath(): string {
    const points = this.vm?.trendPoints ?? [];
    if (points.length === 0) return '';
    const coords = points.map((p, i) => `${this.getChartX(i)},${this.getChartY(p.score_percent)}`);
    const lastX = this.getChartX(points.length - 1);
    const firstX = this.getChartX(0);
    const bottom = this.chartHeight - this.chartPadding;
    return `M ${coords.join(' L ')} L ${lastX},${bottom} L ${firstX},${bottom} Z`;
  }
}
