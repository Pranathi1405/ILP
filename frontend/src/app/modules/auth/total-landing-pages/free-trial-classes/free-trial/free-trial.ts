import { NgClass } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-free-trial',
  imports: [NgClass],
  templateUrl: './free-trial.html',
  styleUrl: './free-trial.css',
})
export class FreeTrialComponent {
  courses = [
  {
    name: 'Advanced Physics Mastery',
    author: 'By Ronald Richards',
    rating: '(2,200)',
    hours: '22h',
    lectures: '95 Lectures',
    price: '₹120',
    icon:'Advanced_Physics.png',
  },
  {
    name: 'Organic Chemistry Deep Dive',
    author: 'By Sarah Jenkins',
    rating: '(980)',
    hours: '18h',
    lectures: '101 Lectures',
    price: '₹120',
    icon: 'Organic_Chemistry.png',
  },
  {
    name: 'Calculus & Geometry',
    author: 'By Michael Chen',
    rating: '(2,150)',
    hours: '30h',
    lectures: '200 Lectures',
    price: '₹120',
    icon: 'Calculus.png',
  },
  {
    name: 'Advanced Mathematics',
    author: 'By Emily Watson',
    rating: '(200)',
    hours: '12h',
    lectures: '85 Lectures',
    price: '₹120',
    icon: 'Data_Science.png',
  },
  {
    name: 'Advanced Mathematics',
    author: 'By Emily Watson',
    rating: '(200)',
    hours: '12h',
    lectures: '85 Lectures',
    price: '₹120',
    icon: '📊',
    bg: 'bg-gradient-to-br from-cyan-900 to-sky-600'
  }
];

offset = 0;
perPage = 4;

get visibleCourses() {
  return this.courses.slice(this.offset, this.offset + this.perPage);
}

next() {
  if (this.offset + this.perPage < this.courses.length) {
    this.offset+=4;
  }
}

prev() {
  if (this.offset > 0) {
    this.offset-=4;
  }
}
}
