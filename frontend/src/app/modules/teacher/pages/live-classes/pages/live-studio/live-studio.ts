// Author: Poojitha
// Live Studio Page Main Component
import { Component } from '@angular/core';
import { StatsCards } from '../../components/stats-cards/stats-cards';
import { SessionList } from '../../components/session-list/session-list';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-live-studio',
  imports: [StatsCards, SessionList, RouterModule],
  templateUrl: './live-studio.html',
  styleUrl: './live-studio.css',
})
export class LiveStudio {
    constructor(private liveService: LiveClassService) {}

 
}
