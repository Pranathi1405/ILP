// Author: E.Kaeith Emmanuel
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-caluclator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caluclator.html',
  styleUrls: ['./caluclator.css'],
})
export class Caluclator {
  isOpen = signal(false);
  display = signal('0');
  expression = signal('');
  angleMode = signal<'Deg' | 'Rad'>('Deg');
  memory = signal(0);
  hasMemory = signal(false);
  justEvaled = signal(false);
  error = signal(false);

  toggle() {
    this.isOpen.update((v) => !v);
  }
  close() {
    this.isOpen.set(false);
  }

  // ── Angle mode ────────────────────────────────────────────────────────────
  setAngle(mode: 'Deg' | 'Rad') {
    this.angleMode.set(mode);
  }

  private toRad(x: number) {
    return this.angleMode() === 'Deg' ? (x * Math.PI) / 180 : x;
  }
  private fromRad(x: number) {
    return this.angleMode() === 'Deg' ? (x * 180) / Math.PI : x;
  }

  // ── Digit / decimal input ────────────────────────────────────────────────
  inputDigit(d: string) {
    this.error.set(false);
    if (this.justEvaled()) {
      this.display.set(d === '.' ? '0.' : d);
      this.expression.set('');
      this.justEvaled.set(false);
    } else {
      if (d === '.' && this.display().includes('.')) return;
      this.display.update((v) => (v === '0' && d !== '.' ? d : v + d));
    }
  }

  // ── Operators ─────────────────────────────────────────────────────────────
  inputOp(op: string) {
    this.error.set(false);
    this.justEvaled.set(false);
    this.expression.update((e) => e + this.display() + ' ' + op + ' ');
    this.display.set('0');
  }

  inputParen(p: string) {
    this.justEvaled.set(false);
    this.error.set(false);
    this.expression.update((e) => e + p);
  }

  // ── Functions ─────────────────────────────────────────────────────────────
  fn(name: string) {
    this.error.set(false);
    const v = parseFloat(this.display());
    let r: number;

    switch (name) {
      // ── Trig normal ──
      case 'sin':
        r = Math.sin(this.toRad(v));
        break;
      case 'cos':
        r = Math.cos(this.toRad(v));
        break;
      case 'tan':
        r = Math.tan(this.toRad(v));
        break;
      // ── Trig inverse ──
      case 'asin':
        r = this.fromRad(Math.asin(v));
        break;
      case 'acos':
        r = this.fromRad(Math.acos(v));
        break;
      case 'atan':
        r = this.fromRad(Math.atan(v));
        break;
      // ── Hyperbolic ──
      case 'sinh':
        r = Math.sinh(v);
        break;
      case 'cosh':
        r = Math.cosh(v);
        break;
      case 'tanh':
        r = Math.tanh(v);
        break;
      case 'asinh':
        r = Math.asinh(v);
        break;
      case 'acosh':
        r = Math.acosh(v);
        break;
      case 'atanh':
        r = Math.atanh(v);
        break;
      // ── Log / Exp ──
      case 'log':
        r = Math.log10(v);
        break;
      case 'ln':
        r = Math.log(v);
        break;
      case 'log2':
        r = Math.log2(v);
        break;
      case 'logy': // log base y — uses expression as base
        this.expression.update((e) => e + 'Math.log(' + v + ')/Math.log(');
        this.display.set('0');
        return;
      case 'ex':
        r = Math.exp(v);
        break;
      case '10x':
        r = Math.pow(10, v);
        break;
      // ── Power / Root ──
      case 'x2':
        r = v * v;
        break;
      case 'x3':
        r = v * v * v;
        break;
      case 'sqrt':
        r = Math.sqrt(v);
        break;
      case 'cbrt':
        r = Math.cbrt(v);
        break;
      case 'nrt': // nth root — uses expression
        this.expression.update((e) => e + 'Math.pow(' + v + ', 1/');
        this.display.set('0');
        return;
      case 'xy':
        this.expression.update((e) => e + v + ' ** ');
        this.display.set('0');
        return;
      // ── Constants ──
      case 'pi':
        r = Math.PI;
        break;
      case 'e':
        r = Math.E;
        break;
      // ── Misc ──
      case 'fact':
        r = this.factorial(v);
        break;
      case 'inv':
        r = 1 / v;
        break;
      case 'abs':
        r = Math.abs(v);
        break;
      case 'perc':
        r = v / 100;
        break;
      case 'neg':
        this.display.update((d) => (d.startsWith('-') ? d.slice(1) : '-' + d));
        return;
      case 'mod':
        this.expression.update((e) => e + v + ' % ');
        this.display.set('0');
        return;
      case 'exp': // EXP — scientific notation entry
        this.display.update((d) => d + 'e');
        return;
      default:
        return;
    }

    if (r === undefined || isNaN(r) || !isFinite(r)) {
      this.display.set('Error');
      this.error.set(true);
    } else {
      this.display.set(this.fmt(r));
    }
    this.justEvaled.set(true);
  }

  // ── Evaluate ──────────────────────────────────────────────────────────────
  evaluate() {
    this.error.set(false);
    try {
      const expr = this.expression() + this.display();
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return (' + expr + ')')();
      if (!isFinite(result) || isNaN(result)) throw new Error();
      this.expression.set(expr + ' =');
      this.display.set(this.fmt(result));
      this.justEvaled.set(true);
    } catch {
      this.display.set('Error');
      this.error.set(true);
      this.expression.set('');
    }
  }

  // ── Clear / Back ──────────────────────────────────────────────────────────
  clear() {
    this.display.set('0');
    this.expression.set('');
    this.justEvaled.set(false);
    this.error.set(false);
  }

  backspace() {
    if (this.justEvaled() || this.error()) {
      this.clear();
      return;
    }
    const v = this.display();
    this.display.set(v.length > 1 ? v.slice(0, -1) : '0');
  }

  // ── Memory ────────────────────────────────────────────────────────────────
  mc() {
    this.memory.set(0);
    this.hasMemory.set(false);
  }
  mr() {
    if (this.hasMemory()) {
      this.display.set(this.fmt(this.memory()));
      this.justEvaled.set(true);
    }
  }
  ms() {
    this.memory.set(parseFloat(this.display()));
    this.hasMemory.set(true);
  }
  mAdd() {
    this.memory.update((m) => m + parseFloat(this.display()));
    this.hasMemory.set(true);
  }
  mSub() {
    this.memory.update((m) => m - parseFloat(this.display()));
    this.hasMemory.set(true);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private fmt(n: number): string {
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-9 && n !== 0)) return n.toExponential(6);
    return parseFloat(n.toPrecision(10)).toString();
  }
}
