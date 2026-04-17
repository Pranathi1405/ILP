// Author: E.Kaeith Emmanuel
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';
import { SafeLatexPipe } from '../../../../../../../../core/utils/safe-latex.pipe';

@Component({
  selector: 'app-paragraph-mcq-question',
  standalone: true,
  imports: [CommonModule, SafeLatexPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paragraph-mcq-question.html',
})
export class ParagraphMcqQuestion {
  @Input() question!: InterfaceQuestion;
  /**
   * Single answer for THIS question (not sub-questions).
   * The paragraph text is shared/displayed above, but each
   * paragraph question is a fully independent question in the
   * navigator with its own answer slot in the Redux store.
   */
  @Input() answer: number | null = null;
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  selectOption(optionId: number): void {
    // Clicking the already-selected option deselects it
    if (this.answer === optionId) {
      this.answerChange.emit({ value: null });
    } else {
      this.answerChange.emit({ value: optionId });
    }
  }

  isSelected(optionId: number): boolean {
    return this.answer === optionId;
  }
}
