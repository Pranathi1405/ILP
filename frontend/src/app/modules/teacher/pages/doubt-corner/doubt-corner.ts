import { Component } from '@angular/core';
import { DoubtSidebar } from './doubt.sidebar';
import { DoubtChat } from './doubt.chat';

@Component({
  selector: 'app-doubt-corner',
  imports: [DoubtSidebar, DoubtChat],
  templateUrl: './doubt-corner.html',
  host: {
    class: 'block h-full min-h-0',
  },
})
export class DoubtCorner {}
