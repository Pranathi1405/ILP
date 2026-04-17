import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { SocketService } from '../../../core/services/notifications/socket.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
@Component({
  selector: 'app-parent-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  templateUrl: './parent-layout.html',
  styleUrl: './parent-layout.css',
})
export class ParentLayout {
  private socketService = inject(SocketService);

  ngOnInit(): void {
    this.socketService.init();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }
}
