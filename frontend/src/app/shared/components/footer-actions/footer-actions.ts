//  Author: Poojitha 
//   Footer-actions component reusable for video-upload, add-pdf and add-material pages 

import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer-actions.html',
  styleUrls: ['./footer-actions.css']
})
export class FooterActions {

  @Input() publishLabel: string = 'Publish';

  @Output() cancel = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
}
