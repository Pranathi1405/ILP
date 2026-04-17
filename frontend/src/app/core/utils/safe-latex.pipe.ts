// ============================================================
// File path: src/app/core/pipes/safe-latex.pipe.ts
//
// SETUP (run once):
//   npm install katex
//   npm install --save-dev @types/katex
//
// Add to angular.json → styles:
//   "node_modules/katex/dist/katex.min.css"
//
// Usage in any standalone component:
//   imports: [SafeLatexPipe]
//   <span [innerHTML]="text | safeLatex"></span>
//
// Behaviour:
//   "plain text"           → returned unchanged
//   "value is $x^2 + 1$"  → inline KaTeX rendered
//   "$$\int_0^1 x\,dx$$"  → display (block) KaTeX rendered
//   Bad LaTeX              → shows [LaTeX Error: ...] in red
// ============================================================

import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

// Exported so it can be unit-tested or reused standalone
export function renderLatex(raw: string | null | undefined): string {
  if (!raw) return '';

  let text = raw;

  // Step 1: Replace display math $$...$$ and \[...\] first
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (e: any) {
      return `<span class="latex-error">[LaTeX Error: ${e?.message ?? ''}]</span>`;
    }
  });

  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (e: any) {
      return `<span class="latex-error">[LaTeX Error: ${e?.message ?? ''}]</span>`;
    }
  });

  // Step 2: Replace inline math $...$ and \(...\)
  text = text.replace(
    /(?<!\$)\$(?!\$)((?:[^$\n\\]|\\[\s\S])+?)\$(?!\$)/g,
    (_match, math: string) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          strict: 'ignore',
        });
      } catch (e: any) {
        return `<span class="latex-error">[LaTeX Error: ${e?.message ?? ''}]</span>`;
      }
    },
  );

  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch (e: any) {
      return `<span class="latex-error">[LaTeX Error: ${e?.message ?? ''}]</span>`;
    }
  });

  return text;
}

@Pipe({
  name: 'safeLatex',
  standalone: true,
  pure: true,
})
export class SafeLatexPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    const html = renderLatex(value);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
