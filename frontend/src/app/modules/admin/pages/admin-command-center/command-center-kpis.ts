import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-command-center-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="grid min-h-[25vh] gap-4 grid-cols-4 max-[1199px]:grid-cols-2 max-[639px]:grid-cols-1"
    >
      @for (card of cards; track card.label) {
        <article
          class="flex h-full flex-col justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
              [class]="iconToneClass(card.tone)"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                @switch (card.icon) {
                  @case ('users') {
                    <path
                      d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle cx="9.5" cy="7" r="3" stroke-width="1.8" />
                    <path
                      d="M20 21v-2a4 4 0 0 0-3-3.87"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M14 4.13a3 3 0 0 1 0 5.74"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  }
                  @case ('pulse') {
                    <path
                      d="M22 12h-4l-3 7-4-14-3 7H2"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  }
                  @case ('revenue') {
                    <path
                      d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  }
                  @case ('doubts') {
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9 9h6M9 13h3"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  }
                  @default {
                    <circle cx="12" cy="12" r="8" stroke-width="1.8" />
                  }
                }
              </svg>
            </span>
            <span class="text-[0.72rem] font-black uppercase tracking-[0.08em] text-slate-500">
              {{ card.label }}
            </span>
          </div>

          <div class="mt-4">
            <p class="text-[clamp(1.45rem,2vw,2rem)] font-black tracking-[-0.04em] text-slate-900">
              {{ card.value }}
            </p>
            <p class="mt-1 text-[0.78rem] font-semibold text-slate-500">{{ card.hint }}</p>
          </div>
        </article>
      }
    </section>
  `,
})
export class CommandCenterKpisComponent {
  @Input() cards: Array<{
    label: string;
    value: string;
    hint: string;
    tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';
    icon: string;
  }> = [];

  iconToneClass(tone: string): string {
    const toneMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      amber: 'bg-amber-100 text-amber-600',
      violet: 'bg-violet-100 text-violet-600',
      rose: 'bg-rose-100 text-rose-600',
      slate: 'bg-slate-200 text-slate-700',
    };

    return toneMap[tone] ?? toneMap['slate'];
  }
}
