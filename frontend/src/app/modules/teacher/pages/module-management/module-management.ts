import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';  // 👈 ADD RouterModule

@Component({
  selector: 'app-module-management',
  standalone: true,
  imports: [CommonModule, RouterModule],   // 👈 ADD HERE
  templateUrl: './module-management.html'
})
export class ModuleManagementComponent {

  constructor(private router: Router) {}

  goToAddModule() {
    this.router.navigate(['/teacher/module-editor']);
  }

}