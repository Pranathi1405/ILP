// Author: E.Kaeith Emmanuel
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';

@Component({
  selector: 'app-integer-question',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integer-question.html',
})
export class IntegerQuestion implements OnChanges {
  @Input() question!: InterfaceQuestion;
  @Input() answer: number | null = null;
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  display = '';
  private _negative = false;

  readonly digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  ngOnChanges(c: SimpleChanges): void {
    if (c['answer']) {
      this.display = this.answer !== null ? String(this.answer) : '';
      this._negative = this.display.startsWith('-');
    }
  }

  pressDigit(d: string): void {
    const raw = this.display.replace('-', '');
    if (raw.length >= 5) return;
    if (raw === '' || raw === '0') {
      this.display = (this._negative ? '-' : '') + d;
    } else {
      this.display += d;
    }
    this._emit();
  }

  toggleSign(): void {
    if (!this.display || this.display === '0') return;
    this._negative = !this._negative;
    this.display = this._negative
      ? '-' + this.display.replace('-', '')
      : this.display.replace('-', '');
    this._emit();
  }

  backspace(): void {
    if (!this.display) return;
    this.display = this.display.slice(0, -1);
    if (this.display === '-') {
      this.display = '';
      this._negative = false;
    }
    this._emit();
  }

  clear(): void {
    this.display = '';
    this._negative = false;
    this._emit();
  }

  private _emit(): void {
    const parsed = this.display !== '' ? parseInt(this.display, 10) : null;
    this.answerChange.emit({ value: isNaN(parsed as number) ? null : parsed });
  }
}
