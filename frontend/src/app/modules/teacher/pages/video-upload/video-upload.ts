//  Author: Poojitha 
//  Video-Upload Component for recorded Classes 

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload } from "../../../../shared/components/file-upload/file-upload";
import { FooterActions } from "../../../../shared/components/footer-actions/footer-actions";
import { Router } from '@angular/router';
export type VideoStatus = 'DRAFT' | 'PUBLISHED';


@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, FileUpload, FooterActions],
  templateUrl: './video-upload.html'
})
export class VideoUploadComponent {

  courseName: string = '';
  moduleName: string = '';
  moduleId = '';

  // FORM DATA (for future use)
  videoTitle: string = '';
  description: string = '';

  // FILE UPLOAD 
  selectedFile: File | null = null;
  uploadProgress: number = 0;

  // THUMBNAIL STATE
  thumbnailFile: File | null = null;
  thumbnailPreview: string | null = null;
  showImagePreview: boolean = false;
  accessType: 'COURSE' | 'FREE' = 'COURSE';

  constructor(private router: Router) { }
  ngOnInit() {
    const nav = history.state;

    this.courseName = nav?.courseName || 'Course';
    this.moduleName = nav?.moduleName || 'Module';
    this.moduleId = nav?.moduleId || 1;
  }
  // when user selects file
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // simulate upload progress (temporary)
      this.simulateUpload();
    }
  }

  // fake progress (UI demo)
  simulateUpload() {
    this.uploadProgress = 0;

    const interval = setInterval(() => {
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
      } else {
        this.uploadProgress += 10;
      }
    }, 300);
  }
  onThumbnailSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.thumbnailFile = file;

    // create preview
    this.thumbnailPreview = URL.createObjectURL(file);
  }
  removeThumbnail() {
    if (this.thumbnailPreview) {
      URL.revokeObjectURL(this.thumbnailPreview);
    }

    this.thumbnailFile = null;
    this.thumbnailPreview = null;
  }
  onSaveDraft() {
    const payload = this.buildPayload('DRAFT');

    // store in localStorage (temporary)
    const existing = JSON.parse(localStorage.getItem('videos') || '[]');
    existing.push(payload);
    localStorage.setItem('videos', JSON.stringify(existing));

    alert('Draft saved ✅');

  }

  onPublish() {

    // basic validation
    if (!this.videoTitle || !this.selectedFile) {
      alert('Please add title and video file');
      return;
    }

    const payload = this.buildPayload('PUBLISHED');

    const existing = JSON.parse(localStorage.getItem('videos') || '[]');
    existing.push(payload);
    localStorage.setItem('videos', JSON.stringify(existing));

    alert('Video published');

    this.navigateBack();
  }

  onCancel() {
    this.navigateBack();
  }
  navigateBack() {
    this.router.navigate(['teacher/module-editor']);
  }
  onFileData(data: any) {
    this.videoTitle = data.title;
    this.description = data.description;
    this.selectedFile = data.file;

    console.log('Received from child:', data);
  }
  buildPayload(status: VideoStatus) {
    return {
      id: crypto.randomUUID(),
      title: this.videoTitle,
      description: this.description,
      videoFileName: this.selectedFile?.name || '',
      thumbnailName: this.thumbnailFile?.name || '',
      access: this.accessType,
      status,
      moduleId: this.moduleId,
      type: 'VIDEO',
      createdAt: new Date()
    };
  }

}