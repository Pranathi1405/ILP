/**
 * AUTHOR: Umesh Teja Peddi
 * src/app/core/shared/components/toast/toast.service.ts
 *
 * Push toasts from anywhere. The ToastComponent renders them.
 */

import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  title: string;
  message: string;
  type: string; // notification_type string e.g. 'payment', 'system', etc.
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  toasts = signal<ToastItem[]>([]);

  show(data: Omit<ToastItem, 'id'>, duration = 6000): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { ...data, id }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
