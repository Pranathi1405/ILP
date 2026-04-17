import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCourseManagement } from './admin-course-management';

describe('AdminCourseManagement', () => {
  let component: AdminCourseManagement;
  let fixture: ComponentFixture<AdminCourseManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCourseManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCourseManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});