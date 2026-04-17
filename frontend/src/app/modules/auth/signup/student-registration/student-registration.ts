/**
 * AUTHOR: Saiteja Jujjavarapu
 * src/app/modules/student/student-registration/student-registration.ts – Student Registration
 * =======================================================================================
 * Component responsible for registering new student users.
 *
 * Responsibilities:
 * 1. Initialize and validate the registration form with proper validators.
 * 2. Handle password confirmation validation.
 * 3. Send signup request to AuthService and trigger OTP verification workflow.
 * 4. Navigate to OTP verification page with relevant state parameters on successful signup.
 * 5. Display toastr messages for success, warnings, and errors.
 *
 * Pattern: Form initialization → form submission → AuthService call → navigation → feedback via toastr.
 */
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { Termsandconditions } from "../termsandconditions/termsandconditions";

@Component({
  selector: 'app-student-registration',
  imports: [RouterLink, ReactiveFormsModule, Termsandconditions],
  templateUrl: './student-registration.html',
  styleUrl: './student-registration.css'
})
export class StudentRegistrationComponent {
  signupform!: FormGroup;
  selectedRole: string = 'student'; // default role
  studentlinkcode!:string;
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.signupform = this.fb.group(
      {
        firstname: ['', Validators.required],
        lastname: ['', Validators.required],
        email: ['', Validators.required],
        phone: ['', Validators.required],
        password: ['', Validators.required],
        confirmpassword: ['', Validators.required],
        date_of_birth: [''],
        gender: [''],
        address: [''],
        city: [''],
        state: [''],
        country: [''],
        postalcode: [''],
        grade_level: [''],
        section: [''],
        terms: [false]
      },
      { validators: this.passwordMatchValidator }
    );
  }
  showTerms = false;

  openTerms(){
    this.showTerms = true;
  }
  handleTerms(value:boolean){

    if(value){
      this.signupform.patchValue({terms:true});
    }

  this.showTerms = false;
}
  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
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
    if (!this.signupform.value.terms) {
      alert("Please accept Terms and Conditions to continue.");
      return;
    }
    
    if (this.signupform.invalid) {
      this.signupform.markAllAsTouched();
      this.toastr.warning('Please fill the required fields');
      return;
    }

    const requestbody = {
      email: this.signupform.value.email,
      password: this.signupform.value.password,
      user_type: 'student',
      first_name: this.signupform.value.firstname,
      last_name: this.signupform.value.lastname,
      phone: this.signupform.value.phone,
      date_of_birth: this.signupform.value.date_of_birth,
      gender: this.signupform.value.gender,
      address: this.signupform.value.address,
      city: this.signupform.value.city,
      state: this.signupform.value.state,
      country: this.signupform.value.country,
      postal_code: this.signupform.value.postalcode,
      grade_level: this.signupform.value.grade_level,
      section: this.signupform.value.section
    };

    this.authService.sendSignupOtp(requestbody).subscribe({
      next: (res: any) => {
        const user_id = res.user_id;
        console.log(user_id)
        if (!user_id) {
          this.toastr.error('Signup failed: user_id missing');
          return;
        }

        this.toastr.success(res.message);
        this.router.navigate(['/otp-verify'], {
          state: { user_id, currentRole: this.selectedRole,email:requestbody.email,purpose:'registration',studentlinkcode:res.parentLinkCode}
        });
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err.error?.message || 'Signup failed');
      }
    });
  }
}