//Author: Poojitha

import { Component, inject, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { StudyMaterialService } from '../../services/study-material.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-material-viewer',
  imports: [CommonModule, FormsModule],
  templateUrl: './student-material-viewer.html',
  styleUrl: './student-material-viewer.css',
})
export class StudentMaterialViewer implements OnInit {

  private studyMaterialService = inject(StudyMaterialService);
  isContentsOpen = true;
  isNotesOpen = false;
  showLeftSidebar = true;
  showRightSidebar = true;
  moduleName: string = '';
  topics: any[] = [];
  selectedTopic: any = null;
  chapterContent: string = '';
  subjectId: number = 1; // temporary static
  moduleId: number = 1; // temporary static
  annotations: any[] = [];
  showToolbar = false;
  toolbarPosition = {
    x: 0,
    y: 0
  };
  originalContent: string = '';
  notesText: string = '';
  saveStatus: string = '';

  selectedRange: Range | null = null;
  constructor(
    private route: ActivatedRoute,private router: Router, private location: Location
  ) { }


  ngOnInit() {
  this.handleScreenSize();

  this.route.paramMap.subscribe(params => {
    const moduleId = Number(params.get('moduleId'));

    if (moduleId) {
      this.loadModule(moduleId);
    }
  });

  const savedAnnotations = localStorage.getItem('annotations');
  if (savedAnnotations) {
    this.annotations = JSON.parse(savedAnnotations);
  }
}



  toggleLeftSidebar() {
    this.showLeftSidebar = !this.showLeftSidebar;
  }

  toggleRightSidebar() {
    this.showRightSidebar = !this.showRightSidebar;
  }
  selectTopic(topic: any) {
    this.selectedTopic = topic;
    this.originalContent = topic.content;
    this.chapterContent = topic.content;

    const savedNotes = localStorage.getItem(`notes_${topic.id}`);
    this.notesText = savedNotes ? savedNotes : '';

    setTimeout(() => {
      this.applyAnnotations();
    }, 0);
  }


  loadModule(moduleId: number) {
    const module = this.studyMaterialService.getModuleById(moduleId);
    if (module) {
      this.moduleName = module.name;
      this.topics = module.topics;
    }

  }


  handleScreenSize() {
    //Mobile
    if (window.innerWidth < 768) {
      this.showLeftSidebar = false;
      this.showRightSidebar = false;
    }
    // Tablet
    else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      this.showLeftSidebar = true;
      this.showRightSidebar = false;
    }
    //Desktop
    else {
      this.showLeftSidebar = true;
      this.showRightSidebar = true;
    }
  }
  // Listen to window resize events to adjust sidebar visibility
  @HostListener('window:resize')
  onResize() {
    this.handleScreenSize();
  }

  //for selected text in content area
  onTextSelected() {

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    const text = selection.toString().trim();

    if (!text) {
      this.showToolbar = false;
      return;
    }

    this.selectedRange = range;

    const rect = range.getBoundingClientRect();

    this.toolbarPosition = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 40
    };

    this.showToolbar = true;
  }

  @ViewChild('contentArea')
  contentArea!: ElementRef;

  removeAnnotation() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) return;
    // remove from storage
    this.annotations = this.annotations.filter(
      a => !(a.text === text && a.chapterId === this.selectedTopic?.id)
    );
    localStorage.setItem('annotations', JSON.stringify(this.annotations));
    // remove from DOM
    const parent = range.startContainer.parentElement;
    if (parent?.tagName === 'MARK' || parent?.style.textDecoration === 'underline') {
      const plainText = parent.textContent;
      parent.replaceWith(plainText || '');
    }
    selection.removeAllRanges();
    // reapply annotations
    this.applyAnnotations();
    this.showToolbar = false;
  }


  applyAnnotation(type: 'highlight' | 'underline', color?: string) {

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !this.selectedTopic) return;

    const range = selection.getRangeAt(0);
    const annotation = {
      id: (Date.now() + Math.random()).toString(),
      chapterId: this.selectedTopic.id,
      text: selection.toString(),
      type: type,
      color: color || null
    };
    this.annotations.push(annotation);
    localStorage.setItem('annotations', JSON.stringify(this.annotations));

    let element: HTMLElement | null = null;

    if (type === 'highlight') {
      element = document.createElement('mark');
      element.style.backgroundColor = color || 'yellow';
    }

    if (type === 'underline') {
      element = document.createElement('span');
      element.style.textDecoration = 'underline';
    }

    if (element) {
      range.surroundContents(element);
    }

    selection.removeAllRanges();
    this.showToolbar = false;
  }

  // re-apply highlights when content is loaded or topic is changed
  applyAnnotations() {
    if (!this.contentArea || !this.selectedTopic) return;
    let content = this.originalContent;
    const chapterAnnotations = this.annotations
      .filter(a => a.chapterId === this.selectedTopic.id);

    chapterAnnotations.forEach(a => {
      if (a.type === 'highlight') {
        const color = a.color || 'yellow';
        content = content.replace(a.text, `<mark style="background:${color}">${a.text}</mark>`
        );
      }
      if (a.type === 'underline') {
        content = content.replace(a.text,`<span style="text-decoration:underline">${a.text}</span>`);
      }
    });
    this.contentArea.nativeElement.innerHTML = content;
  }

// dictionary lookup for selected text
  lookupDictionary() {
    const selection = window.getSelection()?.toString();
    if (!selection) return;
    const word = selection.split(" ")[0];
    window.open(`https://www.google.com/search?q=${word}+meaning`);
  }
 
// auto-save notes 
autoSaveNotes() {
  if (!this.selectedTopic) return;
  localStorage.setItem(
    `notes_${this.selectedTopic.id}`,
    this.notesText
  );
    this.saveStatus = 'Saved ✓';
}
@ViewChild('pdfContent') pdfContent!: ElementRef;

// export content as PDF
exportMaterial() {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 7;
  let y = 20;
  // TITLE
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(this.moduleName || "Module", margin, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text(this.selectedTopic?.name || "Topic", margin, y);
  y += 10;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth + margin, y);
  y += 10;

  // GET CONTENT TEXT
  const contentText = this.contentArea.nativeElement.innerText;
  pdf.setFontSize(12);
  const contentLines = pdf.splitTextToSize(contentText, pageWidth);
  contentLines.forEach((line: string) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
   pdf.text(line, margin, y);
    y += lineHeight;
  });
  // NOTES TITLE
  if (y > pageHeight - 30) {
    pdf.addPage();
    y = 20;
  }
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Notes", margin, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  const notesLines = pdf.splitTextToSize(
    this.notesText || "No notes added",
    pageWidth
  );

  notesLines.forEach((line: string) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  });
  pdf.save(`${this.selectedTopic?.name || "material"}.pdf`);
}
 goBack() {
    if (window.history.length > 1) {
      this.location.back();  // Go back to the previous page
    } else {
      this.router.navigate(['/home']); // fallback route, later we have to change this route
    }
  }
}
