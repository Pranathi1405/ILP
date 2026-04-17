// Author: E.Kaeith Emmanuel
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
  InterfaceOption,
} from '../../../../../../../../core/utils/questionmap';
import { SafeLatexPipe } from '../../../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-msq-question',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './msq-question.html',
})
export class MsqQuestion {
  @Input() question!: InterfaceQuestion;
  @Input() answer: number[] = [];
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  toggle(optionId: number): void {
    this.answerChange.emit({ value: optionId });
  }

  isSelected(optionId: number): boolean {
    return Array.isArray(this.answer) && this.answer.includes(optionId);
  }

  get selectedCount(): number {
    return Array.isArray(this.answer) ? this.answer.length : 0;
  }

  isPartial(): boolean {
    return this.question?.questionType === 'MSQ_PARTIAL';
  }
}
