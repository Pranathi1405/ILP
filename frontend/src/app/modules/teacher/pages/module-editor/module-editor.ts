//  Authors: Shri Mownika  , Poojitha 
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-module-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './module-editor.html'
})
export class ModuleEditorComponent {
  courseName = '';

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      this.loadContent();
    });
  }

  videos: any[] = [];
  pdfs: any[] = [];
  ngOnInit() {
    // const nav = history.state;

    // this.courseName = nav?.courseName || 'Course';
    this.loadContent();
  }

  // temporary static data (later we will connect API)
  modules = [
    { id: 1, name: 'Module 1 : Kinematics' },
    { id: 2, name: 'Module 2 : Laws of Motion' }
  ];

  selectedModule = this.modules[0];

  // change module on click
  selectModule(module: any) {
    this.selectedModule = module;
    this.loadContent();
  }
  loadContent() {
    const allItems = JSON.parse(localStorage.getItem('videos') || '[]');

    this.videos = allItems.filter(
      (item: any) => item.type === 'VIDEO' && item.moduleId === this.selectedModule.id && item.status === 'PUBLISHED'
    );

    this.pdfs = allItems.filter(
      (item: any) => item.type === 'PDF' && item.moduleId === this.selectedModule.id && item.status === 'PUBLISHED'
    );
  }
  //  ADD THIS FUNCTION
  goToVideoUpload() {
    this.router.navigate(['/teacher/video-upload'], {
      state: {
       courseName: 'Physic Batch-1',
        moduleId: this.selectedModule.id,
        moduleName: this.selectedModule.name
      }
    });
  }

  goToAddMaterial() {
    this.router.navigate(['/teacher/study-materials/create'], {
      state: {
        courseName: 'Physic Batch-1',
        moduleId: this.selectedModule.id,
        moduleName: this.selectedModule.name
      }
    });
  }


  goToAddPdf() {
    this.router.navigate(['/teacher/pdf-upload'], {
      state: {
        courseName: 'Physic Batch-1',
        moduleId: this.selectedModule.id,
        moduleName: this.selectedModule.name
      }
    });
  }

}