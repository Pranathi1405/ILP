// Author: E.Kaeith Emmanuel
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnswerChangeEvent,
  InterfaceQuestion,
} from '../../../../../../../../core/utils/questionmap';

@Component({
  selector: 'app-nat-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nat-question.html',
})
export class NatQuestion implements OnChanges {
  @Input() question!: InterfaceQuestion;
  @Input() answer: number | null = null;
  @Output() answerChange = new EventEmitter<AnswerChangeEvent<number | null>>();

  displayValue = '';
  isNegative = false;
  hasDecimal = false;

  readonly digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['answer']) {
      // Convert incoming number → display string, preserving decimals
      this.displayValue = this.answer !== null ? String(this.answer) : '';
      this.isNegative = this.displayValue.startsWith('-');
      this.hasDecimal = this.displayValue.includes('.');
    }
  }

  pressDigit(digit: string): void {
    if (digit === '.') {
      if (this.hasDecimal) return; // only one decimal point allowed
      if (this.displayValue === '') {
        this.displayValue = '0.'; // lead with 0 if empty
      } else {
        this.displayValue += '.';
      }
      this.hasDecimal = true;
    } else {
      if (this.displayValue === '0') {
        this.displayValue = digit; // replace leading zero
      } else if (this.displayValue === '-0') {
        this.displayValue = '-' + digit;
      } else {
        this.displayValue += digit;
      }
    }
    this.emit();
  }

  toggleSign(): void {
    if (this.displayValue === '' || this.displayValue === '0') return;
    if (this.isNegative) {
      this.displayValue = this.displayValue.slice(1);
    } else {
      this.displayValue = '-' + this.displayValue;
    }
    this.isNegative = !this.isNegative;
    this.emit();
  }

  backspace(): void {
    if (this.displayValue.length === 0) return;
    const removed = this.displayValue.slice(-1);
    if (removed === '.') this.hasDecimal = false;
    this.displayValue = this.displayValue.slice(0, -1);
    if (this.displayValue === '-') {
      this.displayValue = '';
      this.isNegative = false;
    }
    this.emit();
  }

  clear(): void {
    this.displayValue = '';
    this.isNegative = false;
    this.hasDecimal = false;
    this.emit();
  }

  private emit(): void {
    if (this.displayValue === '' || this.displayValue === '-' || this.displayValue === '0.') {
      // Incomplete input — emit null until user finishes typing
      this.answerChange.emit({ value: null });
      return;
    }
    const parsed = parseFloat(this.displayValue);
    this.answerChange.emit({ value: isNaN(parsed) ? null : parsed });
  }
}
