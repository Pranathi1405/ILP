/**
 * AUTHOR: Saiteja Jujjavarapu
 * src/app/modules/auth/forgot-password/forgot-password.ts – Forgot Password
 * =======================================================================================
 * Component responsible for initiating the password recovery workflow for users.
 *
 * Responsibilities:
 * 1. Initialize and validate the email input form for password recovery.
 * 2. Send forgot password request to AuthService to generate and send a reset OTP or link.
 * 3. Display toastr messages for success, warnings, and errors.
 * 4. Navigate users to OTP verification or reset password page as required.
 * 5. Handle input validation and prevent submission of invalid data.
 *
 * Pattern: Form initialization → form submission → AuthService call → feedback → navigation → error handling.
 */
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink,ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
    selectedRole!:string
    forgotform!:FormGroup
    role:string=''
    constructor(private fb:FormBuilder,private route:ActivatedRoute,private authservice:AuthService,private toastr:ToastrService){}
    ngOnInit(){
      this.forgotform=this.fb.group({
        email:['',Validators.required]  
      });
      this.route.paramMap.subscribe(params=>{
        const role=params.get('role');
        if(role){
          this.selectedRole=role;
        }
      })
    }
    Onsubmit(){
      const request={
        email:this.forgotform.value.email,
        role:this.selectedRole
      }
      console.log(request)
      this.authservice.resetlink(request).subscribe({
        next: (res: any) => {
        this.toastr.success(res.message);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || "Failed to send reset link");
      }
      })
    }
}
