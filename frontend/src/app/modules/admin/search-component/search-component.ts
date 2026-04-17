/**
 * AUTHOR: Umesh Teja Peddi
 *
 * Search Component
 * ----------------
 * Reusable search input used across admin pages for text-based
 * filtering and query entry.
 *
 * Purpose:
 * Provides a consistent search UI with model-based value binding
 * and an output event for parent-driven filtering logic.
 *
 * Usage:
 * Imported into admin presentation components that need a shared
 * search field and outward value emission.
 */

import { Component, output, model } from '@angular/core';

@Component({
  selector: 'app-search-component',
  standalone: true,
  imports: [],
  templateUrl: './search-component.html',
})
export class SearchComponent {
  placeholder = model<string>('Search something... anything...');
  value = model<string>('');
  valueChange = output<string>();

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.valueChange.emit(val);
  }
}
