import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  effect,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DoubtService } from '../../../../core/services/doubts/doubt.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

@Component({
  selector: 'app-doubt-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './doubt-chat.html',
  host: {
    class: 'flex flex-col h-full min-h-0',
  },
})
export class DoubtChat {
  doubtService = inject(DoubtService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  replyText = signal('');
  attachedFiles = signal<File[]>([]);
  fileError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const detail = this.doubtService.doubtDetail();
      const doubtId = detail?.doubtId;
      if (!doubtId) return;

      queueMicrotask(() => this.scrollToBottom());
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.doubtService.activeDoubt()) return;
    this.doubtService.activeDoubt.set(null);
    this.doubtService.doubtDetail.set(null);
  }

  // ── File handling ─────────────────────────────────────────────────────────
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = ''; // reset so same file can be re-selected
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private addFiles(incoming: File[]): void {
    this.fileError.set(null);
    const current = this.attachedFiles();

    const invalid = incoming.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      this.fileError.set('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.');
      return;
    }

    const tooBig = incoming.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooBig) {
      this.fileError.set(`Each file must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    const merged = [...current, ...incoming];
    if (merged.length > MAX_FILES) {
      this.fileError.set(`You can attach up to ${MAX_FILES} files per reply.`);
      return;
    }

    this.attachedFiles.set(merged);
  }

  removeFile(index: number): void {
    this.attachedFiles.update((files) => files.filter((_, i) => i !== index));
    this.fileError.set(null);
  }

  fileIcon(file: File): 'pdf' | 'image' {
    return file.type === 'application/pdf' ? 'pdf' : 'image';
  }

  fileSizeLabel(file: File): string {
    const kb = file.size / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  // ── Send reply ────────────────────────────────────────────────────────────
  onSend(): void {
    const text = this.replyText().trim();
    const doubt = this.doubtService.activeDoubt();
    if (
      (!text && this.attachedFiles().length === 0) ||
      !doubt ||
      this.doubtService.isSendingReply()
    )
      return;

    this.doubtService.sendReply(doubt.doubt_id, text, this.attachedFiles()).subscribe({
      next: () => {
        this.replyText.set('');
        this.attachedFiles.set([]);
        this.fileError.set(null);
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // Deselect the active doubt — shows "select a doubt" empty state
      this.doubtService.activeDoubt.set(null);
      this.doubtService.doubtDetail.set(null);
    }
  }

  isOwnReply(responderType: string): boolean {
    return responderType === 'teacher';
  }

  studentName = computed(() => {
    const detail = this.doubtService.doubtDetail();
    if (!detail) return null;
    const name = detail.student.name;
    return name ?? null;
  });

  // course_name > subject_name breadcrumb from active doubt
  breadcrumb = computed(() => {
    const d = this.doubtService.activeDoubt();
    if (!d) return null;
    return `${d.course_name} > ${d.subject_name}`;
  });

  canSend = computed(
    () =>
      (this.replyText().trim().length > 0 || this.attachedFiles().length > 0) &&
      !this.doubtService.isSendingReply(),
  );
}
