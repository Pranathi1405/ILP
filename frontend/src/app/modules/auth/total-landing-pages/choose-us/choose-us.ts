import { NgClass } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-choose-us',
  imports: [NgClass],
  templateUrl: './choose-us.html',
  styleUrl: './choose-us.css',
})
export class ChooseUsComponent {
    features = [
    {
      icon: '🎥',
      title: 'Interactive Live Classes',
      description: 'Join live sessions with expert tutors, ask questions in real-time, and learn alongside peers.',
      bg: 'bg-gradient-to-br from-blue-100 to-blue-200'
    },
    {
      icon: '👨‍🏫',
      title: 'Expert Mentors',
      description: 'Learn from verified industry professionals and experienced educators with proven track records.',
      bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200'
    },
    {
      icon: '📈',
      title: 'Progress Tracking',
      description: 'Monitor your improvement with detailed analytics, performance insights, and milestone tracking.',
      bg: 'bg-gradient-to-br from-orange-100 to-orange-200'
    },
  ];
}
