//  Author: Poojitha 
//  File Upload Component used for video upload and pdf upload

import { Component, Input,Output, signal, computed, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.html',
  // styleUrl: './file-upload.css',
})
export class FileUpload {

  // CONFIG INPUTS
  @Input() titleLabel: string = '';
  @Input() descriptionLabel: string = '';
  @Input() uploadText: string = '';
  @Input() supportedText: string = '';
  @Input() buttonText: string = 'Browse Files';
  @Input() accept: string = '';
  @Input() enablePreview: boolean = false; 
  @Input() titlePlaceholder: string = '';
@Input() descriptionPlaceholder: string = '';
title: string = '';
description: string = '';


  @Output() fileChange = new EventEmitter<any>();

  //  STATE
  selectedFile = signal<File | null>(null);
  uploadProgress = signal<number>(0);

  //  PREVIEW STATE
  fileType = signal<'video' | 'pdf' | 'image' | 'unknown'>('unknown');
  previewUrl = signal<string | null>(null);
  showPreview = signal<boolean>(false);
  safePreviewUrl = signal<SafeResourceUrl | null>(null);

  //  COMPUTED
  fileName = computed(() => this.selectedFile()?.name || '');
  isUploading = computed(() => this.uploadProgress() > 0 && this.uploadProgress() < 100);

  constructor(private sanitizer: DomSanitizer) {}

  // FILE SELECT
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile.set(file);

    // detect file type
    if (file.type.startsWith('video')) {
      this.fileType.set('video');
    } else if (file.type === 'application/pdf') {
      this.fileType.set('pdf');
    } else if (file.type.startsWith('image')) {
      this.fileType.set('image');
    } else {
      this.fileType.set('unknown');
    }

    // create preview URL
    const url = URL.createObjectURL(file);
    this.previewUrl.set(url);
    // only needed for iframe (PDF)
    this.safePreviewUrl.set(
  this.sanitizer.bypassSecurityTrustResourceUrl(url)
);

    this.simulateUpload();
    this.emitData();
  }

  // FAKE PROGRESS
  simulateUpload() {
    this.uploadProgress.set(0);

    const interval = setInterval(() => {
      if (this.uploadProgress() >= 100) {
        clearInterval(interval);
      } else {
        this.uploadProgress.update(v => v + 10);
      }
    }, 300);
  }

  // CLEANUP (optional but good practice)
  ngOnDestroy() {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
  }
  removeFile() {
  // revoke old preview URL (important)
  if (this.previewUrl()) {
    URL.revokeObjectURL(this.previewUrl()!);
  }

  // reset everything
  this.selectedFile.set(null);
  this.uploadProgress.set(0);
  this.previewUrl.set(null);
  this.fileType.set('unknown');
  this.showPreview.set(false);
  // notify parent
    this.emitData();
}
onTitleChange(value: string) {
  this.title = value;
  this.emitData();
}

onDescriptionChange(value: string) {
  this.description = value;
  this.emitData();
}
emitData() {
  this.fileChange.emit({
    title: this.title,
    description: this.description,
    file: this.selectedFile()
  });
}


}
