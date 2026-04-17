import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { HeaderComponent } from '../../../../shared/components/header/header';
import { ToastComponent } from "../../../../shared/components/toast/toast.component";
import { SocketService } from '../../../../core/services/notifications/socket.service';
import { filter } from 'rxjs';

@Component({
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  standalone: true,
  templateUrl: './teacher-layout.html',
  styleUrl: './teacher-layout.css',
})
export class TeacherLayoutComponent {
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
