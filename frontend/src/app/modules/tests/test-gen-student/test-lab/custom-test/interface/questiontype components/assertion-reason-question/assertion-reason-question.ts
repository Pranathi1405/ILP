// Author: E.Kaeith Emmanuel
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';
import { SafeLatexPipe } from '../../../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-assertion-reason-question',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assertion-reason-question.html',
})
export class AssertionReasonQuestion {
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

  label(i: number): string {
    return String.fromCharCode(65 + i);
  }

  get assertion(): string {
    const q: string = this.question?.question ?? '';
    const m = q.match(/Assertion\s*\(A\)\s*[:\-]\s*(.*?)(?=\s*Reason\s*\(R\)|$)/is);
    return m ? m[1].trim() : q;
  }

  get reason(): string {
    const q: string = this.question?.question ?? '';
    const m = q.match(/Reason\s*\(R\)\s*[:\-]\s*(.*)/is);
    return m ? m[1].trim() : '';
  }
}
