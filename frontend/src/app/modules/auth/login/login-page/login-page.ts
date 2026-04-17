/**
 * AUTHOR: Saiteja Jujjavarapu
 * src/app/modules/auth/login/login.ts – User Login
 * =======================================================================================
 * Component responsible for authenticating users and managing login workflow.
 */

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPageComponent {

  loginForm: FormGroup;
  showpassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

  }

  togglepassword() {
    this.showpassword = !this.showpassword;
  }

  onSubmit() {

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.toastr.warning("Please fill required fields");
      return;
    }

    const data = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    console.log("Login Payload:", data);

    this.authService.sendLoginOtp(data).subscribe({

      next: (response: any) => {

        console.log("OTP Response:", response);

        this.toastr.success("OTP sent successfully");
        
        this.router.navigate(['/otp-verify'], {
          state: {
            user_id: response.user_id,
            currentRole: response.role,
            email: data.email,
            purpose: 'login'
          }
        });

      },

      error: (err) => {
        console.log(err);
        this.toastr.error("Invalid email or password");
      }

    });

  }

}