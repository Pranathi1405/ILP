/* author:Pranathi 
description: it is a layout component that structures the student panel with side bar*/
import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { HeaderComponent } from '../../../../shared/components/header/header';
import { SocketService } from '../../../../core/services/notifications/socket.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { filter } from 'rxjs';
@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  templateUrl: './student-layout.html',
  styleUrl: './student-layout.css',
})
export class StudentLayoutComponent {
  private socketService = inject(SocketService);
  removePadding = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      let current = this.route.firstChild;

      while (current?.firstChild) {
        current = current.firstChild;
      }

      this.removePadding = current?.snapshot.data?.['removePadding'] ?? false;
    });
  }

  ngOnInit(): void {
    this.socketService.init();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }
}
