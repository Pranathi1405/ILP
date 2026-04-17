import { Component, OnInit } from '@angular/core';
import { ParentDashboardService } from '../../../../core/services/parent/parent-dashboard.service';
import { ParentDashboardModel } from '../../../../core/services/parent/parent-dashboard.data';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  dashboardData!: ParentDashboardModel;

  constructor(private parentService: ParentDashboardService) {}

  ngOnInit(): void {
    this.parentService.getDashboardData().subscribe((res) => {
      this.dashboardData = res;
    });
  }
}
