import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CourseService } from '../../services/course';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-details.html',
})
export class CourseDetails implements OnInit {
  course: any;
  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Course ID:', id);

    if (id) {
      this.courseService.getCourseById(id).subscribe({
        next: (res: any) => {
          console.log('Course Details API:', res);
          this.course = res?.data || res;

          // Convert prices to number (API may return them as strings)
          this.course.price = Number(this.course.price);
          this.course.pro_price = Number(this.course.proPrice);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error:', err);
          this.errorMessage = 'Failed to load course details.';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }
}
