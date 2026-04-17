import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-signup-selection',
  imports: [NgClass, RouterLink],
  templateUrl: './signup-selection.html',
  styleUrl: './signup-selection.css',
})
export class SignupSelection {
    selectedRole: string = '';

  constructor(private router: Router,private toastr:ToastrService) {}

  selectRole(role: string) {
    this.selectedRole = role;
  }
  continue(){
    if(!this.selectedRole){
        this.toastr.warning("please select role first");
        return;
    }
    this.router.navigate([`signup/${this.selectedRole}`])
  }
  login(){
    // if(this.selectedRole){
    //   this.toastr.warning("please select role first");
    //   return;
    // }
    this.router.navigate([`/login/${this.selectedRole}`])
  }
}
