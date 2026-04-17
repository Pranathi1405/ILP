import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-command-center-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="h-full rounded-[28px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)]"
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <p class="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-900">{{ title }}</p>
          @if (subtitle) {
            <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">{{ subtitle }}</p>
          }
        </div>

        @if (badge) {
          <span
            class="rounded-full bg-indigo-50 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-indigo-600"
          >
            {{ badge }}
          </span>
        }
      </div>

      <div class="relative" [style.height.px]="height">
        @if (!hasData()) {
          <div
            class="grid h-full place-items-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-400"
          >
            {{ emptyMessage }}
          </div>
        } @else {
          <canvas #canvas class="h-full! w-full!"></canvas>
        }
      </div>
    </article>
  `,
  host: {
    class: 'block h-full',
  },
})
export class CommandCenterChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badge = '';
  @Input() height = 240;
  @Input() emptyMessage = 'No chart data available.';
  @Input() config: ChartConfiguration | null = null;

  @ViewChild('canvas')
  set canvasElement(element: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvasRef = element;

    if (element && this.viewReady) {
      queueMicrotask(() => this.renderChart());
    }
  }

  private chart: Chart | null = null;
  private canvasRef?: ElementRef<HTMLCanvasElement>;
  private viewReady = false;
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.viewReady) {
      queueMicrotask(() => this.renderChart());
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  hasData(): boolean {
    const labels = this.config?.data?.labels ?? [];
    const datasets = this.config?.data?.datasets ?? [];
    return labels.length > 0 && datasets.some((dataset: any) => (dataset.data?.length ?? 0) > 0);
  }

  private renderChart(): void {
    if (!this.canvasRef?.nativeElement || !this.config || !this.hasData()) return;

    this.chart?.destroy();
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      ...this.config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        ...this.config.options,
      },
    });

    this.cdr.detectChanges();
  }
}
