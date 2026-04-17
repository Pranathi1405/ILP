/**
 * Admin Invitation — /admin-invitation?token=xxx
 *
 * Loads the token from query params, pre-fills email from the token (read-only),
 * and collects first_name, last_name, phone, password, confirm_password.
 * On success → redirects to /login.
 */
import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminInvitationService } from '../../../core/services/auth/admin-invitation.service';

// Custom validator: password === confirmPassword
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const cpw = group.get('confirm_password')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-admin-invitation',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-invitation.html',
})
export class AdminInvitation implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AdminInvitationService);

  token = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isSuccess = signal(false);

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = this.fb.group(
    {
      first_name: ['', [Validators.required, Validators.maxLength(50)]],
      last_name: ['', [Validators.required, Validators.maxLength(50)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-().]{7,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    // Token must be a 64-char hex string (crypto.randomBytes(32).toString('hex'))
    const isValidFormat = /^[a-f0-9]{64}$/.test(t);
    if (!isValidFormat) {
      this.errorMessage.set('Invalid or missing invitation link. Please request a new invitation.');
      return; // leave token as '' so form does not render
    }
    this.token.set(t);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  hasError(field: string, error: string): boolean {
    const c = this.form.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  get passwordMismatch(): boolean {
    return !!(this.form.hasError('passwordMismatch') && this.form.get('confirm_password')?.touched);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token()) return;

    const v = this.form.getRawValue();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.service
      .verifyInvitation({
        token: this.token(),
        first_name: v.first_name!,
        last_name: v.last_name!,
        phone: v.phone!,
        password: v.password!,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success) {
            this.isSuccess.set(true);
            setTimeout(() => this.router.navigate(['/login']), 3000);
          } else {
            this.errorMessage.set(res.message ?? 'Failed to create account.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        },
      });
  }
}
