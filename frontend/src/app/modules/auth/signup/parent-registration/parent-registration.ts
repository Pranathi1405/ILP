/**
 * AUTHOR: Saiteja Jujjavarapu
 * src/app/modules/parent/parent-registration/parent-registration.ts – Parent Registration
 * =======================================================================================
 * Component responsible for registering new parent users.
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
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { Termsandconditions } from '../termsandconditions/termsandconditions';

@Component({
  selector: 'app-parent-registration',
  imports: [ReactiveFormsModule,RouterLink,Termsandconditions],
  templateUrl: './parent-registration.html',
  styleUrl: './parent-registration.css'
})
export class ParentRegistrationComponent {
    selectedrole:string='parent'
    signupform!:FormGroup
    constructor(private fb:FormBuilder,private toastr:ToastrService,private router:Router,private authservice:AuthService){}
    ngOnInit(){
      this.signupform=this.fb.group({
        firstname:['',Validators.required],
        lastname:['',Validators.required],
        email:['',Validators.required],
        phone:['',Validators.required],
        password:['',Validators.required],
        confirmpassword:['',Validators.required],
        child_link_code: ['', Validators.required],
        date_of_birth: [''],
        gender: [''],
        address: [''],
        city: [''],
        state: [''],
        country: [''],
        postalcode: [''],
        occupation: [''],
        relationship:[''],
        terms:[false]
      },{
         validators: this.passwordmatchvalidator
      });
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
    passwordmatchvalidator(control:AbstractControl){
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
    onSubmit(){
      if(this.signupform.invalid){
        this.signupform.markAllAsTouched();
        this.toastr.warning("please fill the required fields");
        return
      }
      const requestbody = {
      email: this.signupform.value.email,
      password: this.signupform.value.password,
      user_type: 'parent',
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
      occupation:this.signupform.value.occupation,
      child_link_code:this.signupform.value.child_link_code,
      relationship:this.signupform.value.relationship
    };
     this.authservice.sendSignupOtp(requestbody).subscribe({
      next:(res:any)=>{
        const user_id = res.user_id;
        console.log(user_id)
        if (!user_id) {
          this.toastr.error('Signup failed: user_id missing');
          return;
        }

        this.toastr.success(res.message);
        this.router.navigate(['/otp-verify'], {
          state: { user_id, currentRole: this.selectedrole,email:requestbody.email,purpose:'registration'}
        });
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err.error?.message || 'Signup failed');
      }
     });
    }
}
