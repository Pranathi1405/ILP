import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-termsandconditions',
  imports: [],
  templateUrl: './termsandconditions.html',
  styleUrl: './termsandconditions.css',
})
export class Termsandconditions {
  showterms=true
   @Output() close = new EventEmitter<boolean>();

  closeTerms(){
    this.close.emit(false);
  }

  acceptTerms(){
    this.close.emit(true);
  }

}
