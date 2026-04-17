// <!-- Author: Poojitha -->
// <!-- Study-material Page pdf-upload Component -->

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FileUpload } from '../../../../shared/components/file-upload/file-upload';
import { FooterActions } from '../../../../shared/components/footer-actions/footer-actions';
import { StudyMaterialService } from '../../../../core/services/studyMaterials/studyMaterials.service';
type ContentStatus = 'DRAFT' | 'PUBLISHED';

@Component({
  selector: 'app-pdf-upload',
  standalone: true,
  imports: [FileUpload, FooterActions],
  templateUrl: './pdf-upload.html',
})
export class PdfUpload {

  constructor(private router: Router) { }

  courseName = '';
  moduleName = '';
 moduleId!: number;
  accessType: 'COURSE' | 'FREE' = 'COURSE';
  selectedFile: File | null = null;
  title = '';
  description = '';
  private service = inject(StudyMaterialService);


  ngOnInit() {
    const nav = history.state;

    this.courseName = nav?.courseName || 'Course';
    this.moduleName = nav?.moduleName || 'Module';
    this.moduleId = Number(nav?.moduleId);
  }

  onFileData(data: any) {
    this.selectedFile = data.file;
    this.title = data.title;
    this.description = data.description;
  }

 buildApiPayload(isPublished: number) {
  return {
    moduleId: 1205, // this.moduleId,
    materialName: this.title,
    resourceType: 'pdf' as const,
    pdfUrl: this.previewUrlFromFile(), // temporary (explained below)
    fileSize: this.selectedFile ? +(this.selectedFile.size / (1024 * 1024)).toFixed(2) : null,
    isPublished
  };
}
previewUrlFromFile() {
  return this.selectedFile
    ? URL.createObjectURL(this.selectedFile)
    : null;
}


  onSaveDraft() {
  const payload = this.buildApiPayload(0);

  this.service.createStudyMaterial(payload).subscribe({
    next: () => alert('Draft saved'),
    error: () => alert('Failed to save draft')
  });
}

 onPublish() {
  if (!this.title || !this.selectedFile) {
    alert('Please add title and PDF file');
    return;
  }

  const payload = this.buildApiPayload(1);

  console.log('PDF API Payload:', payload);

  this.service.createStudyMaterial(payload).subscribe({
    next: () => {
      alert('PDF published successfully');
      this.navigateBack();
    },
    error: (err) => {
      console.error(err);
      alert(err?.error?.message || 'Failed to upload PDF');
    }
  });
}


  onCancel() {
    this.navigateBack();
  }

  navigateBack() {
    this.router.navigate(['/teacher/module-editor']);
  }
}
