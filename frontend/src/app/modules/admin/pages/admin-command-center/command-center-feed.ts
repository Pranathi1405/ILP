import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-command-center-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-[28px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <p class="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-900">Live Activity Feed</p>
          <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">
            Real-time style operational signals across the platform
          </p>
        </div>

        <span class="rounded-full bg-blue-50 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-blue-600">
          Recent activity
        </span>
      </div>

      <div class="grid max-h-[calc(30vh-2.75rem)] gap-3 overflow-y-auto pr-1">
        @if (items.length === 0) {
          <div class="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-400">
            No recent activity is available yet.
          </div>
        } @else {
          @for (item of items; track item.title + item.timeLabel) {
            <article class="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-slate-200 py-4 last:border-b-0 max-[639px]:grid-cols-[auto_1fr]">
              <span class="mt-1 h-3 w-3 rounded-full" [class]="toneClass(item.tone)"></span>

              <div>
                <p class="text-[0.96rem] font-extrabold text-slate-900">{{ item.title }}</p>
                <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">{{ item.detail }}</p>
              </div>

              <span class="whitespace-nowrap text-[0.7rem] font-extrabold uppercase tracking-[0.08em] text-slate-400 max-[639px]:col-start-2 max-[639px]:mt-1">
                {{ item.timeLabel }}
              </span>
            </article>
          }
        }
      </div>
    </article>
  `,
})
export class CommandCenterFeedComponent {
  @Input() items: Array<{
    title: string;
    detail: string;
    timeLabel: string;
    tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  }> = [];

  toneClass(tone: string): string {
    const toneMap: Record<string, string> = {
      blue: 'bg-blue-600',
      emerald: 'bg-emerald-600',
      amber: 'bg-amber-600',
      rose: 'bg-rose-600',
      violet: 'bg-violet-600',
    };

    return toneMap[tone] ?? toneMap['blue'];
  }
}
