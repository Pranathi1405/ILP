// Author: E.Kaeith Emmanuel
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';
import { SafeLatexPipe } from '../../../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-mcq-question',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  templateUrl: './mcq-question.html',
})
export class McqQuestion {
  @Input() question!: InterfaceQuestion;
  @Input() answer: number | null = null;
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  select(optionId: number): void {
    if (this.answer === optionId) {
      this.answerChange.emit({ value: null });
    } else {
      this.answerChange.emit({ value: optionId });
    }
  }
}
