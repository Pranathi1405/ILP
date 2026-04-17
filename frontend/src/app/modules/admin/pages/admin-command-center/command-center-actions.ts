import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-command-center-actions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="h-full rounded-[28px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
      <div class="mb-4">
        <p class="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-900">
          Operational Command Center
        </p>
        <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">
          Action queues that need admin attention right now
        </p>
      </div>

      <div class="grid gap-3">
        @for (card of cards; track card.label) {
          <a
            class="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 no-underline transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_36px_rgba(37,99,235,0.08)]"
            [routerLink]="card.route"
          >
            <div>
              <p class="text-[0.98rem] font-extrabold text-slate-900">{{ card.label }}</p>
              <p class="mt-1 text-[0.76rem] font-semibold text-slate-500">{{ card.description }}</p>
            </div>

            <div class="flex flex-col items-end gap-2">
              <span class="rounded-full px-3 py-1 text-[0.78rem] font-black" [class]="toneClass(card.tone)">
                {{ card.count }}
              </span>
              <span class="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-blue-600">
                Open
              </span>
            </div>
          </a>
        }
      </div>
    </article>
  `,
  host: {
    class: 'block h-full',
  },
})
export class CommandCenterActionsComponent {
  @Input() cards: Array<{
    label: string;
    count: string;
    description: string;
    route: string;
    tone: 'amber' | 'rose' | 'blue' | 'violet';
  }> = [];

  toneClass(tone: string): string {
    const toneMap: Record<string, string> = {
      amber: 'bg-amber-100 text-amber-700',
      rose: 'bg-rose-100 text-rose-700',
      blue: 'bg-blue-100 text-blue-700',
      violet: 'bg-violet-100 text-violet-700',
    };

    return toneMap[tone] ?? toneMap['blue'];
  }
}
