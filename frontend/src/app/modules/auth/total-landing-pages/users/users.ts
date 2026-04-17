import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
interface Testimonial {
  text:string;
  name:string;
  role:string;
  avatar:string
}
@Component({
  selector: 'app-users',
  imports: [CommonModule,FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent {
    email='';
    activeIndex = 0;
    testimonials: Testimonial[] = [
    {
      text: 'The 24/7 AI doubt solving feature is a lifesaver. I can get my questions answered instantly, anytime. The quality of live classes is unmatched!',
      name: 'Priya Sharma',
      role: 'JEE Aspirant',
      avatar: 'https://i.pravatar.cc/48?img=47'
    },
    {
      text: 'eGRADTutor helped me crack NEET with its structured courses and incredible faculty. The doubt-solving sessions are a game changer!',
      name: 'Rahul Verma',
      role: 'NEET Aspirant',
      avatar: 'https://i.pravatar.cc/48?img=12'
    },
    {
      text: 'The interactive learning tools and live classes keep me engaged. I have seen a massive improvement in my scores since joining.',
      name: 'Anjali Nair',
      role: 'Class 12 Student',
      avatar: 'https://i.pravatar.cc/48?img=45'
    }
  ];

  prev(): void {
    this.activeIndex =
      (this.activeIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  next(): void {
    this.activeIndex = (this.activeIndex + 1) % this.testimonials.length;
  }

  goTo(index: number): void {
    this.activeIndex = index;
  }
  register(){
    if(this.email.trim()) {
      alert(`Registered successfully with: ${this.email}`);
      this.email = '';
    }
  }
}
