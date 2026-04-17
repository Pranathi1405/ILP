//Author: Poojitha

import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

@Pipe({
  name: 'renderLatexClean',
  standalone: true
})
export class RenderLatexCleanPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    try {
      let output = value;

      //  Remove unwanted <br> tags
      output = output.replace(/<br\s*\/?>/gi, '');

      //  Replace paragraph tags with spacing
      output = output.replace(/<\/p>/gi, '<br>');
      output = output.replace(/<p>/gi, '');

      //  Decode HTML entities (e.g., &amp; to &)
      output = output.replace(/&amp;/g, '&');

      // Replace multiple &nbsp; with single space
    output = output.replace(/(&nbsp;)+/g, ' ');


      //  Render block formulas $$...$$
      output = output.replace(/\$\$(.+?)\$\$/gs, (_, formula) => {
        return katex.renderToString(formula.trim(), {
          throwOnError: false,
          displayMode: true
        });
      });

      //  Render inline formulas $...$
      output = output.replace(/(?<!\$)\$(.+?)\$(?!\$)/g, (_, formula) => {
        return katex.renderToString(formula.trim(), {
          throwOnError: false,
          displayMode: false
        });
      });

      return this.sanitizer.bypassSecurityTrustHtml(output);

    } catch (error) {
      console.error('KaTeX render error:', error);
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
  }
}
