// Author: E.Kaeith Emmanuel
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';
import { SafeLatexPipe } from '../../../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-match-matrix-question',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-matrix-question.html',
})
export class MatchMatrixQuestion {
  @Input() question!: InterfaceQuestion;
  @Input() answer: number | null = null;
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  select(index: number): void {
    if (this.answer === index) {
      this.answerChange.emit({ value: null }); // deselect
    } else {
      this.answerChange.emit({ value: index });
    }
  }

  isSelected(index: number): boolean {
    return this.answer === index;
  }

  get listI(): { key: string; value: string }[] {
    return this._entries('List-I');
  }

  get listII(): { key: string; value: string }[] {
    return this._entries('List-II');
  }

  get choices(): { label: string; pairs: { k: string; v: number | string }[] }[] {
    return (this.question?.matchLeft ?? []).map((_, i: number) => ({
      label: String.fromCharCode(65 + i),
      pairs: (this.question?.matchLeft ?? []).map((left, j) => ({
        k: left,
        v: this.question?.matchRight?.[j] ?? '',
      })),
    }));
  }

  private _entries(list: string): { key: string; value: string }[] {
    if (list === 'List-I') {
      return (this.question?.matchLeft ?? []).map((v, i) => ({
        key: String.fromCharCode(65 + i), // A, B, C…
        value: v,
      }));
    }
    return (this.question?.matchRight ?? []).map((v, i) => ({
      key: String(i + 1), // 1, 2, 3…
      value: v,
    }));
  }
}
