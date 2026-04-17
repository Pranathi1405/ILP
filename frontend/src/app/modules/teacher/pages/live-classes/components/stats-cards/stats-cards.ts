// Author: Poojitha
// Live-Studio Page - Stats Cards Component

import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-stats-cards',
  imports: [CommonModule],
  templateUrl: './stats-cards.html',
  styleUrl: './stats-cards.css',
})
export class StatsCards implements OnInit {
  
  stats = signal<any[]>([]);

  constructor(private liveClassService: LiveClassService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.liveClassService.getDashboardStats().subscribe({
      next: (res) => {
        const data = res.data;

        this.stats.set([
          {
            title: 'Scheduled Today',
            value: data.scheduled_today,
            icon: '📅',
            valueColor: '',
          },
          {
            title: 'Avg Engagement',
            value: Number(data.avg_engagement).toFixed(2) + '%',
            icon: '👥',
            valueColor: 'text-blue-600',
          },
          {
            title: 'Total Broadcasts',
            value: data.total_broadcasts,
            icon: '⏱',
            valueColor: 'text-green-600',
          },
        ]);
      },
      error: (err) => {
        console.error('Error fetching stats:', err);
      }
    });
  }

}
