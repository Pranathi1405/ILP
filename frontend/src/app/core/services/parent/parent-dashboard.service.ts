import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ParentDashboardModel, PARENT_DASHBOARD_DATA } from './parent-dashboard.data';

@Injectable({
  providedIn: 'root',
})
export class ParentDashboardService {
  getDashboardData(): Observable<any> {
    return of(PARENT_DASHBOARD_DATA);
  }
}
