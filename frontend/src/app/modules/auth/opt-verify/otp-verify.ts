import { Component, ElementRef, QueryList, ViewChildren, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './otp-verify.html',
  styleUrl: './otp-verify.css'
})
export class OtpVerifyComponent implements OnInit, OnDestroy {

  user_id!: string;
  email!: string;
  timer: number = 60;
  canresend: boolean = false;
  interval: any;
  purpose: string = 'login';
  otpform!: FormGroup;
  formLoaded: boolean = false;

  @ViewChildren('otpInput') otpInput!: QueryList<ElementRef>;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private authservice: AuthService
  ) {}

  ngOnInit() {
    const state = history.state;

    this.user_id = state?.user_id;
    this.email = state?.email;
    this.purpose = state?.purpose || 'login';

    this.otpform = this.fb.group({
      otp1: ['', Validators.required],
      otp2: ['', Validators.required],
      otp3: ['', Validators.required],
      otp4: ['', Validators.required],
      otp5: ['', Validators.required],
      otp6: ['', Validators.required]
    });

    this.formLoaded = true;
    this.startTimer();
  }

  startTimer() {
    this.timer = 60;
    this.canresend = false;

    if (this.interval) clearInterval(this.interval);

    this.interval = setInterval(() => {
      this.timer--;
      this.cd.detectChanges();

      if (this.timer <= 0) {
        clearInterval(this.interval);
        this.canresend = true;
        this.cd.detectChanges();
      }
    }, 1000);
  }

  resendcode() {
    if (!this.canresend) return;

    const data = {
      user_id: this.user_id,
      email: this.email,
      purpose: this.purpose
    };

    this.authservice.resendotp(data).subscribe({
      next: (res: any) => {
        this.toastr.success('OTP resent successfully');
        this.startTimer();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to resend OTP');
      }
    });
  }

  verifyOtp() {
    if (this.otpform.invalid) {
      this.toastr.warning('Enter complete OTP');
      return;
    }

    const enteredOtp = Number(Object.values(this.otpform.value).join(''));

    const data = {
      user_id: this.user_id,
      email: this.email,
      otp: enteredOtp
    };

    const apiCall = this.purpose === 'login'
      ? this.authservice.loginverifyotp(data)
      : this.authservice.verifyotp(data);

    apiCall.subscribe({
      next: (res: any) => {
        this.authservice.navigateByRole(res?.user?.userType);
        this.toastr.success(
          this.purpose === 'login' ? 'Login successful' : 'Email verified successfully'
        );
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Invalid or expired OTP');
      }
    });
  }

  moveNext(event: any, index: number) {
    const input = event.target;
    input.value = input.value.replace(/[^0-9]/g, '');

    if (input.value.length === 1 && index < 5) {
      this.otpInput.toArray()[index + 1].nativeElement.focus();
    }
  }

  movePrevious(event: any, index: number) {
    const input = event.target;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      this.otpInput.toArray()[index - 1].nativeElement.focus();
    }
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}