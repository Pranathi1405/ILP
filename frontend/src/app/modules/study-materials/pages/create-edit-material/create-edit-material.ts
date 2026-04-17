// Author: Poojitha
// Study-Materials Teacher Side, Material Content Creation Component
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudyMaterialService } from '../../../../core/services/studyMaterials/studyMaterials.service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Content } from '../../models/content.model';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { RenderLatexCleanPipe } from '../../pipes/render-latex-clean.pipe';
import { FooterActions } from "../../../../shared/components/footer-actions/footer-actions";

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, CKEditorModule, RenderLatexCleanPipe, FooterActions],
  selector: 'app-create-edit-material',
  templateUrl: './create-edit-material.html',
  styleUrls: ['./create-edit-material.css']
})
export class CreateEditMaterial implements OnInit {

  materialForm!: FormGroup;
  Editor : any = ClassicEditor;

  showPreview = true;
  subjectName = '';
  moduleName = '';
  moduleId!: number;

    private service= inject(StudyMaterialService);
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) { }

 ngOnInit() {
  this.materialForm = this.fb.group({
    title: ['', Validators.required],
    content: ['']
  });

  const nav = history.state;

this.subjectName = nav?.courseName || 'Course';
this.moduleName = nav?.moduleName || 'Module';
this.moduleId = nav?.moduleId; 

 console.log('Received moduleId:', this.moduleId); 
  const draft = localStorage.getItem('materialDraft');
  if (draft) {
    this.materialForm.patchValue(JSON.parse(draft));
  }
}

 saveDraft() {
  const payload = {
    moduleId: 1203, // this.moduleId,(later dynamic)
    materialName: this.materialForm.value.title,
    resourceType: 'document' as const,
    contentHtml: this.materialForm.value.content,
    pdfUrl: null,
    fileSize: null,
    isPublished: 0
  };

  this.service.createStudyMaterial(payload).subscribe({
    next: () => alert('Draft saved'),
    error: () => alert('Failed to save draft')
  });
}


  publishContent() {
  if (this.materialForm.invalid) {
    alert('Please enter title');
    return;
  }

  const payload = {
    moduleId: 1204, //this.moduleId (later dynamic)
    materialName: this.materialForm.value.title,
    resourceType: 'document' as const,
    contentHtml: this.materialForm.value.content,
    pdfUrl: null,
    fileSize: null,
    isPublished: 1
  };
  console.log(payload);

  this.service.createStudyMaterial(payload).subscribe({
    next: (res) => {
      alert('Material published successfully');
      this.router.navigate(['/teacher/module-editor']);
    },
    error: (err) => {
      console.error(err);
      alert(err?.error?.message || 'Failed to publish material');
    }
  });
}


  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  onCancel() {
    this.router.navigate(['/teacher/module-editor']);
  }
}
