import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance-kpis',
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
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                @switch (card.icon) {
                  @case ('revenue') {
                    <path
                      d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  }
                  @case ('calendar') {
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                  }
                  @case ('today') {
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  }
                  @case ('transactions') {
                    <path d="M3 12h18M3 6h18M3 18h18" />
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
export class FinanceKpisComponent {
  @Input() cards: Array<{
    label: string;
    value: string;
    hint: string;
    tone: 'blue' | 'emerald' | 'violet' | 'rose';
    icon: string;
  }> = [];

  iconToneClass(tone: string): string {
    const toneMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      violet: 'bg-violet-100 text-violet-600',
      rose: 'bg-rose-100 text-rose-600',
    };
    return toneMap[tone] ?? toneMap['blue'];
  }
}
