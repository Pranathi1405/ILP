/**
 * AUTHOR: Saiteja Jujjavarapu
 * src/app/modules/auth/reset-password/reset-password.ts – Reset Password
 * =======================================================================================
 * Component responsible for handling the password reset workflow for users.
 *
 * Responsibilities:
 * 1. Initialize and validate the reset password form with proper validators.
 * 2. Handle password and confirm password matching validation.
 * 3. Send reset password request to AuthService with the provided token.
 * 4. Display toastr messages for success, warnings, and errors.
 * 5. Navigate users appropriately after successful password reset.
 *
 * Pattern: Form initialization → form submission → AuthService call → validation → navigation → feedback via toastr.
 */
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent {

  forgotform!: FormGroup;
  token: string = '';
  selectedrole:string=''
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authservice: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.selectedrole = this.route.snapshot.paramMap.get('role') ||'';
    this.forgotform = this.fb.group({
      newpassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmpassword: ['', Validators.required]
    }, {
      validators: this.passwordmatchvalidator
    });

  }

  passwordmatchvalidator(control: AbstractControl) {

    const password = control.get('newpassword')?.value;
    const confirmPassword = control.get('confirmpassword');

    if (!confirmPassword) return null;

    if (password !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
    } else {
      confirmPassword.setErrors(null);
    }
    return null;
  }

  onSubmit() {

    if (this.forgotform.invalid) {
      this.toastr.warning("Please fill the form correctly");
      return;
    }
    const request = {
      token: this.token,
      password: this.forgotform.value.newpassword
    };
    console.log("Reset Request:", request);
    this.authservice.resetPassword(request).subscribe({
      next: (res: any) => {
        console.log(res)
        this.toastr.success("Password reset successfully");
        this.router.navigate(['/login']);
      },

      error: (err) => {
        this.toastr.error(err.error?.message || "Reset failed");
      }

    });

  }

}